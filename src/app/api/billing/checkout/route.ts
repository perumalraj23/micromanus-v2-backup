import { createClient } from "@/lib/supabase/server";
import { getStripe, CREDIT_PACK } from "@/lib/stripe";
import { logger } from "@/lib/logger";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Please sign in to continue." }, { status: 401 });

  // Never trust the client-controlled Origin header for redirect URLs — always use the
  // configured site URL so a spoofed Origin can't redirect users off-platform after payment.
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `MicroManus — ${CREDIT_PACK.credits} research credits`,
              description: "Unlock the research agent with 5 credits (Stripe sandbox).",
            },
            unit_amount: CREDIT_PACK.amountUsd * 100,
          },
          quantity: 1,
        },
      ],
      client_reference_id: user.id,
      metadata: { user_id: user.id, credits: String(CREDIT_PACK.credits) },
      success_url: `${origin}/paywall?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/paywall?checkout=cancelled`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    logger.error("billing.checkout_create_failed", {
      route: "/api/billing/checkout",
      status: (err as { statusCode?: number } | undefined)?.statusCode ?? null,
    });
    return Response.json(
      { error: "We couldn't start the checkout. Please try again in a moment." },
      { status: 500 }
    );
  }
}
