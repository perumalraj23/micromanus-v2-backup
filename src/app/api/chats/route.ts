import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("chats")
    .select("id, title, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) return Response.json({ error: "Could not load your chats." }, { status: 500 });
  return Response.json({ chats: data });
}

const createSchema = z.object({ title: z.string().trim().max(120).optional() });

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  const title = parsed.success && parsed.data.title ? parsed.data.title : "New research";

  const { data, error } = await supabase
    .from("chats")
    .insert({ user_id: user.id, title })
    .select("id, title, created_at, updated_at")
    .single();

  if (error) return Response.json({ error: "Could not create a new chat." }, { status: 500 });
  return Response.json({ chat: data });
}
