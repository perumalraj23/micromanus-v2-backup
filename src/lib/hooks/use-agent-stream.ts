"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { humanizeError } from "@/lib/utils";
import type { AgentThought, AgentTimelineEvent, ReportSummary } from "@/lib/types/app";

export type StreamingAssistant = {
  content: string;
  thoughts: AgentThought[];
  timeline: AgentTimelineEvent[];
  report: ReportSummary | null;
};

const emptyStreaming: StreamingAssistant = { content: "", thoughts: [], timeline: [], report: null };

/**
 * Sends a message to the agent endpoint and incrementally parses the text/event-stream
 * response (fetch + ReadableStream, since POST bodies aren't supported by EventSource).
 */
export function useAgentStream() {
  const [streaming, setStreaming] = useState<StreamingAssistant | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (
      chatId: string,
      content: string,
      onComplete: (result: StreamingAssistant & { messageId?: string; reportId?: string | null }) => void,
      onError: (message: string) => void
    ) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);
      setStreaming({ ...emptyStreaming });

      let buffer = "";
      const state: StreamingAssistant = { content: "", thoughts: [], timeline: [], report: null };

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId, content }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({}));
          const message = data.error ?? "Something went wrong. Please try again.";
          onError(message);
          setIsStreaming(false);
          setStreaming(null);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const lines = part.split("\n");
            const eventLine = lines.find((l) => l.startsWith("event:"));
            const dataLine = lines.find((l) => l.startsWith("data:"));
            if (!eventLine || !dataLine) continue;

            const eventName = eventLine.replace("event:", "").trim();
            const payload = JSON.parse(dataLine.replace("data:", "").trim());

            if (eventName === "thought") {
              state.thoughts = [...state.thoughts, payload];
            } else if (eventName === "timeline") {
              state.timeline = [...state.timeline, payload];
            } else if (eventName === "token") {
              state.content += payload.text;
            } else if (eventName === "report") {
              state.report = payload;
            } else if (eventName === "error") {
              onError(humanizeError(new Error(payload.message)));
            } else if (eventName === "complete") {
              onComplete({ ...state, messageId: payload.messageId, reportId: payload.reportId });
            }
            setStreaming({ ...state });
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          onError(humanizeError(err));
          toast.error(humanizeError(err));
        }
      } finally {
        setIsStreaming(false);
        setStreaming(null);
      }
    },
    []
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { streaming, isStreaming, send, stop };
}
