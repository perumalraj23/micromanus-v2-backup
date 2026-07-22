import { getVersion, checkDatabase, checkStripeConfigured, checkBraveConfigured } from "@/lib/health";
import { metricsSnapshot } from "@/lib/metrics";

/**
 * Public, unauthenticated health check for uptime monitors / load balancers.
 * Never returns secret values — only booleans/labels derived from `getEnvStatus()` and a
 * live database ping. Safe to expose without auth (see 06_REPORT.md).
 */
export async function GET() {
  const [database, stripe, brave] = await Promise.all([
    checkDatabase(),
    Promise.resolve(checkStripeConfigured()),
    Promise.resolve(checkBraveConfigured()),
  ]);

  const overallHealthy = database.status === "healthy";
  const metrics = metricsSnapshot();

  return Response.json({
    status: overallHealthy ? "healthy" : "degraded",
    version: getVersion(),
    database: database.status,
    stripe: stripe.status,
    brave: brave.status,
    // Instance-local uptime only (resets on cold start) — see src/lib/metrics.ts caveat.
    uptimeSeconds: metrics.instanceUptimeSeconds,
  });
}
