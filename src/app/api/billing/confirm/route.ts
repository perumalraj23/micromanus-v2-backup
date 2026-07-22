import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { logger } from "@/lib/logger";
import { recordFailure } from "@/lib/metrics";

/**
 * Fallback confirmation path for Stripe Checkout in sandbox environments where a webhook
 * listener may not be configured. Verifies the session directly with Stripe (source of truth)
 * before crediting the account. Crediting itself goes through the same idempotent
 * `grant_payment_credits` SQL function the webhook uses, so a race between this route and a
 * webhook delivery for the same session can never double-credit the account.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");
  if (!sessionId) return Response.json({ error: "Missing session id." }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);

    if (session.client_reference_id !== user.id) {
      return Response.json({ error: "This checkout session doesn't belong to your account." }, { status: 403 });
    }

    if (session.payment_status !== "paid") {
      return Response.json({ error: "Payment not completed yet." }, { status: 400 });
    }

    const admin = createAdminClient();
    const credits = Number(session.metadata?.credits ?? 5);

    const { data, error } = await admin
      .rpc("grant_payment_credits", {
        p_user_id: user.id,
        p_session_id: session.id,
        p_credits: credits,
        p_amount_usd: (session.amount_total ?? 0) / 100,
      })
      .single();

    if (error || !data) {
      logger.error("billing.confirm_grant_failed", { route: "/api/billing/confirm" });
      recordFailure("stripe");
      return Response.json({ error: "Could not confirm your payment. Please contact support." }, { status: 500 });
    }

    const result = data as { credits: number; already_processed: boolean };
    return Response.json({ credits: result.credits, already_processed: result.already_processed });
  } catch {
    return Response.json({ error: "Could not confirm your payment. Please contact support." }, { status: 500 });
  }
}
