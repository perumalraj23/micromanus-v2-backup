import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("reports")
    .select("id, chat_id, title, summary, created_at")
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: "Could not load reports." }, { status: 500 });
  return Response.json({ reports: data });
}
