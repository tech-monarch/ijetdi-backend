import { env } from "../config/env.js";
import { ApiError } from "./envelope.js";

/**
 * Thin wrapper around the Gemini REST API using Node's built-in fetch —
 * no @google/genai SDK dependency, to keep this backend's dependency
 * surface unchanged from what was already installed. Both the embedding
 * and generation model names are read from env (GEMINI_EMBEDDING_MODEL /
 * GEMINI_GENERATION_MODEL), never hardcoded, per the feature spec.
 *
 * NOT verified against a real Gemini endpoint in the build/review
 * environment — outbound network access to generativelanguage.googleapis.com
 * is blocked there (see README.md's "What was and wasn't verified live").
 * The request/response shapes below follow Gemini's documented REST API
 * (embedContent / generateContent) as of this writing.
 */

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export class GeminiError extends ApiError {
  constructor(message: string) {
    super(503, "ASSISTANT_UNAVAILABLE", message);
  }
}

function requireApiKey(): string {
  if (!env.GEMINI_API_KEY) {
    throw new GeminiError("The research assistant is not configured (missing GEMINI_API_KEY).");
  }
  return env.GEMINI_API_KEY;
}

/**
 * Embeds a single piece of text. Truncates the model's output to
 * GEMINI_EMBEDDING_DIMENSIONS via output_dimensionality — this MUST match
 * the pgvector column width (prisma/schema.prisma's ArticleChunk.embedding,
 * currently vector(768)) or every insert/query fails outright. Same
 * function is used at ingestion time and query time, so embeddings are
 * always comparable (mismatched embedding models between ingest/query
 * silently degrade retrieval quality — see docs/AI_RESEARCH_ASSISTANT.md
 * §3.2a).
 */
export async function embedText(text: string): Promise<number[]> {
  const apiKey = requireApiKey();
  const url = `${API_BASE}/models/${env.GEMINI_EMBEDDING_MODEL}:embedContent?key=${apiKey}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${env.GEMINI_EMBEDDING_MODEL}`,
        content: { parts: [{ text }] },
        outputDimensionality: env.GEMINI_EMBEDDING_DIMENSIONS,
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    throw new GeminiError(`Failed to reach the Gemini embedding API: ${(err as Error).message}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GeminiError(`Gemini embedding request failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const json = (await res.json()) as { embedding?: { values?: number[] } };
  const values = json.embedding?.values;
  if (!values || values.length === 0) {
    throw new GeminiError("Gemini embedding response had no vector values.");
  }
  if (values.length !== env.GEMINI_EMBEDDING_DIMENSIONS) {
    throw new GeminiError(
      `Gemini returned a ${values.length}-dimension embedding but GEMINI_EMBEDDING_DIMENSIONS is ${env.GEMINI_EMBEDDING_DIMENSIONS}. ` +
        "These must match the pgvector column width — check your model/dimension configuration.",
    );
  }
  return values;
}

export interface GeminiChatTurn {
  role: "user" | "model";
  text: string;
}

/**
 * Grounded generation call. Low temperature (0.1) is deliberate — this is
 * synthesis over supplied context, not creative writing, and the whole
 * point of the system prompt is to suppress the model's own general
 * knowledge in favor of only what was retrieved (see
 * docs/AI_RESEARCH_ASSISTANT.md §4, "Context-only answering").
 */
export async function generateAnswer(systemPrompt: string, history: GeminiChatTurn[]): Promise<string> {
  const apiKey = requireApiKey();
  const url = `${API_BASE}/models/${env.GEMINI_GENERATION_MODEL}:generateContent?key=${apiKey}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: history.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
        generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    throw new GeminiError(`Failed to reach the Gemini generation API: ${(err as Error).message}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GeminiError(`Gemini generation request failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
  if (!text) {
    throw new GeminiError("Gemini generation response had no text content.");
  }
  return text;
}
