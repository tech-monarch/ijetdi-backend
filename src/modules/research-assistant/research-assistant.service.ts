import { env } from "../../config/env.js";
import { prisma } from "../../config/db.js";
import { badRequest } from "../../lib/envelope.js";
import { embedText, generateAnswer, type GeminiChatTurn } from "../../lib/gemini.js";
import { publisherNameFromUrl, searchWeb, type TavilyResult } from "../../lib/tavily.js";
import { buildJournalSources, type JournalSource } from "./citations.js";
import { isInternallySufficient, retrieveChunks, SIMILARITY_THRESHOLD, type RetrievedChunk } from "./retrieval.service.js";
import type { researchAssistantQuerySchema } from "./research-assistant.schemas.js";
import type { z } from "zod";

export interface ExternalSource {
  id: string;
  isExternal: true;
  title: string;
  url: string;
  publisherName: string;
  retrievedVia: "tavily";
}

export interface QueryResult {
  answer: string;
  journalSources: JournalSource[];
  externalSources: ExternalSource[];
  emptyResults: boolean;
  conversationId: string;
}

const CANNED_EMPTY_ANSWER = "I don't have information about that in our publications.";

// ---------------------------------------------------------------------------
// Conversational intent detection.
//
// Before this, EVERY message — including "hello" — ran the full pipeline:
// embed it, search the vector index, and (whenever nothing matched closely
// enough) fire an actual Tavily web search for the literal text "hello".
// Wasteful, slow, and it produced nonsense "external sources" for plain
// chit-chat. Reported directly: "I can't be saying hello and it's making
// research on hello for me."
//
// Two layers, cheapest first, so the common case costs nothing extra:
//  1. A zero-cost heuristic that catches the overwhelming majority of
//     greetings/thanks/farewells/meta questions about the assistant itself.
//     Answered with a canned reply, no API call at all — this works even if
//     Gemini is misconfigured or down, which the strict research path does not.
//  2. For anything longer or ambiguous, ONE small classification call to
//     Gemini (not the real, expensive retrieval pipeline) decides whether
//     this needs research or just a friendly reply.
// If classification itself fails for any reason (including "Gemini isn't
// configured"), this fails OPEN to "research" — the only behavior that
// existed before — rather than silently declining to answer a real question.
// ---------------------------------------------------------------------------

const SMALLTALK_PATTERNS: RegExp[] = [
  /^(hi|hello|hey|yo|hiya|howdy)[.!, ]*$/,
  /^(hi|hello|hey),? there[.!, ]*$/,
  /^good (morning|afternoon|evening|day)[.!, ]*$/,
  /^(how'?s it going|how are you( doing)?|what'?s up|sup)[?.! ]*$/,
  /^(thanks|thank you|thx|ty|cheers)( so much| a lot)?[.!, ]*$/,
  /^(ok|okay|cool|got it|sounds good|great|nice one|alright)[.!, ]*$/,
  /^(bye|goodbye|see ya|see you|later|take care)[.!, ]*$/,
  /^(who are you|what are you|what can you do|what do you do|how do you work|help)[?.! ]*$/,
  /^(test|testing|123)[.!, ]*$/,
];

const SMALLTALK_REPLY =
  "Hi! I'm the research assistant for this journal — ask me about a topic, author, or finding " +
  "from our published articles and I'll look it up for you.";

/** Cheap, deterministic first pass — no network call. */
function isHeuristicSmallTalk(question: string): boolean {
  const q = question.trim().toLowerCase();
  if (!q || q.split(/\s+/).length > 6) return false; // never applies to longer messages
  return SMALLTALK_PATTERNS.some((re) => re.test(q));
}

/** Slower fallback for anything the heuristic didn't already resolve. */
async function classifyIntent(question: string): Promise<"research" | "chat"> {
  if (!env.GEMINI_API_KEY) return "research"; // can't classify without Gemini; same as before this feature existed
  try {
    const prompt = [
      'Classify the message below as exactly one word: "research" or "chat".',
      '"research" = a real question seeking information, findings, or a search of published academic articles.',
      '"chat" = a greeting, thanks, farewell, small talk, or a question about the assistant itself.',
      "Reply with ONLY that one word, nothing else.",
      `Message: "${question}"`,
    ].join("\n");
    const result = await generateAnswer("You are a strict, terse classifier.", [{ role: "user", text: prompt }]);
    return result.trim().toLowerCase().startsWith("chat") ? "chat" : "research";
  } catch {
    return "research"; // fail open — never silently drop a real question over a classifier hiccup
  }
}

/** Friendly, unconstrained reply for the "chat" branch — no sources, no citation rules. */
async function generateConversationalReply(question: string, conversationId: string): Promise<string> {
  try {
    const history = await loadConversationHistory(conversationId);
    const systemPrompt = [
      "You are the friendly AI Research Assistant for an academic journal platform.",
      "This message is casual conversation, not a research question — respond naturally and briefly.",
      "No citations, no source list. You may briefly mention you can look up published articles if that's relevant, but keep it short and warm.",
    ].join(" ");
    // history's last entry is this same message in its bare form (persisted
    // before this ran) — drop it, the raw question below stands in for it.
    return await generateAnswer(systemPrompt, [...history.slice(0, -1), { role: "user", text: question }]);
  } catch {
    return SMALLTALK_REPLY;
  }
}
// How many prior turns (user+assistant pairs) to pass back to Gemini for
// multi-turn context — small on purpose: this isn't a general chat
// assistant, and a long history dilutes the "answer only from the
// supplied context" instruction with increasingly large amounts of the
// model's own prior phrasing to imitate.
const HISTORY_TURNS = 3;

function buildSystemPrompt(): string {
  return [
    "You are the AI Research Assistant for an academic journal platform.",
    "You must answer ONLY using the numbered sources provided in the user's message below.",
    "Do not use any knowledge you have from outside those sources, even if you know the answer.",
    'If none of the provided sources actually answer the question, respond with exactly this sentence and nothing else: "I don\'t have information about that in our publications."',
    "When you make a factual claim, cite the source label it came from in square brackets immediately after the claim, e.g. [J1] or [E2].",
    "Only ever cite a label that is actually listed in the sources below — never invent a label, and never cite a source for a claim it doesn't actually support.",
    "Keep the answer concise and factual. Do not speculate beyond what the sources say.",
  ].join(" ");
}

function buildSourcesBlock(
  journalChunks: Array<{ label: string; chunk: RetrievedChunk }>,
  externalResults: Array<{ label: string; result: TavilyResult }>,
): string {
  const journalBlock = journalChunks
    .map(({ label, chunk }) => `[${label}] (${chunk.sectionName ?? "Article"}): ${chunk.chunkText}`)
    .join("\n\n");
  const externalBlock = externalResults
    .map(({ label, result }) => `[${label}] ${result.title}: ${result.content}`)
    .join("\n\n");
  const parts = [];
  if (journalBlock) parts.push(`Journal sources:\n${journalBlock}`);
  if (externalBlock) parts.push(`External sources:\n${externalBlock}`);
  return parts.join("\n\n");
}

/** Which [J#]/[E#] labels actually appear in the generated answer text. */
function extractCitedLabels(answer: string): Set<string> {
  const matches = answer.matchAll(/\[(J\d+|E\d+)\]/g);
  return new Set([...matches].map((m) => m[1]));
}

async function loadConversationHistory(conversationId: string): Promise<GeminiChatTurn[]> {
  const messages = await prisma.aiMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: HISTORY_TURNS * 2,
  });
  return messages
    .reverse()
    .map((m) => ({ role: m.role === "user" ? ("user" as const) : ("model" as const), text: m.content }));
}

async function resolveConversation(conversationId: string | null | undefined, question: string): Promise<string> {
  if (conversationId) {
    const existing = await prisma.aiConversation.findUnique({ where: { id: conversationId } });
    if (existing) return existing.id;
    // Unknown conversationId (e.g. stale client state) — start a fresh
    // conversation rather than erroring the whole request over it.
  }
  const title = question.length > 60 ? `${question.slice(0, 57)}...` : question;
  const created = await prisma.aiConversation.create({ data: { title } });
  return created.id;
}

export async function handleQuery(
  input: z.infer<typeof researchAssistantQuerySchema>,
): Promise<QueryResult> {
  const question = input.question.trim();
  if (!question) {
    throw badRequest("EMPTY_QUERY", "question must not be blank.");
  }

  const conversationId = await resolveConversation(input.conversationId, question);
  await prisma.aiMessage.create({
    data: { conversationId, role: "user", content: question, citedChunkIds: [] },
  });

  const heuristicChat = isHeuristicSmallTalk(question);
  if (heuristicChat || (await classifyIntent(question)) === "chat") {
    const answer = heuristicChat ? SMALLTALK_REPLY : await generateConversationalReply(question, conversationId);
    await prisma.aiMessage.create({
      data: { conversationId, role: "assistant", content: answer, citedChunkIds: [] },
    });
    return { answer, journalSources: [], externalSources: [], emptyResults: true, conversationId };
  }

  // 1. Embed the question with the SAME model used at ingestion.
  const queryEmbedding = await embedText(question);

  // 2 + 3. Retrieve internal chunks, apply filters, decide sufficiency.
  const retrieved = await retrieveChunks(queryEmbedding, input.filters);
  const sufficient = isInternallySufficient(retrieved);

  let journalSources: JournalSource[] = [];
  let externalSources: ExternalSource[] = [];
  let answer: string;
  let citedChunkIds: string[] = [];

  if (sufficient) {
    // Internal-first: strong matches only, no Tavily call at all.
    const strongChunks = retrieved.filter((c) => c.similarity >= SIMILARITY_THRESHOLD);
    const labeled = strongChunks.map((chunk, i) => ({ label: `J${i + 1}`, chunk }));
    const chunkIdsByArticle = new Map<string, string[]>();
    for (const { chunk } of labeled) {
      const existing = chunkIdsByArticle.get(chunk.articleId) ?? [];
      existing.push(chunk.chunkId);
      chunkIdsByArticle.set(chunk.articleId, existing);
    }
    journalSources = await buildJournalSources(chunkIdsByArticle);

    const history = conversationId ? await loadConversationHistory(conversationId) : [];
    const sourcesBlock = buildSourcesBlock(labeled, []);
    const userTurn = `Question: ${question}\n\n${sourcesBlock}`;
    // history's last entry is this same question in its bare form (it was
    // persisted before retrieval ran, above) — drop it and substitute the
    // source-annotated version so Gemini sees the sources exactly once.
    const generated = await generateAnswer(buildSystemPrompt(), [...history.slice(0, -1), { role: "user", text: userTurn }]);

    const citedLabels = extractCitedLabels(generated);
    const knownLabels = new Set(labeled.map((l) => l.label));
    const hasInvalidCitation = [...citedLabels].some((label) => !knownLabels.has(label));
    if (hasInvalidCitation) {
      // "No citation, no claim" (docs/AI_RESEARCH_ASSISTANT.md §4) — rather
      // than try to surgically edit a generated sentence around a label
      // that doesn't correspond to a real retrieved source (which risks
      // producing broken, half-edited prose), fall back to the safe
      // canned response. A stricter but simpler application of the rule.
      answer = CANNED_EMPTY_ANSWER;
      journalSources = [];
      citedChunkIds = [];
    } else {
      answer = generated;
      citedChunkIds = labeled.filter((l) => citedLabels.has(l.label)).map((l) => l.chunk.chunkId);
    }
  } else {
    // External fallback — only reached because internal results were
    // insufficient (§3d/§3e).
    const tavilyResults = await searchWeb(question);
    const labeledExternal = tavilyResults.map((result, i) => ({ label: `E${i + 1}`, result }));
    externalSources = labeledExternal.map(({ label, result }) => ({
      id: label,
      isExternal: true as const,
      title: result.title,
      url: result.url,
      publisherName: publisherNameFromUrl(result.url),
      retrievedVia: "tavily" as const,
    }));

    if (labeledExternal.length === 0) {
      // Nothing internal, nothing external — the documented empty path.
      answer = CANNED_EMPTY_ANSWER;
    } else {
      const history = conversationId ? await loadConversationHistory(conversationId) : [];
      const sourcesBlock = buildSourcesBlock([], labeledExternal);
      const userTurn = `Question: ${question}\n\n${sourcesBlock}`;
      // Same history.slice(0, -1) reasoning as the internal-sufficient
      // branch above — drop the bare-question duplicate, substitute the
      // source-annotated version.
      const generated = await generateAnswer(buildSystemPrompt(), [
        ...history.slice(0, -1),
        { role: "user", text: userTurn },
      ]);

      const citedLabels = extractCitedLabels(generated);
      const knownLabels = new Set(labeledExternal.map((l) => l.label));
      const hasInvalidCitation = [...citedLabels].some((label) => !knownLabels.has(label));
      answer = hasInvalidCitation ? CANNED_EMPTY_ANSWER : generated;
      if (hasInvalidCitation) externalSources = [];
    }
  }

  const emptyResults = journalSources.length === 0 && externalSources.length === 0;

  await prisma.aiMessage.create({
    data: { conversationId, role: "assistant", content: answer, citedChunkIds },
  });

  return { answer, journalSources, externalSources, emptyResults, conversationId };
}
