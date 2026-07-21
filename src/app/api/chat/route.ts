import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { getActiveModelConfig } from "@/lib/agent/config";
import { runAgentLoop, type AgentEvent } from "@/lib/agent/loop";
import { estimateCost } from "@/lib/pricing";
import { humanizeError, truncate } from "@/lib/utils";
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
    console.log("USER =", user);
console.log("PROFILE =", profile);

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
    return Response.json({ error: "Could not save your message. Please try again." }, { status: 500 });
  }

  await admin.from("profiles").update({ credits: profile.credits - 1 }).eq("id", user.id);

  if (chat.title === "New research") {
    await admin.from("chats").update({ title: truncate(content, 60) }).eq("id", chatId);
  }

  const conversation = [...(history ?? []), { role: "user" as const, content }].map((m) => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content ?? "",
  }));

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => controller.enqueue(encoder.encode(sse(event, data)));

      let fullText = "";
      const thoughts: AgentThought[] = [];
      const timeline: AgentTimelineEvent[] = [];
      let report: ReportSummary | null = null;
      let usage = { input_tokens: 0, output_tokens: 0, cached_tokens: 0 };
      let errored = false;

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
              break;
            case "error":
              errored = true;
              send("error", { message: humanizeError(new Error(event.message)) });
              break;
          }
        }
      } catch (err) {
        errored = true;
        send("error", { message: humanizeError(err) });
      }

      if (!errored) {
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
      } else {
        // Refund the credit if the loop failed before producing any usable output.
        await admin.from("profiles").update({ credits: profile.credits }).eq("id", user.id);
      }

      controller.close();
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
