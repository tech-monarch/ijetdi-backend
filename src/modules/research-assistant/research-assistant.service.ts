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
