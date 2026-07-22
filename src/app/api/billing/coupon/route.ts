import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { COUPON_CODE, CREDIT_PACK } from "@/lib/stripe";
import { logger } from "@/lib/logger";

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

  // Credits/has_paid/coupon_used are protected columns — redeem atomically via the service
  // role so two simultaneous requests can't both redeem the coupon (race-safe: the SQL
  // function only succeeds `WHERE coupon_used IS NULL`).
  const admin = createAdminClient();
  const { data: newCredits, error } = await admin.rpc("redeem_coupon", {
    p_user_id: user.id,
    p_code: COUPON_CODE,
    p_credits: CREDIT_PACK.credits,
  });

  if (error) {
    logger.error("billing.coupon_redeem_failed", { route: "/api/billing/coupon" });
    return Response.json({ error: "Could not apply the coupon. Please try again." }, { status: 500 });
  }

  if (newCredits === null) {
    return Response.json({ error: "You've already redeemed a coupon on this account." }, { status: 400 });
  }

  return Response.json({ credits: newCredits });
}
