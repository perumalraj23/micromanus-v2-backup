/**
 * Lightweight in-process observability counters.
 *
 * IMPORTANT CAVEAT: this is a best-effort, single-instance counter set, not a real APM/metrics
 * backend. On Vercel (serverless), each cold start gets a fresh module instance, so these
 * numbers reset frequently and are NOT a substitute for a real metrics pipeline (e.g. Vercel
 * Analytics, Datadog, Sentry). They exist to give `/api/health` and `/api/deployment-check`
 * something real to report rather than fabricated numbers, and are clearly labeled as
 * "since last cold start" wherever they're surfaced.
 */

type FailureKind = "timeout" | "pdf" | "stripe" | "auth";

const state = {
  startedAt: Date.now(),
  totalRequests: 0,
  failedRequests: 0,
  latenciesMs: [] as number[],
  failures: {
    timeout: 0,
    pdf: 0,
    stripe: 0,
    auth: 0,
  } as Record<FailureKind, number>,
};

const MAX_LATENCY_SAMPLES = 200;

export function recordRequest(durationMs: number, failed: boolean) {
  state.totalRequests += 1;
  if (failed) state.failedRequests += 1;
  state.latenciesMs.push(durationMs);
  if (state.latenciesMs.length > MAX_LATENCY_SAMPLES) state.latenciesMs.shift();
}

export function recordFailure(kind: FailureKind) {
  state.failures[kind] += 1;
}

export function metricsSnapshot() {
  const avgLatencyMs =
    state.latenciesMs.length > 0
      ? Math.round(state.latenciesMs.reduce((a, b) => a + b, 0) / state.latenciesMs.length)
      : 0;

  return {
    instanceUptimeSeconds: Math.round((Date.now() - state.startedAt) / 1000),
    totalRequests: state.totalRequests,
    failedRequests: state.failedRequests,
    averageLatencyMs: avgLatencyMs,
    timeoutCount: state.failures.timeout,
    pdfFailures: state.failures.pdf,
    stripeFailures: state.failures.stripe,
    authFailures: state.failures.auth,
  };
}
