export type BraveSearchResult = {
  title: string;
  url: string;
  description: string;
  age?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls the Brave Search API. Requires BRAVE_SEARCH_API_KEY to be configured on the server.
 * Retries transient failures (network errors, 429, 5xx) up to 3 attempts with linear backoff
 * before throwing, so a single flaky upstream response doesn't fail the whole research step.
 * Throws a descriptive error if the key is missing or every attempt fails, so the agent loop
 * can surface a friendly message instead of a silent failure.
 */
export async function braveSearch(query: string, count = 5): Promise<BraveSearchResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    throw new Error("Brave Search is not configured on the server (missing BRAVE_SEARCH_API_KEY).");
  }

  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(Math.min(count, 10)));

  const maxAttempts = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": apiKey,
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        const transient = res.status === 429 || res.status >= 500;
        if (transient && attempt < maxAttempts) {
          await sleep(300 * attempt);
          continue;
        }
        throw new Error(`Brave Search request failed (${res.status})`);
      }

      const data = await res.json();
      const results: BraveSearchResult[] = (data?.web?.results ?? []).map(
        (r: { title?: string; url: string; description?: string; age?: string }) => ({
          title: r.title ?? r.url,
          url: r.url,
          description: r.description ?? "",
          age: r.age,
        })
      );

      return results.slice(0, count);
    } catch (err) {
      lastError = err as Error;
      // Network-level failures (timeout, DNS, etc.) are also worth retrying.
      if (attempt < maxAttempts) {
        await sleep(300 * attempt);
        continue;
      }
    }
  }

  throw lastError ?? new Error("Brave Search request failed after retries.");
}
