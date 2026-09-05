import { env } from "../config/env.js";
import { ApiError } from "./envelope.js";

/**
 * Thin wrapper around Tavily's search API, called only as the fallback
 * step (docs/AI_RESEARCH_ASSISTANT.md §3e) when internal journal results
 * are insufficient — never on every query.
 *
 * NOT verified against a real Tavily endpoint in the build/review
 * environment — outbound network access to api.tavily.com is blocked
 * there (see README.md).
 */

export class TavilyError extends ApiError {
  constructor(message: string) {
    super(503, "ASSISTANT_UNAVAILABLE", message);
  }
}

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
}

export async function searchWeb(query: string, maxResults = 4): Promise<TavilyResult[]> {
  if (!env.TAVILY_API_KEY) {
    // Not a hard failure — the assistant can still answer "I don't have
    // information about that in our publications" from an empty result
    // set. Only the caller decides whether that's acceptable.
    return [];
  }

  let res: Response;
  try {
    res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: env.TAVILY_API_KEY,
        query,
        max_results: maxResults,
        search_depth: "basic",
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    throw new TavilyError(`Failed to reach the Tavily search API: ${(err as Error).message}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new TavilyError(`Tavily search request failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const json = (await res.json()) as { results?: Array<{ title?: string; url?: string; content?: string }> };
  return (json.results ?? [])
    .filter((r) => r.url && r.title)
    .map((r) => ({ title: r.title as string, url: r.url as string, content: r.content ?? "" }));
}

/** Best-effort publisher/site name from a URL's hostname, for display alongside a Tavily result. */
export function publisherNameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "External source";
  }
}
