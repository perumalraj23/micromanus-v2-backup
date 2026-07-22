import { createClient } from "@/lib/supabase/server";
import type { UsageTotals } from "@/lib/types/app";

const RANGE_DAYS: Record<string, number | null> = {
  today: 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
  lifetime: null,
};

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function dayKey(iso: string): string {
  return iso.slice(0, 10); // YYYY-MM-DD
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const rangeParam = searchParams.get("range") ?? "30d";
  const range = (rangeParam in RANGE_DAYS ? rangeParam : "30d") as UsageTotals["range"];
  const rangeDays = RANGE_DAYS[range];
  const rangeStart = rangeDays ? new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000) : null;

  const [{ data: profile }, { data: chats }, { data: usage }, { data: reports }, ledgerResult] = await Promise.all([
    supabase.from("profiles").select("credits").eq("id", user.id).maybeSingle(),
    supabase.from("chats").select("id, title, created_at"),
    supabase
      .from("usage_events")
      .select("chat_id, model, input_tokens, output_tokens, cached_tokens, cost_usd, cache_savings_usd, created_at"),
    supabase.from("reports").select("id, created_at, summary"),
    // credit_ledger is added by supabase/migrations/0002_security_and_credits.sql — if that
    // migration hasn't been applied yet, this query will error; treat that as "no ledger data"
    // rather than failing the whole analytics response.
    supabase.from("credit_ledger").select("delta, reason, created_at"),
  ]);
  const ledger = ledgerResult.error ? [] : (ledgerResult.data ?? []);

  const chatTitleById = new Map((chats ?? []).map((c) => [c.id, c.title]));
  const inRange = (iso: string) => !rangeStart || new Date(iso) >= rangeStart;

  const totals: UsageTotals = {
    total_chats: chats?.length ?? 0,
    reports_generated: reports?.length ?? 0,
    credits_remaining: profile?.credits ?? 0,
    input_tokens: 0,
    output_tokens: 0,
    cached_tokens: 0,
    total_cost_usd: 0,
    cache_savings_usd: 0,
    by_model: [],
    by_chat: [],
    range,
    daily: [],
    model_insights: [],
    credits_purchased: 0,
    credits_consumed: 0,
    founder_insights: {
      most_active_day: null,
      most_expensive_model: null,
      cheapest_model: null,
      average_report_words: null,
    },
    weekly: { chats: 0, reports: 0, cost_usd: 0 },
    streak_days: 0,
    badges: [],
    cost_tip: null,
  };

  const modelMap = new Map<string, { cost_usd: number; input_tokens: number; output_tokens: number; requests: number }>();
  const chatMap = new Map<string, number>();
  const dailyMap = new Map<string, { chats: number; reports: number; cost_usd: number }>();
  const weekdayCounts = new Map<string, number>();
  const activeDays = new Set<string>();

  for (const row of usage ?? []) {
    totals.input_tokens += row.input_tokens;
    totals.output_tokens += row.output_tokens;
    totals.cached_tokens += row.cached_tokens;
    totals.total_cost_usd += Number(row.cost_usd);
    totals.cache_savings_usd += Number(row.cache_savings_usd);

    const m = modelMap.get(row.model) ?? { cost_usd: 0, input_tokens: 0, output_tokens: 0, requests: 0 };
    m.cost_usd += Number(row.cost_usd);
    m.input_tokens += row.input_tokens;
    m.output_tokens += row.output_tokens;
    m.requests += 1;
    modelMap.set(row.model, m);

    if (row.chat_id) {
      chatMap.set(row.chat_id, (chatMap.get(row.chat_id) ?? 0) + Number(row.cost_usd));
    }

    const key = dayKey(row.created_at);
    activeDays.add(key);
    const weekday = WEEKDAY_NAMES[new Date(row.created_at).getDay()];
    weekdayCounts.set(weekday, (weekdayCounts.get(weekday) ?? 0) + 1);

    if (inRange(row.created_at)) {
      const d = dailyMap.get(key) ?? { chats: 0, reports: 0, cost_usd: 0 };
      d.cost_usd += Number(row.cost_usd);
      dailyMap.set(key, d);
    }
  }

  for (const chat of chats ?? []) {
    const key = dayKey(chat.created_at);
    if (inRange(chat.created_at)) {
      const d = dailyMap.get(key) ?? { chats: 0, reports: 0, cost_usd: 0 };
      d.chats += 1;
      dailyMap.set(key, d);
    }
  }

  const reportWordCounts: number[] = [];
  for (const report of reports ?? []) {
    if (inRange(report.created_at)) {
      const key = dayKey(report.created_at);
      const d = dailyMap.get(key) ?? { chats: 0, reports: 0, cost_usd: 0 };
      d.reports += 1;
      dailyMap.set(key, d);
    }
    const summary = report.summary as { tldr?: string; key_findings?: string[]; recommendations?: string[] } | null;
    if (summary) {
      const text = [summary.tldr, ...(summary.key_findings ?? []), ...(summary.recommendations ?? [])]
        .filter(Boolean)
        .join(" ");
      reportWordCounts.push(text.split(/\s+/).filter(Boolean).length);
    }
  }

  totals.by_model = Array.from(modelMap.entries()).map(([model, v]) => ({
    model,
    cost_usd: v.cost_usd,
    input_tokens: v.input_tokens,
    output_tokens: v.output_tokens,
  }));
  totals.by_chat = Array.from(chatMap.entries()).map(([chat_id, cost_usd]) => ({
    chat_id,
    title: chatTitleById.get(chat_id) ?? "Untitled chat",
    cost_usd,
  }));
  totals.model_insights = Array.from(modelMap.entries())
    .map(([model, m]) => ({
      model,
      requests: m.requests,
      avg_cost_usd: m.requests > 0 ? m.cost_usd / m.requests : 0,
      total_cost_usd: m.cost_usd,
    }))
    .sort((a, b) => b.requests - a.requests);

  totals.daily = Array.from(dailyMap.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  totals.total_cost_usd = Number(totals.total_cost_usd.toFixed(6));
  totals.cache_savings_usd = Number(totals.cache_savings_usd.toFixed(6));

  // Credits purchased/consumed — derived from the credit_ledger audit trail (see 03_REPORT.md).
  // Falls back to all-zero if the migration hasn't been applied yet (ledgerResult.error above).
  for (const entry of ledger) {
    if (entry.delta > 0) totals.credits_purchased += entry.delta;
    else totals.credits_consumed += Math.abs(entry.delta);
  }

  // Founder insights — every field is derived directly from real rows above, never invented.
  let mostActiveDay: string | null = null;
  let maxCount = 0;
  for (const [day, count] of weekdayCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostActiveDay = day;
    }
  }
  const insightsByAvgCost = [...totals.model_insights].sort((a, b) => b.avg_cost_usd - a.avg_cost_usd);
  totals.founder_insights = {
    most_active_day: mostActiveDay,
    most_expensive_model: insightsByAvgCost[0]?.model ?? null,
    cheapest_model: insightsByAvgCost[insightsByAvgCost.length - 1]?.model ?? null,
    average_report_words:
      reportWordCounts.length > 0
        ? Math.round(reportWordCounts.reduce((a, b) => a + b, 0) / reportWordCounts.length)
        : null,
  };

  // This week vs. everything else — used for the "Weekly Report" wow card.
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  totals.weekly = {
    chats: (chats ?? []).filter((c) => new Date(c.created_at) >= weekStart).length,
    reports: (reports ?? []).filter((r) => new Date(r.created_at) >= weekStart).length,
    cost_usd: Number(
      (usage ?? [])
        .filter((u) => new Date(u.created_at) >= weekStart)
        .reduce((sum, u) => sum + Number(u.cost_usd), 0)
        .toFixed(6)
    ),
  };

  // Research streak — consecutive days (ending today) with at least one usage event.
  let streak = 0;
  for (let i = 0; ; i++) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    if (activeDays.has(key)) streak += 1;
    else break;
  }
  totals.streak_days = streak;

  // Achievement badges — thresholds evaluated against real counts, not fabricated content.
  totals.badges = [
    { id: "first_report", label: "First Report", earned: totals.reports_generated >= 1 },
    { id: "ten_chats", label: "10 Chats", earned: totals.total_chats >= 10 },
    { id: "hundred_chats", label: "100 Chats", earned: totals.total_chats >= 100 },
    { id: "power_researcher", label: "Power Researcher ($1+ spent)", earned: totals.total_cost_usd >= 1 },
    { id: "week_streak", label: "7 Day Streak", earned: totals.streak_days >= 7 },
  ];

  // Cost optimization tip — only shown when there's a real, meaningful gap between models.
  if (insightsByAvgCost.length >= 2) {
    const priciest = insightsByAvgCost[0];
    const cheapest = insightsByAvgCost[insightsByAvgCost.length - 1];
    if (cheapest.avg_cost_usd > 0 && priciest.avg_cost_usd >= cheapest.avg_cost_usd * 2) {
      const ratio = (priciest.avg_cost_usd / cheapest.avg_cost_usd).toFixed(1);
      totals.cost_tip = `${priciest.model} is costing ~${ratio}x more per request than ${cheapest.model}. Consider switching simple queries to ${cheapest.model}.`;
    }
  }

  return Response.json({ totals });
}
