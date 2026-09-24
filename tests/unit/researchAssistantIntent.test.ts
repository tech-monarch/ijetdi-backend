import { beforeEach, describe, expect, it, vi } from "vitest";

// Regression tests for the "hello runs a full research pipeline (including
// a live Tavily web search)" bug: every message used to be embedded,
// searched, and — whenever nothing matched — sent to Tavily as a literal
// web query, with no distinction between "hi" and a real research question.

const { prisma, env, embedText, generateAnswer, searchWeb, retrieveChunks, isInternallySufficient, buildJournalSources } =
  vi.hoisted(() => ({
    prisma: {
      aiConversation: { findUnique: vi.fn(), create: vi.fn(async () => ({ id: "conv-1" })) },
      aiMessage: { create: vi.fn(async () => ({})), findMany: vi.fn(async () => []) },
    },
    env: { GEMINI_API_KEY: "test-key" },
    embedText: vi.fn(async () => [0.1, 0.2]),
    generateAnswer: vi.fn(),
    searchWeb: vi.fn(async () => []),
    retrieveChunks: vi.fn(async () => []),
    isInternallySufficient: vi.fn(() => false),
    buildJournalSources: vi.fn(async () => []),
  }));

vi.mock("../../src/config/db.js", () => ({ prisma }));
vi.mock("../../src/config/env.js", () => ({ env }));
vi.mock("../../src/lib/gemini.js", () => ({ embedText, generateAnswer }));
vi.mock("../../src/lib/tavily.js", () => ({ searchWeb, publisherNameFromUrl: () => "example.com" }));
vi.mock("../../src/modules/research-assistant/citations.js", () => ({ buildJournalSources }));
vi.mock("../../src/modules/research-assistant/retrieval.service.js", () => ({
  retrieveChunks,
  isInternallySufficient,
  SIMILARITY_THRESHOLD: 0.75,
}));

const { handleQuery } = await import("../../src/modules/research-assistant/research-assistant.service.js");

beforeEach(() => {
  vi.clearAllMocks();
  env.GEMINI_API_KEY = "test-key";
  prisma.aiConversation.create.mockResolvedValue({ id: "conv-1" });
  isInternallySufficient.mockReturnValue(false);
});

describe("greetings and small talk never trigger retrieval or web search", () => {
  it.each(["hello", "Hi!", "hey there", "thanks", "thank you so much", "bye", "who are you?", "what can you do?"])(
    "%s is answered with a canned reply, no Gemini/retrieval/Tavily calls",
    async (question) => {
      const result = await handleQuery({ question, filters: {}, conversationId: null });
      expect(result.answer).toMatch(/research assistant/i);
      expect(embedText).not.toHaveBeenCalled();
      expect(retrieveChunks).not.toHaveBeenCalled();
      expect(searchWeb).not.toHaveBeenCalled();
      expect(generateAnswer).not.toHaveBeenCalled();
      expect(result.journalSources).toEqual([]);
      expect(result.externalSources).toEqual([]);
    },
  );

  it("still records both the user's and the assistant's smalltalk turn", async () => {
    await handleQuery({ question: "hello", filters: {}, conversationId: null });
    expect(prisma.aiMessage.create).toHaveBeenCalledTimes(2);
    expect(prisma.aiMessage.create).toHaveBeenNthCalledWith(1, expect.objectContaining({ data: expect.objectContaining({ role: "user" }) }));
    expect(prisma.aiMessage.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ data: expect.objectContaining({ role: "assistant" }) }));
  });
});

describe("real research questions still run the full pipeline", () => {
  it("a substantive question is classified as research and reaches retrieval", async () => {
    generateAnswer.mockResolvedValueOnce("research"); // classifier call
    retrieveChunks.mockResolvedValueOnce([{ chunkId: "c1", articleId: "a1", sectionName: "Intro", chunkText: "x", similarity: 0.9 }]);
    isInternallySufficient.mockReturnValueOnce(true);
    generateAnswer.mockResolvedValueOnce("Coral bleaching is caused by [J1]."); // real answer call
    const result = await handleQuery({ question: "What causes coral bleaching in reef ecosystems?", filters: {}, conversationId: null });
    expect(embedText).toHaveBeenCalledOnce();
    expect(retrieveChunks).toHaveBeenCalledOnce();
    expect(result.answer).toContain("Coral bleaching");
  });
});

describe("borderline messages: LLM classification decides, not just the heuristic", () => {
  it('a longer conversational message ("what topics does this journal cover overall these days?") classified as chat skips retrieval', async () => {
    generateAnswer.mockResolvedValueOnce("chat"); // classifier call
    generateAnswer.mockResolvedValueOnce("We mainly publish on embedded AI, telecom, and digital innovation."); // conversational reply
    const result = await handleQuery({
      question: "what topics does this journal cover overall these days?",
      filters: {},
      conversationId: null,
    });
    expect(embedText).not.toHaveBeenCalled();
    expect(retrieveChunks).not.toHaveBeenCalled();
    expect(searchWeb).not.toHaveBeenCalled();
    expect(generateAnswer).toHaveBeenCalledTimes(2); // classify + conversational reply
    expect(result.answer).toContain("embedded AI");
  });

  it("classifier failure fails OPEN to research, never silently drops a real question", async () => {
    generateAnswer.mockRejectedValueOnce(new Error("Gemini down"));
    retrieveChunks.mockResolvedValueOnce([]);
    isInternallySufficient.mockReturnValueOnce(false);
    searchWeb.mockResolvedValueOnce([]);
    const result = await handleQuery({ question: "explain the methodology used in the reef survey", filters: {}, conversationId: null });
    expect(embedText).toHaveBeenCalledOnce(); // reached the research pipeline despite the classifier throwing
    expect(result.answer).toBe("I don't have information about that in our publications.");
  });

  it("without a configured Gemini key, classification is skipped entirely (fails open, no wasted call)", async () => {
    env.GEMINI_API_KEY = "";
    retrieveChunks.mockResolvedValueOnce([]);
    isInternallySufficient.mockReturnValueOnce(false);
    searchWeb.mockResolvedValueOnce([]);
    await handleQuery({ question: "summarize recent findings on 5G latency", filters: {}, conversationId: null });
    // generateAnswer is still called once for the actual (empty-result) research path's... actually not:
    // with no internal results and no external results, CANNED_EMPTY_ANSWER short-circuits before generateAnswer.
    expect(embedText).toHaveBeenCalledOnce();
    expect(generateAnswer).not.toHaveBeenCalled(); // never even reached, incl. never reached for classification
  });
});
