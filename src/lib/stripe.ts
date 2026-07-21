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

export const CREDIT_PACK = {
  amountUsd: 5,
  credits: 5,
};

export const COUPON_CODE = "SID_DRDROID";
