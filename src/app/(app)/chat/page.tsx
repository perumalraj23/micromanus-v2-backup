import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ChatIndexPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: chats } = await supabase
    .from("chats")
    .select("id")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (chats && chats.length > 0) {
    redirect(`/chat/${chats[0].id}`);
  }

  const { data: created } = await supabase
    .from("chats")
    .insert({ user_id: user.id, title: "New research" })
    .select("id")
    .single();

  if (created) redirect(`/chat/${created.id}`);

  redirect("/");
}
