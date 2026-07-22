import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: chat } = await supabase
    .from("chats")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!chat) return Response.json({ error: "Chat not found." }, { status: 404 });

  // Messages and reports are independent reads once ownership is confirmed above — run them in
  // parallel instead of sequentially to cut this route's DB round-trip time roughly in half.
  const [{ data, error }, { data: reports }] = await Promise.all([
    supabase
      .from("messages")
      .select("id, chat_id, role, content, thoughts, timeline, report, model, provider, created_at")
      .eq("chat_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("reports").select("id, message_id").eq("chat_id", id),
  ]);

  if (error) return Response.json({ error: "Could not load messages." }, { status: 500 });

  const reportIdByMessage = new Map((reports ?? []).map((r) => [r.message_id, r.id]));

  const messages = (data ?? []).map((m) => ({
    ...m,
    report_id: reportIdByMessage.get(m.id) ?? null,
  }));

  return Response.json({ messages });
}
