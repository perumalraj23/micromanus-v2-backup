import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("credits, has_paid, full_name, avatar_url, email")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.has_paid) redirect("/paywall");

  return (
    <AppShell
      user={{
        name: profile.full_name ?? profile.email ?? "Researcher",
        avatarUrl: profile.avatar_url,
        credits: profile.credits,
      }}
    >
      {children}
    </AppShell>
  );
}
