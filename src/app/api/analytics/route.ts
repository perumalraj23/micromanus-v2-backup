import { createClient } from "@/lib/supabase/server";
import type { UsageTotals } from "@/lib/types/app";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: profile }, { data: chats }, { data: usage }, { data: reports }] = await Promise.all([
    supabase.from("profiles").select("credits").eq("id", user.id).maybeSingle(),
    supabase.from("chats").select("id, title"),
    supabase
      .from("usage_events")
      .select("chat_id, model, input_tokens, output_tokens, cached_tokens, cost_usd, cache_savings_usd"),
    supabase.from("reports").select("id"),
  ]);

  const chatTitleById = new Map((chats ?? []).map((c) => [c.id, c.title]));

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
  };

  const modelMap = new Map<string, { cost_usd: number; input_tokens: number; output_tokens: number }>();
  const chatMap = new Map<string, number>();

  for (const row of usage ?? []) {
    totals.input_tokens += row.input_tokens;
    totals.output_tokens += row.output_tokens;
    totals.cached_tokens += row.cached_tokens;
    totals.total_cost_usd += Number(row.cost_usd);
    totals.cache_savings_usd += Number(row.cache_savings_usd);

    const m = modelMap.get(row.model) ?? { cost_usd: 0, input_tokens: 0, output_tokens: 0 };
    m.cost_usd += Number(row.cost_usd);
    m.input_tokens += row.input_tokens;
    m.output_tokens += row.output_tokens;
    modelMap.set(row.model, m);

    if (row.chat_id) {
      chatMap.set(row.chat_id, (chatMap.get(row.chat_id) ?? 0) + Number(row.cost_usd));
    }
  }

  totals.by_model = Array.from(modelMap.entries()).map(([model, v]) => ({ model, ...v }));
  totals.by_chat = Array.from(chatMap.entries()).map(([chat_id, cost_usd]) => ({
    chat_id,
    title: chatTitleById.get(chat_id) ?? "Untitled chat",
    cost_usd,
  }));

  totals.total_cost_usd = Number(totals.total_cost_usd.toFixed(6));
  totals.cache_savings_usd = Number(totals.cache_savings_usd.toFixed(6));

  return Response.json({ totals });
}
