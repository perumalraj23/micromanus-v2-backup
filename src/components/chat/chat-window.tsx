"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, Square, Sparkles, Search, FlaskConical, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageBubble } from "@/components/chat/message-bubble";
import { AgentThoughts } from "@/components/chat/agent-thoughts";
import { ResearchTimeline } from "@/components/chat/research-timeline";
import { OnboardingPanel } from "@/components/onboarding-panel";
import { useAgentStream } from "@/lib/hooks/use-agent-stream";
import type { ChatMessage } from "@/lib/types/app";
import Link from "next/link";

const SUGGESTED_PROMPTS = [
  {
    icon: FlaskConical,
    label: "Analyze recent California wildfires and generate a report.",
  },
  {
    icon: ShieldAlert,
    label: "Analyze this Kubernetes CrashLoopBackOff issue and suggest remediation.",
  },
  {
    icon: Search,
    label: "Research the state of AI agent frameworks in 2026.",
  },
  {
    icon: Sparkles,
    label: "Compare the top 3 vector databases for a RAG pipeline.",
  },
];

export function ChatWindow({ chatId }: { chatId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const { streaming, isStreaming, send, stop } = useAgentStream();
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/chats/${chatId}/messages`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setMessages(data.messages ?? []);
      })
      .catch(() => toast.error("Could not load this conversation."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [chatId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || isStreaming) return;

    setInput("");
    const userMessage: ChatMessage = {
      id: `local-${Date.now()}`,
      chat_id: chatId,
      role: "user",
      content,
      thoughts: [],
      timeline: [],
      report: null,
      model: null,
      provider: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    await send(
      chatId,
      content,
      (result) => {
        setMessages((prev) => [
          ...prev,
          {
            id: result.messageId ?? `local-assistant-${Date.now()}`,
            chat_id: chatId,
            role: "assistant",
            content: result.content,
            thoughts: result.thoughts,
            timeline: result.timeline,
            report: result.report,
            report_id: result.reportId,
            model: null,
            provider: null,
            created_at: new Date().toISOString(),
          },
        ]);
        router.refresh();
      },
      (message) => {
        toast.error(message, {
          action:
            message.includes("credit") || message.includes("Add more")
              ? { label: "Add credits", onClick: () => router.push("/paywall") }
              : message.includes("API key") || message.includes("Settings")
                ? { label: "Open Settings", onClick: () => router.push("/settings") }
                : undefined,
        });
        // Errors (including empty responses) trigger a server-side refund — refresh so the
        // sidebar credit counter reflects the refund immediately instead of looking stale.
        router.refresh();
      }
    );
  }

  function handleStop() {
    stop();
    // The abort triggers an async server-side refund (ReadableStream.cancel()) — refresh
    // shortly after so the sidebar picks up the refunded credit once it lands.
    setTimeout(() => router.refresh(), 500);
  }

  const isEmpty = !loading && messages.length === 0 && !isStreaming;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-3xl">
          {loading && (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-16 w-2/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}

          {isEmpty && (
            <div className="flex flex-col items-center pt-10 text-center">
              <OnboardingPanel />
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Sparkles className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-semibold">What should MicroManus research today?</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Ask a question, request an analysis, or paste an incident to investigate. The agent
                will search the web and think in multiple steps before answering.
              </p>
              <div className="mt-6 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTED_PROMPTS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => handleSend(p.label)}
                    className="flex items-start gap-2 rounded-lg border border-border p-3 text-left text-sm hover:bg-muted cursor-pointer"
                  >
                    <p.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loading &&
            messages.map((m, i) => (
              <MessageBubble
                key={m.id}
                message={m}
                onFollowUp={(q) => handleSend(q)}
                onRegenerate={
                  m.role === "assistant" && !isStreaming
                    ? () => {
                        const precedingUser = [...messages.slice(0, i)].reverse().find((p) => p.role === "user");
                        if (precedingUser?.content) handleSend(precedingUser.content);
                      }
                    : undefined
                }
              />
            ))}

          {isStreaming && streaming && (
            <div className="mb-6 flex justify-start animate-fade-in-up">
              <div className="flex w-full max-w-[95%] items-start gap-2 sm:max-w-[85%]">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <ResearchTimeline events={streaming.timeline} />
                  <AgentThoughts thoughts={streaming.thoughts} live />
                  {streaming.content && (
                    <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm typing-cursor">
                      <span className="whitespace-pre-wrap">{streaming.content}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border p-4 sm:px-8">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                handleSend();
              } else if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask MicroManus to research something… (⌘/Ctrl+Enter to send)"
            rows={2}
            className="max-h-40 flex-1"
          />
          {isStreaming ? (
            <Button variant="destructive" size="icon" onClick={handleStop} aria-label="Stop generating">
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="icon" onClick={() => handleSend()} aria-label="Send message" disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-muted-foreground">
          Each research query uses 1 credit. Need more? <Link href="/paywall" className="underline">Add credits</Link>.
        </p>
      </div>
    </div>
  );
}
