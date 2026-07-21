"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  MessageSquare,
  FileText,
  Coins,
  ArrowDownToLine,
  ArrowUpFromLine,
  Database,
  DollarSign,
  PiggyBank,
} from "lucide-react";
import { StatCard } from "@/components/analytics/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { UsageTotals } from "@/lib/types/app";

export default function AnalyticsPage() {
  const [totals, setTotals] = useState<UsageTotals | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((data) => setTotals(data.totals))
      .catch(() => toast.error("Could not load analytics right now."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto p-6 sm:p-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Usage, cost, and cache savings across all your research.</p>
      </div>

      {loading || !totals ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard icon={MessageSquare} label="Total chats" value={formatNumber(totals.total_chats)} />
            <StatCard icon={FileText} label="Reports generated" value={formatNumber(totals.reports_generated)} />
            <StatCard icon={Coins} label="Credits remaining" value={formatNumber(totals.credits_remaining)} />
            <StatCard icon={DollarSign} label="Total cost" value={formatCurrency(totals.total_cost_usd)} />
            <StatCard icon={ArrowDownToLine} label="Input tokens" value={formatNumber(totals.input_tokens)} />
            <StatCard icon={ArrowUpFromLine} label="Output tokens" value={formatNumber(totals.output_tokens)} />
            <StatCard icon={Database} label="Cache tokens" value={formatNumber(totals.cached_tokens)} />
            <StatCard
              icon={PiggyBank}
              label="Cache savings"
              value={formatCurrency(totals.cache_savings_usd)}
              hint="vs. no caching"
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Cost per model</CardTitle>
              </CardHeader>
              <CardContent>
                {totals.by_model.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={totals.by_model}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="model" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                      <Bar dataKey="cost_usd" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost per chat</CardTitle>
              </CardHeader>
              <CardContent>
                {totals.by_chat.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={totals.by_chat}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="title" tick={{ fontSize: 11 }} hide />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                      <Bar dataKey="cost_usd" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[240px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
      No usage yet — start a research chat to see analytics here.
    </div>
  );
}
