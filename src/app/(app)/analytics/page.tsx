"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
  Trophy,
  Flame,
  Sparkles,
  Lightbulb,
  Award,
} from "lucide-react";
import { StatCard } from "@/components/analytics/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import type { UsageTotals } from "@/lib/types/app";

const RANGES: { id: UsageTotals["range"]; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 Days" },
  { id: "30d", label: "30 Days" },
  { id: "90d", label: "90 Days" },
  { id: "lifetime", label: "Lifetime" },
];

export default function AnalyticsPage() {
  const [totals, setTotals] = useState<UsageTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<UsageTotals["range"]>("30d");

  useEffect(() => {
    // Real signal used by the chat page's onboarding checklist ("View analytics" step) —
    // set once the user actually lands here, never fabricated.
    localStorage.setItem("mm_visited_analytics", "1");
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?range=${range}`)
      .then((r) => r.json())
      .then((data) => setTotals(data.totals))
      .catch(() => toast.error("Could not load analytics right now."))
      .finally(() => setLoading(false));
  }, [range]);

  const mostUsedModel = totals?.model_insights[0]?.model ?? "—";
  const avgCostPerChat = totals && totals.total_chats > 0 ? totals.total_cost_usd / totals.total_chats : 0;

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto p-6 sm:p-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Usage, cost, and cache savings across all your research.</p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border border-border p-1">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                range === r.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading || !totals ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <>
          {/* Section 1 — Overview cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard icon={MessageSquare} label="Total chats" value={formatNumber(totals.total_chats)} />
            <StatCard icon={FileText} label="Reports generated" value={formatNumber(totals.reports_generated)} />
            <StatCard icon={Coins} label="Credits remaining" value={formatNumber(totals.credits_remaining)} />
            <StatCard icon={DollarSign} label="Lifetime spend" value={formatCurrency(totals.total_cost_usd)} />
            <StatCard icon={DollarSign} label="Avg cost / research" value={formatCurrency(avgCostPerChat)} />
            <StatCard icon={Sparkles} label="Most used model" value={mostUsedModel} />
            <StatCard
              icon={PiggyBank}
              label="Cache savings"
              value={formatCurrency(totals.cache_savings_usd)}
              hint="vs. no caching"
            />
            <StatCard icon={Flame} label="Research streak" value={`${totals.streak_days}d`} />
          </div>

          {/* Section 2 — Usage charts */}
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Daily research volume</CardTitle>
              </CardHeader>
              <CardContent>
                {totals.daily.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={totals.daily}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="chats" name="Chats" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost trend</CardTitle>
              </CardHeader>
              <CardContent>
                {totals.daily.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={totals.daily}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                      <Line type="monotone" dataKey="cost_usd" name="Cost" stroke="var(--primary)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost per model</CardTitle>
              </CardHeader>
              <CardContent>
                {totals.by_model.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
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
                <CardTitle>Credits purchased vs. consumed</CardTitle>
              </CardHeader>
              <CardContent>
                {totals.credits_purchased === 0 && totals.credits_consumed === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={[
                        { label: "Purchased", value: totals.credits_purchased },
                        { label: "Consumed", value: totals.credits_consumed },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
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
                  <ResponsiveContainer width="100%" height={220}>
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

          {/* Section 3 — Model insights */}
          {totals.model_insights.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Model insights
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {totals.model_insights.map((m) => (
                  <Card key={m.model} className="p-4">
                    <p className="font-medium">{m.model}</p>
                    <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                      <span>Requests</span>
                      <span className="tabular-nums text-foreground">{formatNumber(m.requests)}</span>
                    </div>
                    <div className="mt-1 flex justify-between text-sm text-muted-foreground">
                      <span>Avg cost</span>
                      <span className="tabular-nums text-foreground">{formatCurrency(m.avg_cost_usd)}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Section 4 — Founder insights */}
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Trophy className="h-4 w-4 text-primary" /> Founder insights
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <InsightRow label="Most active day" value={totals.founder_insights.most_active_day ?? "Not enough data yet"} />
                <InsightRow label="Most expensive model" value={totals.founder_insights.most_expensive_model ?? "—"} />
                <InsightRow label="Cheapest model" value={totals.founder_insights.cheapest_model ?? "—"} />
                <InsightRow
                  label="Average report length"
                  value={
                    totals.founder_insights.average_report_words
                      ? `${formatNumber(totals.founder_insights.average_report_words)} words`
                      : "No reports yet"
                  }
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-primary" /> This week
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <InsightRow label="Chats" value={`+${formatNumber(totals.weekly.chats)}`} />
                <InsightRow label="Reports" value={`+${formatNumber(totals.weekly.reports)}`} />
                <InsightRow label="Spent" value={`+${formatCurrency(totals.weekly.cost_usd)}`} />
              </CardContent>
            </Card>
          </div>

          {/* Year in Review — only meaningful once "Lifetime" is selected, all real totals */}
          {range === "lifetime" && (
            <Card className="mt-6 border-primary/30 bg-primary/5 p-5">
              <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
                <Trophy className="h-4 w-4 text-primary" /> Your MicroManus Highlights
              </p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-2xl font-bold tabular-nums">{formatNumber(totals.total_chats)}</p>
                  <p className="text-xs text-muted-foreground">Chats</p>
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{formatNumber(totals.reports_generated)}</p>
                  <p className="text-xs text-muted-foreground">Reports</p>
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">
                    {formatNumber(totals.input_tokens + totals.output_tokens)}
                  </p>
                  <p className="text-xs text-muted-foreground">Tokens</p>
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{formatCurrency(totals.total_cost_usd)}</p>
                  <p className="text-xs text-muted-foreground">Spent</p>
                </div>
              </div>
            </Card>
          )}

          {/* Section 5 — Cost optimization tip */}
          {totals.cost_tip && (
            <Card className="mt-6 flex items-start gap-3 border-primary/30 bg-primary/5 p-4">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm">{totals.cost_tip}</p>
            </Card>
          )}

          {/* Achievement badges */}
          <div className="mt-6">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-medium uppercase tracking-wide text-muted-foreground">
              <Award className="h-3.5 w-3.5" /> Achievements
            </h2>
            <div className="flex flex-wrap gap-2">
              {totals.badges.map((b) => (
                <Badge key={b.id} variant={b.earned ? "success" : "secondary"} className={cn(!b.earned && "opacity-50")}>
                  {b.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Raw token/cache stats (kept from the original dashboard) */}
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatCard icon={ArrowDownToLine} label="Input tokens" value={formatNumber(totals.input_tokens)} />
            <StatCard icon={ArrowUpFromLine} label="Output tokens" value={formatNumber(totals.output_tokens)} />
            <StatCard icon={Database} label="Cache tokens" value={formatNumber(totals.cached_tokens)} />
          </div>
        </>
      )}
    </div>
  );
}

function InsightRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[220px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
      No usage yet — start a research chat to see analytics here.
    </div>
  );
}
