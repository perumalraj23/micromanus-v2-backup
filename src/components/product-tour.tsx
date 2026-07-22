"use client";

import { useEffect, useState } from "react";
import { X, Sidebar as SidebarIcon, Brain, BarChart3, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

const SEEN_KEY = "mm_tour_seen";

const STEPS = [
  {
    icon: SidebarIcon,
    title: "Your research hub",
    body: "Every conversation lives in the sidebar. Press ⌘/Ctrl+K anytime to jump between chats, analytics, and settings instantly.",
  },
  {
    icon: Brain,
    title: "Watch the agent think",
    body: "This is your Research Timeline. Watch MicroManus think in real time — searching the web, reasoning, and refining its answer step by step.",
  },
  {
    icon: FileText,
    title: "Executive reports, on demand",
    body: "Ask for a summary or analysis and MicroManus turns it into a polished report you can export as a PDF from the Reports page.",
  },
  {
    icon: BarChart3,
    title: "Track your usage",
    body: "Analytics shows real cost, token usage, and cache savings across every model you've connected.",
  },
];

/**
 * A lightweight, one-time modal tour for first-time users — gated by localStorage so it only
 * ever appears once per browser. Deliberately a simple sequential modal rather than a DOM
 * spotlight/overlay library, per the "no unnecessary dependencies" constraint.
 */
export function ProductTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (localStorage.getItem(SEEN_KEY) !== "1") {
      setOpen(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(SEEN_KEY, "1");
    setOpen(false);
  }

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-popover p-6 shadow-2xl animate-fade-in-up">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <current.icon className="h-5 w-5 text-primary" />
          </div>
          <button
            onClick={dismiss}
            aria-label="Close tour"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 className="text-base font-semibold">{current.title}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">{current.body}</p>

        <div className="mt-5 flex items-center justify-between">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${i === step ? "bg-primary" : "bg-border"}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={dismiss}>
              Skip
            </Button>
            <Button
              size="sm"
              onClick={() => (isLast ? dismiss() : setStep((s) => s + 1))}
            >
              {isLast ? "Get started" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
