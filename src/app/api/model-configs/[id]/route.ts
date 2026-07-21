import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (body?.set_default) {
    await supabase.from("model_configs").update({ is_default: false }).eq("user_id", user.id);
    const { error } = await supabase
      .from("model_configs")
      .update({ is_default: true })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return Response.json({ error: "Could not update default model." }, { status: 500 });
  }

  return Response.json({ success: true });
}
