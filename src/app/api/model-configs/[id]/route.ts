import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSecret, maskKey } from "@/lib/crypto";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("model_configs").delete().eq("id", id).eq("user_id", user.id);
  if (error) return Response.json({ error: "Could not remove that model configuration." }, { status: 500 });
  return Response.json({ success: true });
}

const updateSchema = z.object({
  set_default: z.boolean().optional(),
  provider: z.enum(["openai", "anthropic", "kimi", "google", "xai", "openrouter", "groq", "custom"]).optional(),
  label: z.string().trim().min(1).max(60).optional(),
  base_url: z.string().trim().url("Please enter a valid endpoint URL.").optional(),
  model: z.string().trim().min(1).max(120).optional(),
  api_key: z.string().trim().min(8, "That API key looks too short.").optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = updateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { set_default, api_key, ...fields } = parsed.data;

  const admin = createAdminClient();

  if (set_default) {
    await admin.from("model_configs").update({ is_default: false }).eq("user_id", user.id);
    const { error } = await admin
      .from("model_configs")
      .update({ is_default: true })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return Response.json({ error: "Could not update default model." }, { status: 500 });
  }

  const hasEditableFields = Object.keys(fields).length > 0 || api_key;
  if (hasEditableFields) {
    const update: Record<string, string> = { ...fields };
    if (api_key) update.api_key_encrypted = encryptSecret(api_key);

    const { data, error } = await admin
      .from("model_configs")
      .update(update)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, provider, label, base_url, model, is_default")
      .maybeSingle();

    if (error || !data) {
      return Response.json({ error: "Could not update that model configuration." }, { status: 500 });
    }

    return Response.json({ config: { ...data, masked_key: api_key ? maskKey(api_key) : undefined } });
  }

  return Response.json({ success: true });
}
