import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const renameSchema = z.object({ title: z.string().trim().min(1).max(120) });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = renameSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Please enter a valid chat name." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("chats")
    .update({ title: parsed.data.title })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, title, created_at, updated_at")
    .single();

  if (error || !data) return Response.json({ error: "Could not rename that chat." }, { status: 404 });
  return Response.json({ chat: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("chats").delete().eq("id", id).eq("user_id", user.id);
  if (error) return Response.json({ error: "Could not delete that chat." }, { status: 500 });
  return Response.json({ success: true });
}
