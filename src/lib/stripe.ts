import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

/** Lazily initialized Stripe client (sandbox/test keys during development). */
export function getStripe(): Stripe {
  if (!stripeSingleton) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured.");
    stripeSingleton = new Stripe(key);
  }
  return stripeSingleton;
}

export type PaymentPackId = "starter" | "professional" | "power_user";

export type PaymentPack = {
  id: PaymentPackId;
  label: string;
  credits: number;
  amountUsd: number;
  description: string;
};

/** Credit packs available at checkout. Adding a new pack here does not require any schema
 * changes — the checkout/webhook/confirm routes all derive credits/amount from Stripe
 * metadata, not from a hardcoded assumption. */
export const PAYMENT_PACKS: PaymentPack[] = [
  { id: "starter", label: "Starter", credits: 5, amountUsd: 5, description: "Try MicroManus out." },
  { id: "professional", label: "Professional", credits: 25, amountUsd: 20, description: "Best value per credit." },
  { id: "power_user", label: "Power User", credits: 100, amountUsd: 50, description: "For heavy research workloads." },
];

export function getPaymentPack(id: string | null | undefined): PaymentPack {
  return PAYMENT_PACKS.find((p) => p.id === id) ?? PAYMENT_PACKS[0];
}

/** @deprecated kept for backward compatibility — prefer `getPaymentPack("starter")`. */
export const CREDIT_PACK = PAYMENT_PACKS[0];

export const COUPON_CODE = "SID_DRDROID";
