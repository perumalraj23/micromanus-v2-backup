import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

/**
 * Fallback confirmation path for Stripe Checkout in sandbox environments where a webhook
 * listener may not be configured. Verifies the session directly with Stripe (source of truth)
 * before crediting the account, and is idempotent against the `payments` table.
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
    const { data: existing } = await admin
      .from("payments")
      .select("id")
      .eq("stripe_session_id", session.id)
      .maybeSingle();

    if (existing) {
      const { data: profile } = await admin.from("profiles").select("credits").eq("id", user.id).maybeSingle();
      return Response.json({ credits: profile?.credits ?? 0, already_processed: true });
    }

    const credits = Number(session.metadata?.credits ?? 5);
    const { data: profile } = await admin.from("profiles").select("credits").eq("id", user.id).maybeSingle();
    const newCredits = (profile?.credits ?? 0) + credits;

    await admin.from("profiles").update({ credits: newCredits, has_paid: true }).eq("id", user.id);
    await admin.from("payments").insert({
      user_id: user.id,
      stripe_session_id: session.id,
      amount_usd: (session.amount_total ?? 0) / 100,
      credits_added: credits,
      status: "completed",
    });

    return Response.json({ credits: newCredits });
  } catch {
    return Response.json({ error: "Could not confirm your payment. Please contact support." }, { status: 500 });
  }
}
