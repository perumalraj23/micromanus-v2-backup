"use client";

import { Clock } from "lucide-react";
import type { AgentTimelineEvent } from "@/lib/types/app";

export function ResearchTimeline({ events }: { events: AgentTimelineEvent[] }) {
  if (events.length === 0) return null;

  return (
    <div className="mb-3 rounded-lg border border-border p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Clock className="h-3.5 w-3.5" /> Research timeline
      </p>
      <ol className="flex flex-col gap-2">
        {events.map((e, i) => (
          <li key={i} className="flex items-start gap-2 text-xs animate-fade-in-up">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span className="w-14 shrink-0 tabular-nums text-muted-foreground">
              {new Date(e.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span>
              {e.label}
              {e.detail && <span className="text-muted-foreground"> — {e.detail}</span>}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
