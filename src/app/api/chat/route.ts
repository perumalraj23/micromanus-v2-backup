import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { getActiveModelConfig } from "@/lib/agent/config";
import { runAgentLoop, type AgentEvent } from "@/lib/agent/loop";
import { estimateCost } from "@/lib/pricing";
import { humanizeError, truncate } from "@/lib/utils";
import { logger, newRequestId } from "@/lib/logger";
import { recordRequest, recordFailure } from "@/lib/metrics";
import type { AgentThought, AgentTimelineEvent, ReportSummary } from "@/lib/types/app";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  chatId: z.string().uuid(),
  content: z.string().trim().min(1, "Message cannot be empty").max(8000, "Message is too long"),
});

function sse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Please sign in to continue." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    );
  }
  const { chatId, content } = parsed.data;

  const admin = createAdminClient();

  const { data: chat } = await admin
    .from("chats")
    .select("id, user_id, title")
    .eq("id", chatId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!chat) {
    return Response.json({ error: "Chat not found." }, { status: 404 });
  }

  const rateLimit = await checkRateLimit(user.id);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "You're sending messages too quickly. Please wait a few seconds and try again." },
      { status: 429 }
    );
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("credits, has_paid")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.has_paid || profile.credits <= 0) {
    return Response.json(
      {
        error: "You're out of credits. Add more to keep researching.",
        code: "NO_CREDITS",
      },
      { status: 402 }
    );
  }

  const active = await getActiveModelConfig(user.id);
  if (!active) {
    return Response.json(
      {
        error: "Add a model API key in Settings before starting a research session.",
        code: "NO_MODEL_CONFIG",
      },
      { status: 400 }
    );
  }

  const { data: history } = await admin
    .from("messages")
    .select("role, content")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true })
    .limit(40);

  const { data: userMessage, error: insertUserErr } = await admin
    .from("messages")
    .insert({ chat_id: chatId, role: "user", content })
    .select("id, created_at")
    .single();
  if (insertUserErr || !userMessage) {
    logger.error("chat.save_user_message_failed", { requestId, route: "/api/chat" });
    return Response.json({ error: "Could not save your message. Please try again." }, { status: 500 });
  }

  // Atomic, race-safe decrement — fails (returns null) if another concurrent request already
  // spent the last credit, instead of computing `credits - 1` from a possibly-stale read.
  const { data: newCredits, error: decrementErr } = await admin.rpc("decrement_credit", {
    p_user_id: user.id,
    p_reason: "research_query",
  });
  if (decrementErr || newCredits === null) {
    logger.warn("chat.no_credits", { requestId, route: "/api/chat" });
    return Response.json(
      { error: "You're out of credits. Add more to keep researching.", code: "NO_CREDITS" },
      { status: 402 }
    );
  }

  if (chat.title === "New research") {
    await admin.from("chats").update({ title: truncate(content, 60) }).eq("id", chatId);
  }

  const conversation = [...(history ?? []), { role: "user" as const, content }].map((m) => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content ?? "",
  }));

  let refunded = false;
  const refundOnce = async (reason: string) => {
    if (refunded) return;
    refunded = true;
    const { error } = await admin.rpc("refund_credit", { p_user_id: user.id, p_reason: reason });
    if (error) logger.error("chat.refund_failed", { requestId, route: "/api/chat", reason });
    else logger.info("chat.refunded", { requestId, route: "/api/chat", reason });
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const startedAt = Date.now();
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(sse(event, data)));
        } catch {
          // Client already disconnected; nothing to do, cancel() handles the refund.
        }
      };

      let fullText = "";
      const thoughts: AgentThought[] = [];
      const timeline: AgentTimelineEvent[] = [];
      let report: ReportSummary | null = null;
      let usage = { input_tokens: 0, output_tokens: 0, cached_tokens: 0 };
      let errored = false;
      let empty = false;
      let incomplete = false;

      try {
        for await (const event of runAgentLoop({
          apiKey: active.apiKey,
          baseUrl: active.config.base_url,
          model: active.config.model,
          history: conversation,
        }) as AsyncGenerator<AgentEvent>) {
          switch (event.type) {
            case "thought":
              thoughts.push(event.thought);
              send("thought", event.thought);
              break;
            case "timeline":
              timeline.push(event.event);
              send("timeline", event.event);
              break;
            case "token":
              fullText += event.text;
              send("token", { text: event.text });
              break;
            case "report":
              report = event.report;
              send("report", event.report);
              break;
            case "done":
              usage = event.usage;
              incomplete = Boolean(event.incomplete);
              break;
            case "empty":
              empty = true;
              break;
            case "error":
              errored = true;
              send("error", { message: humanizeError(new Error(event.message)) });
              break;
          }
        }
      } catch (err) {
        errored = true;
        logger.error("chat.agent_loop_threw", { requestId, route: "/api/chat" });
        send("error", { message: humanizeError(err) });
      }

      // A report on its own counts as a genuinely useful result even if the loop hit the
      // step limit right after producing it, so we only treat it as incomplete when there's
      // truly nothing to show the user.
      const producedValue = Boolean(report) || (fullText.trim().length > 0 && !empty);

      if (incomplete && !producedValue) recordFailure("timeout");

      if (errored || empty || (incomplete && !producedValue)) {
        await refundOnce(errored ? "agent_error" : empty ? "empty_response" : "max_iterations");
        if (empty && !errored) {
          send("error", {
            message: "The model didn't return a usable answer that time. Your credit was refunded — please try again.",
          });
        }
      } else {
        const { cost_usd, cache_savings_usd } = estimateCost(
          active.config.model,
          usage.input_tokens,
          usage.output_tokens,
          usage.cached_tokens
        );

        const { data: assistantMessage } = await admin
          .from("messages")
          .insert({
            chat_id: chatId,
            role: "assistant",
            content: fullText,
            thoughts,
            timeline,
            report,
            model: active.config.model,
            provider: active.config.provider,
          })
          .select("id")
          .single();

        await admin.from("usage_events").insert({
          user_id: user.id,
          chat_id: chatId,
          message_id: assistantMessage?.id ?? null,
          provider: active.config.provider,
          model: active.config.model,
          input_tokens: usage.input_tokens,
          output_tokens: usage.output_tokens,
          cached_tokens: usage.cached_tokens,
          cost_usd,
          cache_savings_usd,
        });

        if (report) {
          await admin.from("reports").insert({
            user_id: user.id,
            chat_id: chatId,
            message_id: assistantMessage?.id ?? null,
            title: report.tldr ? truncate(report.tldr, 80) : "Research report",
            summary: report,
          });
        }

        await admin.from("chats").update({ updated_at: new Date().toISOString() }).eq("id", chatId);

        const { data: reportRow } = report
          ? await admin
              .from("reports")
              .select("id")
              .eq("message_id", assistantMessage?.id ?? "")
              .maybeSingle()
          : { data: null };

        send("complete", { messageId: assistantMessage?.id, reportId: reportRow?.id ?? null, usage, cost_usd });
      }

      recordRequest(Date.now() - startedAt, errored || empty || (incomplete && !producedValue));

      try {
        controller.close();
      } catch {
        // Already closed by a cancel() race; safe to ignore.
      }
    },
    // Fires when the client aborts the fetch (navigates away, calls stop()). Without this,
    // an aborted request would silently keep the spent credit even though no answer was ever
    // delivered.
    async cancel() {
      logger.info("chat.client_aborted", { requestId, route: "/api/chat" });
      await refundOnce("client_abort");
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
