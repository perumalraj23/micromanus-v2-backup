export type ModelPreset = {
  id: string;
  label: string;
  provider: "openai" | "anthropic" | "kimi" | "custom";
  base_url: string;
  model: string;
  /** USD per 1M tokens. Best-effort public pricing for cost estimation only. */
  pricing: { input: number; output: number; cached_input: number };
};

/** Presets shown in Settings so users can pick a known provider and just paste a key. */
export const MODEL_PRESETS: ModelPreset[] = [
  {
    id: "gpt-4o-mini",
    label: "GPT-4o mini (OpenAI)",
    provider: "openai",
    base_url: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    pricing: { input: 0.15, output: 0.6, cached_input: 0.075 },
  },
  {
    id: "gpt-4o",
    label: "GPT-4o (OpenAI)",
    provider: "openai",
    base_url: "https://api.openai.com/v1",
    model: "gpt-4o",
    pricing: { input: 2.5, output: 10, cached_input: 1.25 },
  },
  {
    id: "claude-3-5-sonnet",
    label: "Claude 3.5 Sonnet (Anthropic, OpenAI-compatible)",
    provider: "anthropic",
    base_url: "https://api.anthropic.com/v1",
    model: "claude-3-5-sonnet-latest",
    pricing: { input: 3, output: 15, cached_input: 0.3 },
  },
  {
    id: "kimi-k2",
    label: "Kimi K2 (Moonshot AI)",
    provider: "kimi",
    base_url: "https://api.moonshot.ai/v1",
    model: "kimi-k2-0711-preview",
    pricing: { input: 0.6, output: 2.5, cached_input: 0.15 },
  },
  {
    id: "custom",
    label: "Custom OpenAI-compatible endpoint",
    provider: "custom",
    base_url: "",
    model: "",
    pricing: { input: 1, output: 3, cached_input: 0.5 },
  },
];

export function findPricing(model: string): ModelPreset["pricing"] {
  const preset = MODEL_PRESETS.find((p) => p.model === model);
  return preset?.pricing ?? { input: 1, output: 3, cached_input: 0.5 };
}

export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cachedTokens: number
) {
  const pricing = findPricing(model);
  const billableInput = Math.max(inputTokens - cachedTokens, 0);
  const cost =
    (billableInput / 1_000_000) * pricing.input +
    (cachedTokens / 1_000_000) * pricing.cached_input +
    (outputTokens / 1_000_000) * pricing.output;
  const cacheSavings = (cachedTokens / 1_000_000) * (pricing.input - pricing.cached_input);
  return { cost_usd: Number(cost.toFixed(6)), cache_savings_usd: Number(cacheSavings.toFixed(6)) };
}
