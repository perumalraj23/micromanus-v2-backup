"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  KeyRound,
  Star,
  Loader2,
  Receipt,
  Pencil,
  Zap,
  CheckCircle2,
  XCircle,
  Trophy,
  Sparkles,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MODEL_PRESETS } from "@/lib/pricing";
import { PROVIDER_META, PROVIDER_CAPABILITIES, MODEL_RECOMMENDATIONS } from "@/lib/agent/model-catalog";
import { formatCurrency } from "@/lib/utils";
import type { ModelConfig, ModelProvider } from "@/lib/types/app";

type BillingHistory = {
  payments: {
    id: string;
    stripe_session_id: string | null;
    amount_usd: number | null;
    credits_added: number | null;
    status: string;
    created_at: string;
  }[];
  summary: {
    currentBalance: number;
    totalPaymentsUsd: number;
    totalResearchSessions: number;
    averageCostUsd: number;
  };
};

type TestResult = {
  success: boolean;
  latency_ms: number;
  tokens?: number;
  provider: string;
  model: string;
  error_type?: string;
  message: string;
};

const PROVIDERS: ModelProvider[] = ["openai", "anthropic", "kimi", "google", "xai", "openrouter", "groq", "custom"];

export default function SettingsPage() {
  const [configs, setConfigs] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [billing, setBilling] = useState<BillingHistory | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [verifyingAll, setVerifyingAll] = useState(false);

  const [presetId, setPresetId] = useState(MODEL_PRESETS[0].id);
  const [form, setForm] = useState({
    label: MODEL_PRESETS[0].label,
    provider: MODEL_PRESETS[0].provider as ModelProvider,
    base_url: MODEL_PRESETS[0].base_url,
    model: MODEL_PRESETS[0].model,
    api_key: "",
  });

  function loadConfigs() {
    setLoading(true);
    fetch("/api/model-configs")
      .then((r) => r.json())
      .then((data) => setConfigs(data.configs ?? []))
      .catch(() => toast.error("Could not load your model configurations."))
      .finally(() => setLoading(false));
  }

  useEffect(loadConfigs, []);

  useEffect(() => {
    setBillingLoading(true);
    fetch("/api/billing/history")
      .then((r) => r.json())
      .then((data) => setBilling(data))
      .catch(() => toast.error("Could not load your billing history."))
      .finally(() => setBillingLoading(false));
  }, []);

  function applyPreset(id: string) {
    setPresetId(id);
    const preset = MODEL_PRESETS.find((p) => p.id === id)!;
    setForm({
      label: preset.label,
      provider: preset.provider,
      base_url: preset.base_url,
      model: preset.model,
      api_key: "",
    });
  }

  function openAddDialog() {
    setEditingId(null);
    applyPreset(MODEL_PRESETS[0].id);
    setOpen(true);
  }

  function openEditDialog(c: ModelConfig) {
    setEditingId(c.id);
    setForm({ label: c.label, provider: c.provider, base_url: c.base_url, model: c.model, api_key: "" });
    setOpen(true);
  }

  async function save() {
    const isEdit = Boolean(editingId);
    if (!form.base_url || !form.model || (!isEdit && !form.api_key)) {
      toast.error("Please fill in the endpoint, model, and API key.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(isEdit ? `/api/model-configs/${editingId}` : "/api/model-configs", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit
            ? { label: form.label, provider: form.provider, base_url: form.base_url, model: form.model, ...(form.api_key ? { api_key: form.api_key } : {}) }
            : { ...form, is_default: configs.length === 0 }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save that model configuration.");
        return;
      }
      toast.success(isEdit ? "Model configuration updated." : "Model configuration saved.");
      setOpen(false);
      setEditingId(null);
      loadConfigs();
    } catch {
      toast.error("Could not save that model configuration. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const prev = configs;
    setConfigs((c) => c.filter((cfg) => cfg.id !== id));
    const res = await fetch(`/api/model-configs/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setConfigs(prev);
      toast.error("Could not remove that configuration.");
    } else {
      toast.success("Model configuration removed.");
    }
  }

  async function setDefault(id: string) {
    setConfigs((c) => c.map((cfg) => ({ ...cfg, is_default: cfg.id === id })));
    const res = await fetch(`/api/model-configs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ set_default: true }),
    });
    if (!res.ok) {
      toast.error("Could not update the default model.");
      loadConfigs();
    }
  }

  async function testConnection(id: string) {
    setTestingId(id);
    try {
      const res = await fetch(`/api/model-configs/${id}/test`, { method: "POST" });
      const data: TestResult = await res.json();
      setTestResults((prev) => ({ ...prev, [id]: data }));
      if (data.success) {
        toast.success(`Connected in ${data.latency_ms}ms`);
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Could not test that connection. Please try again.");
    } finally {
      setTestingId(null);
    }
  }

  async function verifyAll() {
    setVerifyingAll(true);
    for (const c of configs) {
      await testConnection(c.id);
    }
    setVerifyingAll(false);
  }

  const leaderboard = Object.entries(testResults)
    .filter(([, r]) => r.success)
    .map(([id, r]) => ({ id, label: configs.find((c) => c.id === id)?.label ?? r.model, latency_ms: r.latency_ms }))
    .sort((a, b) => a.latency_ms - b.latency_ms);

  const usageInsights =
    configs.length > 0
      ? {
          mostUsed: [...configs].sort((a, b) => (b.requests ?? 0) - (a.requests ?? 0))[0],
          mostExpensive: [...configs].sort((a, b) => (b.cost_usd ?? 0) - (a.cost_usd ?? 0))[0],
          cheapest: [...configs].filter((c) => (c.requests ?? 0) > 0).sort((a, b) => (a.cost_usd ?? 0) - (b.cost_usd ?? 0))[0],
        }
      : null;

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto p-6 sm:p-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Bring your own OpenAI-compatible API key for GPT, Claude, Gemini, Grok, OpenRouter, or Groq models.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setEditingId(null);
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4" /> Add model
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit model configuration" : "Add a model configuration"}</DialogTitle>
              <DialogDescription>Your API key is encrypted at rest and never shown again.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              {!editingId && (
                <div>
                  <Label>Provider preset</Label>
                  <select
                    className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
                    value={presetId}
                    onChange={(e) => applyPreset(e.target.value)}
                  >
                    {MODEL_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <Label>Label</Label>
                <Input
                  className="mt-1"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                />
              </div>
              <div>
                <Label>Provider</Label>
                <select
                  className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  value={form.provider}
                  onChange={(e) => setForm({ ...form, provider: e.target.value as ModelProvider })}
                >
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {PROVIDER_META[p].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Endpoint (base URL)</Label>
                <Input
                  className="mt-1"
                  placeholder="https://api.openai.com/v1"
                  value={form.base_url}
                  onChange={(e) => setForm({ ...form, base_url: e.target.value })}
                />
              </div>
              <div>
                <Label>Model name</Label>
                <Input
                  className="mt-1"
                  placeholder="gpt-4o-mini"
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                />
              </div>
              <div>
                <Label className="flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5" /> API key {editingId && "(leave blank to keep current key)"}
                </Label>
                <Input
                  className="mt-1"
                  type="password"
                  placeholder="sk-…"
                  value={form.api_key}
                  onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-8">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          <Receipt className="h-3.5 w-3.5" /> Billing
        </h2>
        {billingLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Current Balance</p>
                <p className="mt-1 text-lg font-semibold">{billing?.summary.currentBalance ?? 0} credits</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Total Payments</p>
                <p className="mt-1 text-lg font-semibold">${(billing?.summary.totalPaymentsUsd ?? 0).toFixed(2)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Research Sessions</p>
                <p className="mt-1 text-lg font-semibold">{billing?.summary.totalResearchSessions ?? 0}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Average Cost</p>
                <p className="mt-1 text-lg font-semibold">${(billing?.summary.averageCostUsd ?? 0).toFixed(4)}</p>
              </Card>
            </div>

            {billing && billing.payments.length > 0 && (
              <Card className="mt-3 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 font-medium">Date</th>
                        <th className="px-4 py-2 font-medium">Amount</th>
                        <th className="px-4 py-2 font-medium">Credits</th>
                        <th className="px-4 py-2 font-medium">Status</th>
                        <th className="px-4 py-2 font-medium">Payment ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billing.payments.map((p) => (
                        <tr key={p.id} className="border-t border-border">
                          <td className="px-4 py-2">{new Date(p.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-2">${Number(p.amount_usd ?? 0).toFixed(2)}</td>
                          <td className="px-4 py-2">{p.credits_added ?? 0}</td>
                          <td className="px-4 py-2">
                            <Badge variant={p.status === "completed" ? "success" : "default"}>{p.status}</Badge>
                          </td>
                          <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                            {p.stripe_session_id ? `${p.stripe_session_id.slice(0, 18)}…` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Model Configurations</h2>
        {configs.length > 1 && (
          <Button variant="outline" size="sm" onClick={verifyAll} disabled={verifyingAll}>
            {verifyingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />} Verify all
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : configs.length === 0 ? (
        <Card className="p-8">
          <p className="mb-4 text-center text-sm text-muted-foreground">
            No model configured yet. Follow these steps to start researching:
          </p>
          <ol className="mx-auto flex max-w-sm flex-col gap-2 text-sm">
            {["Add your API key.", "Test the connection.", "Set it as your active model.", "Start researching."].map(
              (step, i) => (
                <li key={i} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  {step}
                </li>
              )
            )}
          </ol>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {configs.map((c) => {
            const result = testResults[c.id];
            const capabilities = PROVIDER_CAPABILITIES[c.provider] ?? [];
            return (
              <Card key={c.id}>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="flex flex-wrap items-center gap-2">
                      {c.label}
                      {c.is_default && (
                        <Badge variant="success">
                          <Star className="mr-1 h-3 w-3" /> Active
                        </Badge>
                      )}
                      <Badge variant="secondary" className={PROVIDER_META[c.provider]?.color}>
                        {PROVIDER_META[c.provider]?.label ?? c.provider}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {c.model} · {c.base_url}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    {!c.is_default && (
                      <Button variant="outline" size="sm" onClick={() => setDefault(c.id)}>
                        Set active
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(c)} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(c.id)} aria-label="Remove">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <p className="font-mono text-xs text-muted-foreground">{c.masked_key}</p>

                  <div className="flex flex-wrap gap-1.5">
                    {capabilities.map((cap) => (
                      <Badge key={cap} variant="outline">
                        ✓ {cap}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span>Requests: {c.requests ?? 0}</span>
                    <span>Cost: {formatCurrency(c.cost_usd ?? 0)}</span>
                    {result?.success && <span>Latency: {result.latency_ms}ms</span>}
                  </div>

                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testConnection(c.id)}
                      disabled={testingId === c.id}
                    >
                      {testingId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                      Test Connection
                    </Button>
                  </div>

                  {result && (
                    <div
                      className={`rounded-lg border p-3 text-xs ${
                        result.success
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-destructive/30 bg-destructive/5"
                      }`}
                    >
                      <div className="mb-2 flex items-center gap-1.5 font-medium">
                        {result.success ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-destructive" />
                        )}
                        {result.success ? "Connected Successfully" : "Connection Failed"}
                      </div>
                      {result.success ? (
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <p className="text-muted-foreground">Latency</p>
                            <p className="font-medium">{result.latency_ms}ms</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Tokens</p>
                            <p className="font-medium">{result.tokens ?? 0}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Provider</p>
                            <p className="font-medium">{PROVIDER_META[c.provider]?.label ?? c.provider}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">{result.message}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {leaderboard.length > 1 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-amber-500" /> Latency Leaderboard
            </CardTitle>
            <CardDescription>From your most recent connection tests this session.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {leaderboard.map((entry, i) => (
              <div key={entry.id} className="flex items-center justify-between text-sm">
                <span>
                  {i + 1}. {entry.label}
                </span>
                <span className="font-medium">{entry.latency_ms}ms</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {usageInsights && (usageInsights.mostUsed?.requests ?? 0) > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="h-4 w-4 text-primary" /> Usage Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Most Used</p>
              <p className="font-medium">{usageInsights.mostUsed?.label}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Most Expensive</p>
              <p className="font-medium">{usageInsights.mostExpensive?.label}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cheapest</p>
              <p className="font-medium">{usageInsights.cheapest?.label ?? "—"}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" /> Recommended
          </CardTitle>
          <CardDescription>General guidance based on published provider capabilities.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">For Research</p>
            <p className="font-medium">{MODEL_RECOMMENDATIONS.forResearch.label}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">For Speed</p>
            <p className="font-medium">{MODEL_RECOMMENDATIONS.forSpeed.label}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">For Cost</p>
            <p className="font-medium">{MODEL_RECOMMENDATIONS.forCost.label}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Balanced</p>
            <p className="font-medium">{MODEL_RECOMMENDATIONS.forBalanced.label}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
