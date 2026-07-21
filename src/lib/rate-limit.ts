import { createAdminClient } from "@/lib/supabase/admin";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;

/**
 * Simple sliding-window rate limiter backed by Postgres. Good enough for a single-region
 * serverless deployment without adding extra infra (e.g. Redis). Fails open on DB errors
 * so a rate-limit outage never blocks legitimate users.
 */
export async function checkRateLimit(userId: string): Promise<{ allowed: boolean; retryAfterMs?: number }> {
  try {
    const supabase = createAdminClient();
    const since = new Date(Date.now() - WINDOW_MS).toISOString();

    const { count, error } = await supabase
      .from("api_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since);

    if (error) return { allowed: true };

    if ((count ?? 0) >= MAX_REQUESTS_PER_WINDOW) {
      return { allowed: false, retryAfterMs: WINDOW_MS };
    }

    await supabase.from("api_requests").insert({ user_id: userId });
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}
