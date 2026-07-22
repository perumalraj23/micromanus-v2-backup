"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, KeyRound, Star, Loader2, Receipt } from "lucide-react";
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

export default function SettingsPage() {
  const [configs, setConfigs] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [billing, setBilling] = useState<BillingHistory | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);

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

  async function save() {
    if (!form.base_url || !form.model || !form.api_key) {
      toast.error("Please fill in the endpoint, model, and API key.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/model-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, is_default: configs.length === 0 }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save that model configuration.");
        return;
      }
      toast.success("Model configuration saved.");
      setOpen(false);
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

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto p-6 sm:p-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Bring your own OpenAI-compatible API key for GPT, Claude, or Kimi models.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> Add model
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a model configuration</DialogTitle>
              <DialogDescription>Your API key is encrypted at rest and never shown again.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
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
              <div>
                <Label>Label</Label>
                <Input
                  className="mt-1"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                />
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
                  <KeyRound className="h-3.5 w-3.5" /> API key
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

      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">Model Configurations</h2>
      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : configs.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No model configured yet. Add your OpenAI, Claude, or Kimi API key to start researching.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {configs.map((c) => (
            <Card key={c.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {c.label}
                    {c.is_default && (
                      <Badge variant="success">
                        <Star className="mr-1 h-3 w-3" /> Default
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {c.model} · {c.base_url}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  {!c.is_default && (
                    <Button variant="outline" size="sm" onClick={() => setDefault(c.id)}>
                      Set default
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => remove(c.id)} aria-label="Remove">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-xs text-muted-foreground">{c.masked_key}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
