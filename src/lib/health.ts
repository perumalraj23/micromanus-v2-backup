import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { getEnvStatus } from "@/lib/env";
import packageJson from "../../package.json";

export type CheckResult = { name: string; status: "healthy" | "degraded" | "unavailable"; detail?: string };

export function getVersion(): string {
  return packageJson.version;
}

/** Verifies the service-role Supabase client can actually reach the database. */
export async function checkDatabase(): Promise<CheckResult> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("profiles").select("id").limit(1);
    if (error) return { name: "database", status: "unavailable", detail: error.message };
    return { name: "database", status: "healthy" };
  } catch (err) {
    return { name: "database", status: "unavailable", detail: (err as Error).message };
  }
}

export function checkStripeConfigured(): CheckResult {
  const { optional } = getEnvStatus();
  const secretKey = optional.find((o) => o.key === "STRIPE_SECRET_KEY");
  const webhookSecret = optional.find((o) => o.key === "STRIPE_WEBHOOK_SECRET");
  if (!secretKey?.present || secretKey.looksPlaceholder) {
    return { name: "stripe", status: "unavailable", detail: "STRIPE_SECRET_KEY missing or placeholder" };
  }
  if (!webhookSecret?.present || webhookSecret.looksPlaceholder) {
    return { name: "stripe", status: "degraded", detail: "Webhook secret missing — falls back to /api/billing/confirm" };
  }
  return { name: "stripe", status: "healthy" };
}

export function checkTavilyConfigured(): CheckResult {
  const { optional } = getEnvStatus();
  const key = optional.find((o) => o.key === "TAVILY_API_KEY");
  if (!key?.present || key.looksPlaceholder) {
    return { name: "tavily", status: "unavailable", detail: "TAVILY_API_KEY missing or placeholder — web search disabled" };
  }
  return { name: "tavily", status: "healthy" };
}

/** Round-trips a throwaway value through encrypt/decrypt to prove ENCRYPTION_KEY actually works. */
export function checkEncryption(): CheckResult {
  try {
    const probe = "healthcheck-probe";
    const encrypted = encryptSecret(probe);
    const decrypted = decryptSecret(encrypted);
    if (decrypted !== probe) return { name: "encryption", status: "unavailable", detail: "round-trip mismatch" };
    return { name: "encryption", status: "healthy" };
  } catch (err) {
    return { name: "encryption", status: "unavailable", detail: (err as Error).message };
  }
}

/** Renders a minimal PDF to prove the @react-pdf/renderer pipeline works in this runtime. */
export async function checkPdfGeneration(): Promise<CheckResult> {
  try {
    const { renderToBuffer } = await import("@react-pdf/renderer");
    const { ResearchReportDocument } = await import("@/lib/pdf/report");
    const buffer = await renderToBuffer(
      ResearchReportDocument({
        title: "Health check",
        report: { tldr: "probe", key_findings: [], recommendations: [], sources: [] },
      })
    );
    if (!buffer || buffer.length === 0) return { name: "pdf", status: "unavailable", detail: "empty buffer" };
    return { name: "pdf", status: "healthy" };
  } catch (err) {
    return { name: "pdf", status: "unavailable", detail: (err as Error).message };
  }
}

/** OAuth providers (Google/GitHub) are configured in the Supabase dashboard, not via this
 * app's env vars — we can't verify provider credentials from here without a live browser
 * redirect. We can only confirm the site URL used for OAuth redirects is configured. */
export function checkOAuthRedirectConfig(): CheckResult {
  const { optional } = getEnvStatus();
  const siteUrl = optional.find((o) => o.key === "NEXT_PUBLIC_SITE_URL");
  if (!siteUrl?.present || siteUrl.looksPlaceholder) {
    return {
      name: "oauth_redirect",
      status: "degraded",
      detail: "NEXT_PUBLIC_SITE_URL missing — falls back to http://localhost:3000, will break OAuth in production",
    };
  }
  return { name: "oauth_redirect", status: "healthy" };
}

export function computeDeploymentScore(checks: CheckResult[]): number {
  if (checks.length === 0) return 0;
  const points = checks.reduce((sum, c) => sum + (c.status === "healthy" ? 1 : c.status === "degraded" ? 0.5 : 0), 0);
  return Math.round((points / checks.length) * 100);
}

/** Non-fatal warnings surfaced on the status page — never block startup or requests. */
export function getDeploymentWarnings(): string[] {
  const warnings: string[] = [];
  const { missingRequired } = getEnvStatus();
  if (missingRequired.length > 0) {
    warnings.push(`Missing required environment variables: ${missingRequired.join(", ")}.`);
  }
  if (checkStripeConfigured().status !== "healthy") {
    warnings.push("Stripe webhook secret missing — credits rely on the /api/billing/confirm fallback instead of webhooks.");
  }
  if (checkTavilyConfigured().status !== "healthy") {
    warnings.push("Tavily API key missing or placeholder — web search tool is disabled.");
  }
  // maxDuration = 120s on /api/chat exceeds the Vercel Hobby plan's 60s serverless function
  // limit (Pro/Enterprise support longer durations). This is a real, verifiable fact about
  // this codebase (see src/app/api/chat/route.ts), not a guess.
  warnings.push("The /api/chat route sets maxDuration=120s — this exceeds Vercel's Hobby plan 60s limit. Deploy on Pro or reduce the duration.");
  return warnings;
}
