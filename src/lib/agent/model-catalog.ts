import type { ModelProvider } from "@/lib/types/app";

/**
 * Static, curated metadata about each supported provider/model family — badges, capability
 * tags, and general guidance. This is reference information (published provider capabilities),
 * not derived from any particular user's live data, and is clearly separate from the
 * per-user usage stats computed in the model-configs API route.
 */

export const PROVIDER_META: Record<ModelProvider, { label: string; color: string }> = {
  openai: { label: "OpenAI", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  anthropic: { label: "Anthropic", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  kimi: { label: "Moonshot AI", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  google: { label: "Google", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  xai: { label: "xAI", color: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300" },
  openrouter: { label: "OpenRouter", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
  groq: { label: "Groq", color: "bg-pink-500/10 text-pink-600 dark:text-pink-400" },
  custom: { label: "Custom", color: "bg-gray-500/10 text-gray-600 dark:text-gray-400" },
};

/** Capability tags shown on model cards, keyed by provider (best-effort, provider-family level). */
export const PROVIDER_CAPABILITIES: Record<ModelProvider, string[]> = {
  openai: ["Tool Calling", "Vision", "Function Calling", "Large Context"],
  anthropic: ["Large Context", "Reasoning", "Tool Calling"],
  google: ["Fast", "Cheap", "Large Context"],
  xai: ["Reasoning", "Fast", "Tool Calling"],
  openrouter: ["Model Variety", "Tool Calling"],
  groq: ["Fast", "Cheap"],
  kimi: ["Large Context", "Cheap"],
  custom: ["OpenAI-compatible"],
};

/** General "which model for which job" guidance, referencing preset ids from lib/pricing.ts. */
export const MODEL_RECOMMENDATIONS = {
  forResearch: { presetId: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet", reason: "Strongest reasoning over long context." },
  forSpeed: { presetId: "gemini-1.5-flash", label: "Gemini 1.5 Flash", reason: "Lowest published latency." },
  forCost: { presetId: "groq-llama-3.3", label: "Llama 3.3 70B (Groq)", reason: "Lowest cost per million tokens." },
  forBalanced: { presetId: "gpt-4o-mini", label: "GPT-4o mini", reason: "Good balance of cost, speed, and quality." },
} as const;
