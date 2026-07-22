import { createClient } from "@/lib/supabase/server";
import { getStripe, getPaymentPack } from "@/lib/stripe";
import { logger, newRequestId } from "@/lib/logger";

export async function POST(req: Request) {
  const traceId = newRequestId();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Please sign in to continue.", traceId }, { status: 401 });

  let packId: string | undefined;
  try {
    const body = await req.json();
    packId = typeof body?.packId === "string" ? body.packId : undefined;
  } catch {
    // No body / not JSON — fall back to the default (starter) pack.
  }
  const pack = getPaymentPack(packId);

  // Never trust the client-controlled Origin header for redirect URLs — always use the
  // configured site URL so a spoofed Origin can't redirect users off-platform after payment.
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const stripe = getStripe();
  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `MicroManus — ${pack.label} (${pack.credits} research credits)`,
                description: `${pack.description} Stripe sandbox checkout.`,
              },
              unit_amount: pack.amountUsd * 100,
            },
            quantity: 1,
          },
        ],
        client_reference_id: user.id,
        metadata: { user_id: user.id, credits: String(pack.credits), pack_id: pack.id, trace_id: traceId },
        success_url: `${origin}/paywall?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/paywall?checkout=cancelled`,
      });

      logger.info("billing.checkout_created", { traceId, userId: user.id, packId: pack.id, sessionId: session.id });
      return Response.json({ url: session.url, traceId });
    } catch (err) {
      const statusCode = (err as { statusCode?: number } | undefined)?.statusCode ?? null;
      const transient = typeof statusCode === "number" && statusCode >= 500;
      logger.error("billing.checkout_create_failed", {
        route: "/api/billing/checkout",
        traceId,
        attempt,
        status: statusCode,
      });
      if (transient && attempt < maxAttempts) continue;
      return Response.json(
        { error: "We couldn't start the checkout. Please try again in a moment.", traceId },
        { status: 502 }
      );
    }
  }

  // Unreachable, but keeps TypeScript happy about all code paths returning.
  return Response.json({ error: "We couldn't start the checkout. Please try again.", traceId }, { status: 502 });
}
