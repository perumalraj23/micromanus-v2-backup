import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/crypto";
import type { ModelConfig } from "@/lib/types/app";

/** Loads the user's default (or first) model configuration and decrypts the stored API key. */
export async function getActiveModelConfig(
  userId: string
): Promise<{ config: ModelConfig; apiKey: string } | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("model_configs")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    config: {
      id: data.id,
      provider: data.provider as ModelConfig["provider"],
      label: data.label,
      base_url: data.base_url,
      model: data.model,
      is_default: data.is_default,
      masked_key: "",
    },
    apiKey: decryptSecret(data.api_key_encrypted),
  };
}
