import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { COUPON_CODE, CREDIT_PACK } from "@/lib/stripe";

const schema = z.object({ code: z.string().trim() });

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Please sign in to continue." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Please enter a coupon code." }, { status: 400 });
  }

  if (parsed.data.code.trim().toUpperCase() !== COUPON_CODE) {
    return Response.json({ error: "That coupon code isn't valid. Double-check and try again." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("credits, coupon_used")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.coupon_used) {
    return Response.json({ error: "You've already redeemed a coupon on this account." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      credits: (profile?.credits ?? 0) + CREDIT_PACK.credits,
      has_paid: true,
      coupon_used: COUPON_CODE,
    })
    .eq("id", user.id)
    .select("credits")
    .single();

  if (error || !data) {
    return Response.json({ error: "Could not apply the coupon. Please try again." }, { status: 500 });
  }

  return Response.json({ credits: data.credits });
}
