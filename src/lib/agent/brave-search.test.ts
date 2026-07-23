import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { braveSearch } from "@/lib/agent/brave-search";

const originalFetch = global.fetch;
const originalApiKey = process.env.TAVILY_API_KEY;

beforeEach(() => {
  process.env.TAVILY_API_KEY = "test-key";
});

afterEach(() => {
  global.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.TAVILY_API_KEY;
  else process.env.TAVILY_API_KEY = originalApiKey;
  vi.restoreAllMocks();
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe("braveSearch — Tavily agent research tool failure handling", () => {
  it("throws a descriptive error when TAVILY_API_KEY is missing", async () => {
    delete process.env.TAVILY_API_KEY;
    await expect(braveSearch("test query")).rejects.toThrow(/not configured/);
  });

  it("returns results on a successful first attempt without retrying", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ results: [{ title: "A", url: "https://a.com", content: "d" }] })
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const results = await braveSearch("test query", 5);
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      title: "A",
      url: "https://a.com",
      description: "d",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.tavily.com/search",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          api_key: "test-key",
          query: "test query",
          search_depth: "advanced",
          max_results: 5,
          include_answer: false,
          include_raw_content: false,
        }),
      })
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries on a transient 429 (rate limit) and succeeds on a later attempt", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 429))
      .mockResolvedValueOnce(jsonResponse({ results: [{ title: "B", url: "https://b.com" }] }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const results = await braveSearch("test query");
    expect(results).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries on transient 5xx errors and eventually throws after exhausting attempts", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 503));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(braveSearch("test query")).rejects.toThrow(/Tavily Search request failed/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("eventually surfaces a persistent 401 (invalid API key) after exhausting retries, without hanging", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 401));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(braveSearch("test query")).rejects.toThrow(/Tavily Search request failed \(401\)/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("retries on network-level failures (e.g. Supabase-adjacent outage/DNS/timeout)", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce(jsonResponse({ results: [] }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const results = await braveSearch("test query");
    expect(results).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
