export type BraveSearchResult = {
  title: string;
  url: string;
  description: string;
  age?: string;
};

/**
 * Calls the Brave Search API. Requires BRAVE_SEARCH_API_KEY to be configured on the server.
 * Throws a descriptive error if the key is missing or the request fails so the agent loop
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

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": apiKey,
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
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
}
