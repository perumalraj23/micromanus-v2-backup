"use client";

import { Clock, Search, FileSearch, FileText, CheckCircle2, Sparkles } from "lucide-react";
import type { AgentTimelineEvent } from "@/lib/types/app";

function iconFor(label: string) {
  if (label.startsWith("Search")) return Search;
  if (label.startsWith("Read")) return FileSearch;
  if (label.startsWith("Generated")) return FileText;
  if (label === "Answer ready") return CheckCircle2;
  return Sparkles;
}

export function ResearchTimeline({ events }: { events: AgentTimelineEvent[] }) {
  if (events.length === 0) return null;

  return (
    <div className="mb-3 rounded-lg border border-border p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Clock className="h-3.5 w-3.5" /> Research timeline
      </p>
      <ol className="flex flex-col gap-2">
        {events.map((e, i) => {
          const Icon = iconFor(e.label);
          const isLast = i === events.length - 1;
          return (
            <li key={i} className="flex items-start gap-2 text-xs animate-fade-in-up">
              <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${isLast ? "text-emerald-500" : "text-primary"}`} />
              <span className="w-14 shrink-0 tabular-nums text-muted-foreground">
                {new Date(e.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span>
                {e.label}
                {e.detail && <span className="text-muted-foreground"> — {e.detail}</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
