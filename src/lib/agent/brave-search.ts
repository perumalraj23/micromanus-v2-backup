export type BraveSearchResult = {
  title: string;
  url: string;
  description: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls the Tavily Search API. Requires TAVILY_API_KEY to be configured on the server.
 * Retries transient failures (network errors, 429, 5xx) up to 3 attempts with linear backoff
 * before throwing, so a single flaky upstream response doesn't fail the whole research step.
 * Throws a descriptive error if the key is missing or every attempt fails, so the agent loop
 * can surface a friendly message instead of a silent failure.
 */
export async function braveSearch(query: string, count = 5): Promise<BraveSearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("Tavily Search is not configured on the server (missing TAVILY_API_KEY).");
  }

  const url = "https://api.tavily.com/search";
  const maxResults = Math.min(Math.max(count, 1), 10);

  const maxAttempts = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: "advanced",
          max_results: maxResults,
          include_answer: false,
          include_raw_content: false,
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        const transient = res.status === 429 || res.status >= 500;
        if (transient && attempt < maxAttempts) {
          await sleep(300 * attempt);
          continue;
        }
        throw new Error(`Tavily Search request failed (${res.status})`);
      }

      const data = await res.json();
      const results: BraveSearchResult[] = (data?.results ?? []).map(
        (r: { title?: string; url?: string; content?: string }) => ({
          title: r.title ?? r.url ?? "Untitled result",
          url: r.url ?? "",
          description: r.content ?? "",
        })
      );

      return results.filter((r) => r.url).slice(0, maxResults);
    } catch (err) {
      lastError = err as Error;
      // Network-level failures (timeout, DNS, etc.) are also worth retrying.
      if (attempt < maxAttempts) {
        await sleep(300 * attempt);
        continue;
      }
    }
  }

  throw lastError ?? new Error("Tavily Search request failed after retries.");
}
