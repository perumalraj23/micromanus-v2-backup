"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  BarChart3,
  Settings,
  Plus,
  FileText,
  CreditCard,
  MessageSquare,
  CornerDownLeft,
  HelpCircle,
} from "lucide-react";
import { useChats } from "@/components/chat/chats-provider";
import { cn, truncate } from "@/lib/utils";

type Action = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  perform: () => void;
  keywords?: string;
};

/**
 * Global Cmd/Ctrl+K command palette. Mounted once near the root of the authenticated app shell
 * so the shortcut works from any page (chat, analytics, settings, reports).
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { chats, createChat } = useChats();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const staticActions: Action[] = useMemo(
    () => [
      { id: "new-chat", label: "Create New Chat", icon: Plus, perform: () => createChat() },
      { id: "analytics", label: "Open Analytics", icon: BarChart3, perform: () => router.push("/analytics") },
      { id: "reports", label: "View Reports", icon: FileText, perform: () => router.push("/reports") },
      { id: "settings", label: "Open Settings", icon: Settings, perform: () => router.push("/settings") },
      { id: "billing", label: "Open Billing", icon: CreditCard, perform: () => router.push("/settings#billing") },
      { id: "help", label: "Open Help Center", icon: HelpCircle, perform: () => router.push("/help") },
    ],
    [createChat, router]
  );

  const chatActions: Action[] = useMemo(
    () =>
      chats.slice(0, 8).map((c) => ({
        id: `chat-${c.id}`,
        label: truncate(c.title, 48),
        icon: MessageSquare,
        perform: () => router.push(`/chat/${c.id}`),
        keywords: "search chats",
      })),
    [chats, router]
  );

  const results = useMemo(() => {
    const all = [...staticActions, ...chatActions];
    if (!query.trim()) return all;
    const q = query.toLowerCase();
    return all.filter((a) => a.label.toLowerCase().includes(q) || a.keywords?.includes(q));
  }, [query, staticActions, chatActions]);

  function run(action: Action) {
    action.perform();
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[15vh]" onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-popover shadow-2xl animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && results[activeIndex]) {
                e.preventDefault();
                run(results[activeIndex]);
              }
            }}
            placeholder="Search chats, or jump to Analytics, Settings, Reports…"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">Esc</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">No matches.</p>
          ) : (
            results.map((action, i) => (
              <button
                key={action.id}
                onClick={() => run(action)}
                onMouseEnter={() => setActiveIndex(i)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm cursor-pointer",
                  i === activeIndex ? "bg-muted" : "hover:bg-muted/50"
                )}
              >
                <action.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{action.label}</span>
                {i === activeIndex && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
              </button>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
          <span>
            <kbd className="rounded border border-border px-1 py-0.5">↑↓</kbd> navigate ·{" "}
            <kbd className="rounded border border-border px-1 py-0.5">↵</kbd> select ·{" "}
            <kbd className="rounded border border-border px-1 py-0.5">esc</kbd> close
          </span>
          <span className="opacity-40">Built for Siddarth Jain</span>
        </div>
      </div>
    </div>
  );
}
