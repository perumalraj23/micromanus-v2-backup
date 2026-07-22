import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  checkStripeConfigured,
  checkBraveConfigured,
  checkOAuthRedirectConfig,
  checkEncryption,
  computeDeploymentScore,
  getDeploymentWarnings,
  type CheckResult,
} from "@/lib/health";

const ENV_KEYS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "BRAVE_SEARCH_API_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "ENCRYPTION_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

let savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const key of ENV_KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

describe("health checks — missing/placeholder env var scenarios", () => {
  it("reports stripe unavailable when STRIPE_SECRET_KEY is missing", () => {
    expect(checkStripeConfigured().status).toBe("unavailable");
  });

  it("reports stripe degraded when secret key is set but webhook secret is missing", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_real_value";
    expect(checkStripeConfigured().status).toBe("degraded");
  });

  it("reports stripe healthy when both keys are present and not placeholders", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_real_value";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_real_value";
    expect(checkStripeConfigured().status).toBe("healthy");
  });

  it("treats placeholder-looking values as not configured (e.g. 'your-key-here')", () => {
    process.env.STRIPE_SECRET_KEY = "your-stripe-key-here";
    expect(checkStripeConfigured().status).toBe("unavailable");
  });

  it("reports brave search unavailable when BRAVE_SEARCH_API_KEY is missing", () => {
    expect(checkBraveConfigured().status).toBe("unavailable");
  });

  it("reports brave search healthy when a real key is present", () => {
    process.env.BRAVE_SEARCH_API_KEY = "real-brave-key";
    expect(checkBraveConfigured().status).toBe("healthy");
  });

  it("flags missing NEXT_PUBLIC_SITE_URL as degraded (OAuth redirects would break in prod)", () => {
    expect(checkOAuthRedirectConfig().status).toBe("degraded");
  });

  it("round-trips encryption successfully when ENCRYPTION_KEY is configured", () => {
    process.env.ENCRYPTION_KEY = "a-real-encryption-key";
    expect(checkEncryption().status).toBe("healthy");
  });

  it("reports encryption unavailable (fails closed) when ENCRYPTION_KEY is missing", () => {
    expect(checkEncryption().status).toBe("unavailable");
  });

  it("surfaces missing required env vars as a deployment warning", () => {
    const warnings = getDeploymentWarnings();
    expect(warnings.some((w) => w.includes("Missing required environment variables"))).toBe(true);
  });
});

describe("computeDeploymentScore", () => {
  it("scores all-healthy checks as 100", () => {
    const checks: CheckResult[] = [
      { name: "a", status: "healthy" },
      { name: "b", status: "healthy" },
    ];
    expect(computeDeploymentScore(checks)).toBe(100);
  });

  it("scores all-unavailable checks as 0", () => {
    const checks: CheckResult[] = [{ name: "a", status: "unavailable" }];
    expect(computeDeploymentScore(checks)).toBe(0);
  });

  it("weighs degraded checks as half credit", () => {
    const checks: CheckResult[] = [
      { name: "a", status: "healthy" },
      { name: "b", status: "degraded" },
    ];
    expect(computeDeploymentScore(checks)).toBe(75);
  });

  it("returns 0 for an empty check list instead of dividing by zero", () => {
    expect(computeDeploymentScore([])).toBe(0);
  });
});
