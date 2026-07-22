"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, CreditCard, Sparkles, Tag, Loader2 } from "lucide-react";
import { PAYMENT_PACKS, type PaymentPackId } from "@/lib/stripe";

function PaywallInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [coupon, setCoupon] = useState("");
  const [applying, setApplying] = useState(false);
  const [checkingOutPack, setCheckingOutPack] = useState<PaymentPackId | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState<{ credits: number; alreadyProcessed: boolean } | null>(null);

  useEffect(() => {
    const status = params.get("checkout");
    const sessionId = params.get("session_id");

    if (status === "success" && sessionId) {
      setConfirming(true);
      fetch(`/api/billing/confirm?session_id=${sessionId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.error) {
            toast.error(data.error);
          } else {
            setConfirmed({ credits: data.credits, alreadyProcessed: Boolean(data.already_processed) });
          }
        })
        .catch(() => toast.error("Could not confirm your payment. Please contact support."))
        .finally(() => setConfirming(false));
    } else if (status === "cancelled") {
      toast.info("Payment cancelled. No money was charged.");
    }
  }, [params, router]);

  async function applyCoupon() {
    if (!coupon.trim()) {
      toast.error("Please enter a coupon code first.");
      return;
    }
    setApplying(true);
    try {
      const res = await fetch("/api/billing/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: coupon }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not apply that coupon.");
        return;
      }
      toast.success(`Coupon applied — you now have ${data.credits} credits!`);
      router.push("/chat");
      router.refresh();
    } catch {
      toast.error("Something went wrong applying your coupon. Please try again.");
    } finally {
      setApplying(false);
    }
  }

  async function startCheckout(packId: PaymentPackId) {
    setCheckingOutPack(packId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Could not start checkout.");
        setCheckingOutPack(null);
        return;
      }
      window.location.assign(data.url);
    } catch {
      toast.error("Something went wrong starting checkout. Please try again.");
      setCheckingOutPack(null);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        {confirmed ? (
          <CardContent className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {confirmed.alreadyProcessed ? "Payment already confirmed" : "Payment successful"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {confirmed.alreadyProcessed
                  ? "This checkout session was already applied to your account."
                  : "Credits have been added to your account."}
              </p>
            </div>
            <div className="w-full rounded-lg bg-accent px-4 py-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Current balance</span>
                <span className="font-semibold">{confirmed.credits} credits</span>
              </div>
            </div>
            <Button className="w-full" size="lg" onClick={() => router.push("/chat")}>
              Continue Researching
            </Button>
          </CardContent>
        ) : (
          <>
            <CardHeader className="items-center text-center">
              <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Sparkles className="h-5 w-5" />
              </div>
              <CardTitle className="text-xl">Unlock MicroManus</CardTitle>
              <CardDescription>Choose a credit pack to start your first deep-dive.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {confirming && (
                <div className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" /> Confirming your payment…
                </div>
              )}

              <ul className="flex flex-col gap-2 text-sm">
                {[
                  "Deep-research credits, any pack",
                  "Live web search & multi-step reasoning",
                  "Executive summaries & PDF reports",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> {item}
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-2">
                <Label htmlFor="coupon" className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" /> Have a coupon?
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="coupon"
                    placeholder="SID_DRDROID"
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                  />
                  <Button onClick={applyCoupon} disabled={applying} variant="secondary">
                    {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                  </Button>
                </div>
              </div>

              <div className="relative flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                OR
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="flex flex-col gap-2">
                {PAYMENT_PACKS.map((pack) => (
                  <button
                    key={pack.id}
                    onClick={() => startCheckout(pack.id)}
                    disabled={checkingOutPack !== null}
                    className="flex items-center justify-between rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted disabled:opacity-60"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {pack.label} · {pack.credits} credits
                      </p>
                      <p className="text-xs text-muted-foreground">{pack.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">${pack.amountUsd}</span>
                      {checkingOutPack === pack.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Test card: 4242 4242 4242 4242 · any future date · any CVC (Stripe sandbox)
              </p>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}

export default function PaywallPage() {
  return (
    <Suspense>
      <PaywallInner />
    </Suspense>
  );
}
