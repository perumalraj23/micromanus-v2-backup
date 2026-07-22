export type AgentTimelineEvent = {
  time: string; // ISO timestamp
  label: string; // e.g. "Search Started"
  detail?: string;
};

export type AgentThought = {
  time: string;
  type: "thinking" | "tool_call" | "tool_result" | "final";
  text: string;
};

export type ReportSummary = {
  tldr: string;
  key_findings: string[];
  recommendations: string[];
  sources: { title: string; url: string }[];
};

export type ChatMessage = {
  id: string;
  chat_id: string;
  role: "user" | "assistant" | "system";
  content: string | null;
  thoughts: AgentThought[];
  timeline: AgentTimelineEvent[];
  report: ReportSummary | null;
  report_id?: string | null;
  model: string | null;
  provider: string | null;
  created_at: string;
};

export type ChatSummary = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type ModelProvider = "openai" | "anthropic" | "kimi" | "google" | "xai" | "openrouter" | "groq" | "custom";

export type ModelConfig = {
  id: string;
  provider: ModelProvider;
  label: string;
  base_url: string;
  model: string;
  is_default: boolean;
  masked_key: string;
  requests?: number;
  cost_usd?: number;
};

export type UsageTotals = {
  total_chats: number;
  reports_generated: number;
  credits_remaining: number;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  total_cost_usd: number;
  cache_savings_usd: number;
  by_model: { model: string; cost_usd: number; input_tokens: number; output_tokens: number }[];
  by_chat: { chat_id: string; title: string; cost_usd: number }[];
  /** Range applied to the time-scoped fields below (`daily`, `range_*`). Lifetime fields
   * above (credits_remaining, cache_savings_usd, etc.) are always all-time. */
  range: "today" | "7d" | "30d" | "90d" | "lifetime";
  daily: { date: string; chats: number; reports: number; cost_usd: number }[];
  model_insights: { model: string; requests: number; avg_cost_usd: number; total_cost_usd: number }[];
  credits_purchased: number;
  credits_consumed: number;
  founder_insights: {
    most_active_day: string | null;
    most_expensive_model: string | null;
    cheapest_model: string | null;
    average_report_words: number | null;
  };
  weekly: { chats: number; reports: number; cost_usd: number };
  streak_days: number;
  badges: { id: string; label: string; earned: boolean }[];
  cost_tip: string | null;
};

