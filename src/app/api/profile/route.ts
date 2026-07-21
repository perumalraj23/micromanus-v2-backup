import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, credits, has_paid, coupon_used")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return Response.json({ error: "Could not load your profile." }, { status: 500 });
  return Response.json({ profile: data });
}
