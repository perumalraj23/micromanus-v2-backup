import {
  checkDatabase,
  checkStripeConfigured,
  checkBraveConfigured,
  checkEncryption,
  checkPdfGeneration,
  checkOAuthRedirectConfig,
  computeDeploymentScore,
  getDeploymentWarnings,
  getVersion,
  type CheckResult,
} from "@/lib/health";
import { metricsSnapshot } from "@/lib/metrics";

/**
 * Deeper deployment verification than /api/health — exercises each subsystem (DB round-trip,
 * encryption round-trip, PDF rendering) rather than just checking env presence. Public and
 * unauthenticated (an ops/status endpoint), but only ever returns booleans/labels, never
 * secret values.
 */
export async function GET() {
  const [database, pdf] = await Promise.all([checkDatabase(), checkPdfGeneration()]);
  const stripe = checkStripeConfigured();
  const brave = checkBraveConfigured();
  const encryption = checkEncryption();
  const oauthRedirect = checkOAuthRedirectConfig();

  const checks: CheckResult[] = [database, stripe, brave, encryption, pdf, oauthRedirect];
  const score = computeDeploymentScore(checks);
  const warnings = getDeploymentWarnings();

  return Response.json({
    version: getVersion(),
    score,
    checks,
    warnings,
    metrics: metricsSnapshot(),
  });
}
