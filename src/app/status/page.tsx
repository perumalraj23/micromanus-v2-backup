"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Gauge, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type CheckResult = { name: string; status: "healthy" | "degraded" | "unavailable"; detail?: string };

type DeploymentCheck = {
  version: string;
  score: number;
  checks: CheckResult[];
  warnings: string[];
  metrics: {
    instanceUptimeSeconds: number;
    totalRequests: number;
    failedRequests: number;
    averageLatencyMs: number;
    timeoutCount: number;
    pdfFailures: number;
    stripeFailures: number;
    authFailures: number;
  };
};

const LABELS: Record<string, string> = {
  database: "Database",
  stripe: "Stripe",
  tavily: "Tavily Search",
  encryption: "Encryption",
  pdf: "PDF Service",
  oauth_redirect: "OAuth Redirect Config",
};

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function StatusPage() {
  const [data, setData] = useState<DeploymentCheck | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/deployment-check")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl p-6 sm:p-10">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold">MicroManus Status</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading ? "Checking systems…" : `v${data?.version} · Deployment score ${data?.score ?? 0}/100`}
        </p>
      </div>

      {loading || !data ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <>
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Gauge className="h-4 w-4 text-primary" /> Deployment Checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {data.checks.map((c) => (
                <div key={c.name} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <span>{LABELS[c.name] ?? c.name}</span>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </CardContent>
          </Card>

          {data.warnings.length > 0 && (
            <Card className="mb-4 border-amber-500/30 bg-amber-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> Deployment Warnings
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                {data.warnings.map((w, i) => (
                  <p key={i} className="text-muted-foreground">
                    {w}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-primary" /> Observability (since last cold start)
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Metric label="Uptime" value={formatUptime(data.metrics.instanceUptimeSeconds)} />
              <Metric label="Total requests" value={String(data.metrics.totalRequests)} />
              <Metric label="Failed requests" value={String(data.metrics.failedRequests)} />
              <Metric label="Avg latency" value={`${data.metrics.averageLatencyMs}ms`} />
              <Metric label="Timeouts" value={String(data.metrics.timeoutCount)} />
              <Metric label="PDF failures" value={String(data.metrics.pdfFailures)} />
              <Metric label="Stripe failures" value={String(data.metrics.stripeFailures)} />
              <Metric label="Auth failures" value={String(data.metrics.authFailures)} />
            </CardContent>
          </Card>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Observability counters are per-instance and reset on cold start — not a substitute for a real APM.
          </p>
        </>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: CheckResult["status"] }) {
  if (status === "healthy") {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3 w-3" /> Healthy
      </Badge>
    );
  }
  if (status === "degraded") {
    return (
      <Badge variant="secondary" className={cn("gap-1 text-amber-600 dark:text-amber-400")}>
        <AlertTriangle className="h-3 w-3" /> Degraded
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="gap-1">
      <XCircle className="h-3 w-3" /> Unavailable
    </Badge>
  );
}
