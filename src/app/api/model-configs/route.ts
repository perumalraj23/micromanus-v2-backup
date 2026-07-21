import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { encryptSecret, maskKey } from "@/lib/crypto";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("model_configs")
    .select("id, provider, label, base_url, model, is_default, api_key_encrypted, created_at")
    .order("created_at", { ascending: true });

  if (error) return Response.json({ error: "Could not load model configs." }, { status: 500 });

  const configs = (data ?? []).map((c) => ({
    id: c.id,
    provider: c.provider,
    label: c.label,
    base_url: c.base_url,
    model: c.model,
    is_default: c.is_default,
    masked_key: maskKey(safeDecryptPreview(c.api_key_encrypted)),
  }));

  return Response.json({ configs });
}

// Best-effort preview only (never returns the real key to the client in full).
function safeDecryptPreview(encrypted: string): string {
  try {
    return encrypted.length > 8 ? "sk-••••••••••••••••" : "••••••••";
  } catch {
    return "••••••••";
  }
}

const createSchema = z.object({
  provider: z.enum(["openai", "anthropic", "kimi", "custom"]),
  label: z.string().trim().min(1).max(60),
  base_url: z.string().trim().url("Please enter a valid endpoint URL."),
  model: z.string().trim().min(1).max(120),
  api_key: z.string().trim().min(8, "That API key looks too short."),
  is_default: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const { api_key, is_default, ...rest } = parsed.data;

  if (is_default) {
    await supabase.from("model_configs").update({ is_default: false }).eq("user_id", user.id);
  }

  const { data, error } = await supabase
    .from("model_configs")
    .insert({
      user_id: user.id,
      ...rest,
      api_key_encrypted: encryptSecret(api_key),
      is_default: is_default ?? false,
    })
    .select("id, provider, label, base_url, model, is_default")
    .single();

  if (error || !data) {
    return Response.json({ error: "Could not save that model configuration." }, { status: 500 });
  }

  return Response.json({ config: { ...data, masked_key: maskKey(api_key) } });
}
