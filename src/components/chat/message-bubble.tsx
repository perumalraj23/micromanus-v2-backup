"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";
import { Copy, Check, Sparkles, User, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AgentThoughts } from "@/components/chat/agent-thoughts";
import { ResearchTimeline } from "@/components/chat/research-timeline";
import { ReportCard } from "@/components/chat/report-card";
import type { ChatMessage } from "@/lib/types/app";
import { cn } from "@/lib/utils";

export function MessageBubble({
  message,
  onFollowUp,
  onRegenerate,
}: {
  message: ChatMessage;
  onFollowUp?: (question: string) => void;
  onRegenerate?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  function copy() {
    navigator.clipboard.writeText(message.content ?? "");
    setCopied(true);
    toast.success("Copied to clipboard.");
    setTimeout(() => setCopied(false), 1500);
  }

  if (isUser) {
    return (
      <div className="mb-6 flex justify-end animate-fade-in-up">
        <div className="flex max-w-[85%] items-start gap-2 sm:max-w-[70%]">
          <div className="rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
            {message.content}
          </div>
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
            <User className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 flex justify-start animate-fade-in-up">
      <div className="flex w-full max-w-[95%] items-start gap-2 sm:max-w-[85%]">
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <ResearchTimeline events={message.timeline} />
          <AgentThoughts thoughts={message.thoughts} />
          {message.report && <ReportCard report={message.report} reportId={message.report_id} />}

          <div className={cn("rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm")}>
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content || ""}</ReactMarkdown>
            </div>
          </div>

          {message.content && (
            <div className="mt-1.5 flex items-center gap-1">
              <button
                onClick={copy}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted cursor-pointer"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  Regenerate
                </button>
              )}
            </div>
          )}

          {onFollowUp && message.content && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["Explain further", "What are the risks?", "Summarize in 3 bullets"].map((q) => (
                <button
                  key={q}
                  onClick={() => onFollowUp(q)}
                  className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
