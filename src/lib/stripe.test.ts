import { describe, it, expect } from "vitest";
import { PAYMENT_PACKS, getPaymentPack, COUPON_CODE, CREDIT_PACK } from "@/lib/stripe";

describe("stripe payment packs & coupon", () => {
  it("has at least one payment pack with positive credits and price", () => {
    expect(PAYMENT_PACKS.length).toBeGreaterThan(0);
    for (const pack of PAYMENT_PACKS) {
      expect(pack.credits).toBeGreaterThan(0);
      expect(pack.amountUsd).toBeGreaterThan(0);
    }
  });

  it("every pack has a unique id", () => {
    const ids = PAYMENT_PACKS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("resolves a known pack id", () => {
    const pack = getPaymentPack("professional");
    expect(pack.id).toBe("professional");
  });

  it("falls back to the first pack for an unknown/missing id (never throws on bad input)", () => {
    expect(getPaymentPack("does-not-exist").id).toBe(PAYMENT_PACKS[0].id);
    expect(getPaymentPack(null).id).toBe(PAYMENT_PACKS[0].id);
    expect(getPaymentPack(undefined).id).toBe(PAYMENT_PACKS[0].id);
  });

  it("deprecated CREDIT_PACK alias still points at the starter pack", () => {
    expect(CREDIT_PACK.id).toBe("starter");
  });

  it("coupon code is stored uppercase (route compares after .toUpperCase())", () => {
    expect(COUPON_CODE).toBe(COUPON_CODE.toUpperCase());
  });
});
