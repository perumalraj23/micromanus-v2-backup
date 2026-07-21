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

export type ModelProvider = "openai" | "anthropic" | "kimi" | "custom";

export type ModelConfig = {
  id: string;
  provider: ModelProvider;
  label: string;
  base_url: string;
  model: string;
  is_default: boolean;
  masked_key: string;
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
};
