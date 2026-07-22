import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/crypto";
import { logger } from "@/lib/logger";

type TestResult = {
  success: boolean;
  latency_ms: number;
  tokens?: number;
  provider: string;
  model: string;
  error_type?: "auth" | "rate_limit" | "timeout" | "invalid_endpoint" | "unsupported_model" | "unknown";
  message: string;
};

/**
 * Sends a minimal "Say Hello" chat completion to the user's configured OpenAI-compatible
 * endpoint and reports back real latency + token usage, or a differentiated error type so the
 * UI can show specific guidance (bad key vs. unreachable endpoint vs. rate limit, etc.) instead
 * of one generic "Invalid API Key" message.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: config, error } = await admin
    .from("model_configs")
    .select("id, provider, label, base_url, model, api_key_encrypted")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !config) {
    return Response.json({ error: "Model configuration not found." }, { status: 404 });
  }

  const result = await testConnection({
    provider: config.provider,
    baseUrl: config.base_url,
    model: config.model,
    apiKey: decryptSecret(config.api_key_encrypted),
  });

  if (!result.success) {
    logger.warn("model_configs.test_connection_failed", {
      route: "/api/model-configs/[id]/test",
      configId: id,
      errorType: result.error_type,
    });
  }

  return Response.json(result);
}

async function testConnection(input: {
  provider: string;
  baseUrl: string;
  model: string;
  apiKey: string;
}): Promise<TestResult> {
  const startedAt = Date.now();
  try {
    const client = new OpenAI({ apiKey: input.apiKey, baseURL: input.baseUrl, timeout: 15_000 });
    const completion = await client.chat.completions.create({
      model: input.model,
      messages: [{ role: "user", content: "Say Hello" }],
      max_tokens: 16,
    });

    const latency_ms = Date.now() - startedAt;
    const tokens = completion.usage?.total_tokens ?? 0;

    return {
      success: true,
      latency_ms,
      tokens,
      provider: input.provider,
      model: input.model,
      message: "Connected successfully.",
    };
  } catch (err) {
    const latency_ms = Date.now() - startedAt;
    const { error_type, message } = classifyError(err);
    return { success: false, latency_ms, provider: input.provider, model: input.model, error_type, message };
  }
}

function classifyError(err: unknown): { error_type: TestResult["error_type"]; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();
  const status = (err as { status?: number })?.status;

  if (status === 401 || lower.includes("401") || lower.includes("invalid api key") || lower.includes("unauthorized")) {
    return {
      error_type: "auth",
      message: "Your API key was rejected. Verify it was copied correctly and that billing is enabled on your account.",
    };
  }
  if (status === 429 || lower.includes("429") || lower.includes("rate limit")) {
    return { error_type: "rate_limit", message: "The provider rate-limited this request. Wait a moment and try again." };
  }
  if (lower.includes("timeout") || lower.includes("timed out") || (err as { name?: string })?.name === "APIConnectionTimeoutError") {
    return { error_type: "timeout", message: "The endpoint didn't respond in time. Check the base URL and try again." };
  }
  if (status === 404 || lower.includes("404") || lower.includes("does not exist") || lower.includes("not found")) {
    return {
      error_type: "unsupported_model",
      message: "That model name wasn't recognized by this endpoint. Double-check the model field.",
    };
  }
  if (
    lower.includes("econnrefused") ||
    lower.includes("enotfound") ||
    lower.includes("network") ||
    lower.includes("fetch failed")
  ) {
    return { error_type: "invalid_endpoint", message: "Couldn't reach that endpoint. Check the base URL for typos." };
  }
  return { error_type: "unknown", message: "Something went wrong testing this connection. Please try again." };
}
