import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { logger } from "@/lib/logger";
import { recordFailure } from "@/lib/metrics";
import type Stripe from "stripe";

export const runtime = "nodejs";

/**
 * Stripe webhook: on successful checkout, credit the user's account exactly once.
 * Verifies the signature and delegates crediting to the `grant_payment_credits` SQL function,
 * which is idempotent (guarded by a unique constraint on `payments.stripe_session_id`) so
 * Stripe's automatic retries/replays can never double-credit an account.
 */
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const body = await req.text();

  if (!signature || !secret) {
    return Response.json({ error: "Webhook not configured." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id ?? session.metadata?.user_id;
    const credits = Number(session.metadata?.credits ?? 5);

    if (userId) {
      const admin = createAdminClient();
      const { error } = await admin.rpc("grant_payment_credits", {
        p_user_id: userId,
        p_session_id: session.id,
        p_credits: credits,
        p_amount_usd: (session.amount_total ?? 0) / 100,
      });
      if (error) {
        logger.error("billing.webhook_grant_failed", { route: "/api/billing/webhook", eventType: event.type });
        recordFailure("stripe");
      }
    }
  }

  return Response.json({ received: true });
}
