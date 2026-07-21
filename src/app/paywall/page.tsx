"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, CreditCard, Sparkles, Tag, Loader2 } from "lucide-react";

function PaywallInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [coupon, setCoupon] = useState("");
  const [applying, setApplying] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [confirming, setConfirming] = useState(false);

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
            toast.success(`Payment confirmed — you now have ${data.credits} credits!`);
            router.replace("/chat");
          }
        })
        .catch(() => toast.error("Could not confirm your payment. Please contact support."))
        .finally(() => setConfirming(false));
    } else if (status === "cancelled") {
      toast.info("Checkout cancelled. No charge was made.");
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

  async function startCheckout() {
    setCheckingOut(true);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Could not start checkout.");
        setCheckingOut(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("Something went wrong starting checkout. Please try again.");
      setCheckingOut(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl">Unlock MicroManus</CardTitle>
          <CardDescription>Get 5 research credits to start your first deep-dive.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {confirming && (
            <div className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm text-primary">
              <Loader2 className="h-4 w-4 animate-spin" /> Confirming your payment…
            </div>
          )}

          <ul className="flex flex-col gap-2 text-sm">
            {[
              "5 deep-research credits",
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

          <Button size="lg" onClick={startCheckout} disabled={checkingOut}>
            {checkingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            Pay $5 (Stripe sandbox)
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Test card: 4242 4242 4242 4242 · any future date · any CVC
          </p>
        </CardContent>
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
