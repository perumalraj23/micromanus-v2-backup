import { describe, it, expect } from "vitest";
import { findPricing, estimateCost, MODEL_PRESETS } from "@/lib/pricing";

describe("pricing / credit cost engine", () => {
  it("finds pricing for a known model", () => {
    const pricing = findPricing("gpt-4o-mini");
    expect(pricing).toEqual({ input: 0.15, output: 0.6, cached_input: 0.075 });
  });

  it("falls back to a sane default for an unknown model instead of throwing", () => {
    const pricing = findPricing("some-unreleased-model-xyz");
    expect(pricing).toEqual({ input: 1, output: 3, cached_input: 0.5 });
  });

  it("computes cost using only billable (non-cached) input tokens", () => {
    // 1,000,000 input tokens, 200,000 of which are cached, 500,000 output tokens.
    const result = estimateCost("gpt-4o-mini", 1_000_000, 500_000, 200_000);
    const expectedCost =
      (800_000 / 1_000_000) * 0.15 + (200_000 / 1_000_000) * 0.075 + (500_000 / 1_000_000) * 0.6;
    expect(result.cost_usd).toBeCloseTo(expectedCost, 6);
  });

  it("computes cache savings as the delta between full-price and cached input pricing", () => {
    const result = estimateCost("gpt-4o-mini", 1_000_000, 0, 1_000_000);
    // All input tokens cached: savings = 1M/1M * (input - cached_input)
    expect(result.cache_savings_usd).toBeCloseTo(0.15 - 0.075, 6);
  });

  it("never produces a negative billable-input cost when cached tokens exceed input tokens", () => {
    const result = estimateCost("gpt-4o-mini", 100, 0, 500);
    expect(result.cost_usd).toBeGreaterThanOrEqual(0);
  });

  it("returns zero cost/savings for a zero-usage request", () => {
    const result = estimateCost("gpt-4o-mini", 0, 0, 0);
    expect(result.cost_usd).toBe(0);
    expect(result.cache_savings_usd).toBe(0);
  });

  it("every preset has strictly positive pricing fields", () => {
    for (const preset of MODEL_PRESETS) {
      expect(preset.pricing.input).toBeGreaterThan(0);
      expect(preset.pricing.output).toBeGreaterThan(0);
      expect(preset.pricing.cached_input).toBeGreaterThan(0);
      // Cached input should never be pricier than standard input.
      expect(preset.pricing.cached_input).toBeLessThanOrEqual(preset.pricing.input);
    }
  });

  it("every preset has a unique id", () => {
    const ids = MODEL_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
