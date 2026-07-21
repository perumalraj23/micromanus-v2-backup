import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

export const runtime = "nodejs";

/** Stripe webhook: on successful checkout, credit the user's account. Verifies the signature. */
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

      const { data: existing } = await admin
        .from("payments")
        .select("id")
        .eq("stripe_session_id", session.id)
        .maybeSingle();

      if (!existing) {
        const { data: profile } = await admin
          .from("profiles")
          .select("credits")
          .eq("id", userId)
          .maybeSingle();

        await admin
          .from("profiles")
          .update({ credits: (profile?.credits ?? 0) + credits, has_paid: true })
          .eq("id", userId);

        await admin.from("payments").insert({
          user_id: userId,
          stripe_session_id: session.id,
          amount_usd: (session.amount_total ?? 0) / 100,
          credits_added: credits,
          status: "completed",
        });
      }
    }
  }

  return Response.json({ received: true });
}
