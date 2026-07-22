"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Sparkles,
  BarChart3,
  Settings,
  FileText,
  Plus,
  Check,
  X,
  Clock,
  MessageSquare,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useChats } from "@/components/chat/chats-provider";

const DISMISS_KEY = "mm_setup_dismissed";
const VISITED_ANALYTICS_KEY = "mm_visited_analytics";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Shown above the suggested prompts on a brand-new (message-less) chat. Combines a
 * personalized greeting, a real-data setup checklist, quick actions, and recent activity —
 * all derived from actual API responses, never fabricated. The checklist auto-hides for
 * returning users once every step is complete (or once manually dismissed).
 */
export function OnboardingPanel() {
  const { chats, createChat } = useChats();
  const router = useRouter();
  const [userName, setUserName] = useState("Researcher");
  const [hasModel, setHasModel] = useState<boolean | null>(null);
  const [reportsCount, setReportsCount] = useState<number | null>(null);
  const [reportsThisWeek, setReportsThisWeek] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [visitedAnalytics, setVisitedAnalytics] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    setVisitedAnalytics(localStorage.getItem(VISITED_ANALYTICS_KEY) === "1");
  }, []);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => setUserName(data.profile?.full_name ?? data.profile?.email ?? "Researcher"))
      .catch(() => {});
    fetch("/api/model-configs")
      .then((r) => r.json())
      .then((data) => setHasModel((data.configs ?? []).length > 0))
      .catch(() => setHasModel(false));
    fetch("/api/reports")
      .then((r) => r.json())
      .then((data) => setReportsCount((data.reports ?? []).length))
      .catch(() => setReportsCount(0));
    fetch("/api/analytics?range=7d")
      .then((r) => r.json())
      .then((data) => setReportsThisWeek(data.totals?.weekly?.reports ?? 0))
      .catch(() => setReportsThisWeek(null));
  }, []);

  // A chat only counts as "researched" once it's been updated well after creation — the
  // assistant message save path bumps updated_at, so a >5s gap is a reliable signal that a
  // real research turn happened (vs. just the initial insert).
  const hasResearched = chats.some(
    (c) => new Date(c.updated_at).getTime() - new Date(c.created_at).getTime() > 5000
  );
  const hasReport = (reportsCount ?? 0) > 0;

  const steps = [
    { label: "Add your AI model", done: hasModel === true, action: () => router.push("/settings") },
    { label: "Start your first research", done: hasResearched, action: () => createChat() },
    { label: "Generate a report", done: hasReport, action: () => createChat() },
    { label: "View analytics", done: visitedAnalytics, action: () => router.push("/analytics") },
  ];
  const completed = steps.filter((s) => s.done).length;
  const showChecklist = hasModel !== null && reportsCount !== null && !dismissed && completed < steps.length;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  const recentChats = [...chats].sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at)).slice(0, 3);

  return (
    <div className="mb-8 w-full max-w-2xl text-left">
      <h2 className="text-lg font-semibold">
        {greeting()}, {userName.split(" ")[0]}.
      </h2>
      {reportsThisWeek !== null && reportsThisWeek > 0 && (
        <p className="mt-0.5 text-sm text-muted-foreground">
          Welcome back. You generated {reportsThisWeek} report{reportsThisWeek === 1 ? "" : "s"} this week.
        </p>
      )}

      {showChecklist && (
        <Card className="relative mt-3 p-4">
          <button
            onClick={dismiss}
            aria-label="Dismiss setup checklist"
            className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <p className="mb-3 flex items-center gap-1.5 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" /> Complete Setup
            <span className="ml-auto mr-6 text-xs font-normal text-muted-foreground">
              {completed}/{steps.length} completed
            </span>
          </p>
          <div className="flex flex-col gap-1.5">
            {steps.map((s) => (
              <button
                key={s.label}
                onClick={s.action}
                disabled={s.done}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted disabled:cursor-default disabled:hover:bg-transparent cursor-pointer"
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    s.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-border"
                  }`}
                >
                  {s.done && <Check className="h-3 w-3" />}
                </span>
                <span className={s.done ? "text-muted-foreground line-through" : ""}>{s.label}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => createChat()}>
          <Plus className="h-3.5 w-3.5" /> New research
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push("/analytics")}>
          <BarChart3 className="h-3.5 w-3.5" /> Open Analytics
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push("/reports")}>
          <FileText className="h-3.5 w-3.5" /> View Reports
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push("/settings")}>
          <Settings className="h-3.5 w-3.5" /> Settings
        </Button>
      </div>

      {recentChats.length > 1 && (
        <div className="mt-4">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Clock className="h-3 w-3" /> Recent activity
          </p>
          <div className="flex flex-col gap-1">
            {recentChats.map((c) => (
              <button
                key={c.id}
                onClick={() => router.push(`/chat/${c.id}`)}
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted cursor-pointer"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{c.title}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(c.updated_at), { addSuffix: true })}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
