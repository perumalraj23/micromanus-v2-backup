import { createClient } from "@/lib/supabase/server";

/**
 * Billing history + a lightweight billing dashboard summary for the current user.
 * Reads via the user-scoped client (RLS: "payments: read own" / "usage_events: read own"),
 * so this never needs the service-role admin client.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: payments }, { data: profile }, { data: usageEvents }] = await Promise.all([
    supabase
      .from("payments")
      .select("id, stripe_session_id, amount_usd, credits_added, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("profiles").select("credits").eq("id", user.id).maybeSingle(),
    supabase.from("usage_events").select("cost_usd").eq("user_id", user.id),
  ]);

  const totalPaymentsUsd = (payments ?? []).reduce((sum, p) => sum + Number(p.amount_usd ?? 0), 0);
  const totalSessions = (usageEvents ?? []).length;
  const totalCostUsd = (usageEvents ?? []).reduce((sum, e) => sum + Number(e.cost_usd ?? 0), 0);
  const averageCostUsd = totalSessions > 0 ? totalCostUsd / totalSessions : 0;

  return Response.json({
    payments: payments ?? [],
    summary: {
      currentBalance: profile?.credits ?? 0,
      totalPaymentsUsd,
      totalResearchSessions: totalSessions,
      averageCostUsd,
    },
  });
}
