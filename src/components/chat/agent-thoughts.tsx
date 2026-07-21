"use client";

import { useState } from "react";
import { ChevronDown, Brain, Search, CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentThought } from "@/lib/types/app";

const ICONS: Record<AgentThought["type"], typeof Brain> = {
  thinking: Brain,
  tool_call: Search,
  tool_result: CheckCircle2,
  final: Sparkles,
};

export function AgentThoughts({ thoughts, live }: { thoughts: AgentThought[]; live?: boolean }) {
  const [open, setOpen] = useState(!!live);
  if (thoughts.length === 0) return null;

  return (
    <div className="mb-3 rounded-lg border border-border bg-muted/50">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-muted-foreground cursor-pointer"
      >
        <Brain className="h-3.5 w-3.5" />
        Agent thoughts ({thoughts.length})
        {live && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />}
        <ChevronDown className={cn("ml-auto h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="flex flex-col gap-2 border-t border-border px-3 py-2">
          {thoughts.map((t, i) => {
            const Icon = ICONS[t.type] ?? Brain;
            return (
              <div key={i} className="flex items-start gap-2 text-xs animate-fade-in-up">
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="text-muted-foreground">{t.text}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
