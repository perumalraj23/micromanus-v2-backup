"use client";

import { useEffect, useState } from "react";
import { Cpu, Activity, Zap } from "lucide-react";
import { useFounderMode } from "@/lib/hooks/use-founder-mode";
import { formatCurrency, formatNumber } from "@/lib/utils";

type HealthStatus = { status: "healthy" | "degraded"; uptimeSeconds: number };
type ModelConfig = { id: string; label: string; model: string; is_default: boolean };
type FounderTotals = { total_cost_usd: number; cache_savings_usd: number; input_tokens: number; output_tokens: number };

/**
 * A persistent, glanceable status bar (Wow Factor #14): active model, live health, and request
 * latency. Expands with extra real metrics when Founder Mode is toggled on (Wow Factor #3).
 */
export function StatusBar() {
  const { enabled: founderMode } = useFounderMode();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [founderTotals, setFounderTotals] = useState<FounderTotals | null>(null);

  useEffect(() => {
    const startedAt = performance.now();
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => {
        setLatencyMs(Math.round(performance.now() - startedAt));
        setHealth({ status: data.status, uptimeSeconds: data.uptimeSeconds });
      })
      .catch(() => setHealth(null));

    fetch("/api/model-configs")
      .then((r) => r.json())
      .then((data) => {
        const configs = (data.configs ?? []) as ModelConfig[];
        const active = configs.find((c) => c.is_default) ?? configs[0];
        setActiveModel(active?.model ?? null);
      })
      .catch(() => setActiveModel(null));
  }, []);

  useEffect(() => {
    if (!founderMode) return;
    fetch("/api/analytics?range=lifetime")
      .then((r) => r.json())
      .then((data) => setFounderTotals(data.totals))
      .catch(() => setFounderTotals(null));
  }, [founderMode]);

  return (
    <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <Cpu className="h-3 w-3" /> {activeModel ?? "No model"}
        </span>
        <span className="flex items-center gap-1">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              health?.status === "healthy" ? "bg-emerald-500" : health ? "bg-amber-500" : "bg-muted-foreground"
            }`}
          />
          {health?.status === "healthy" ? "Healthy" : health ? "Degraded" : "—"}
        </span>
        {latencyMs !== null && (
          <span className="flex items-center gap-1">
            <Activity className="h-3 w-3" /> {latencyMs}ms
          </span>
        )}
      </div>

      {founderMode && (
        <div className="mt-2 flex flex-col gap-1 rounded-md bg-muted/50 p-2 animate-fade-in-up">
          <p className="flex items-center gap-1 font-medium text-foreground">
            <Zap className="h-3 w-3 text-primary" /> Founder Mode
          </p>
          <p>Lifetime spend: {formatCurrency(founderTotals?.total_cost_usd ?? 0)}</p>
          <p>Cache savings: {formatCurrency(founderTotals?.cache_savings_usd ?? 0)}</p>
          <p>
            Tokens processed:{" "}
            {formatNumber((founderTotals?.input_tokens ?? 0) + (founderTotals?.output_tokens ?? 0))}
          </p>
        </div>
      )}
    </div>
  );
}
