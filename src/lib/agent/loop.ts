import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { AGENT_SYSTEM_PROMPT, TOOL_DEFINITIONS } from "@/lib/agent/prompt";
import { braveSearch } from "@/lib/agent/brave-search";
import { logger } from "@/lib/logger";
import type { AgentThought, AgentTimelineEvent, ReportSummary } from "@/lib/types/app";

export type AgentEvent =
  | { type: "thought"; thought: AgentThought }
  | { type: "timeline"; event: AgentTimelineEvent }
  | { type: "token"; text: string }
  | { type: "report"; report: ReportSummary }
  | {
      type: "done";
      usage: { input_tokens: number; output_tokens: number; cached_tokens: number };
      /** True when the loop hit the reasoning step limit without a normal final answer. */
      incomplete?: boolean;
    }
  /** The model returned an empty final answer with no tool calls and no report. */
  | { type: "empty" }
  | { type: "error"; message: string };

export type AgentLoopInput = {
  apiKey: string;
  baseUrl: string;
  model: string;
  history: { role: "user" | "assistant" | "system"; content: string }[];
};

const MAX_ITERATIONS = 6;
const now = () => new Date().toISOString();

/**
 * Runs the Think -> Tool Call -> Observe loop against any OpenAI-compatible chat completions
 * endpoint, emitting events as it goes so the UI can render live agent thoughts, a research
 * timeline, and a typed-out final answer.
 */
export async function* runAgentLoop(input: AgentLoopInput): AsyncGenerator<AgentEvent> {
  const client = new OpenAI({ apiKey: input.apiKey, baseURL: input.baseUrl });

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: AGENT_SYSTEM_PROMPT },
    ...input.history.map((m) => ({ role: m.role, content: m.content }) as ChatCompletionMessageParam),
  ];

  let totalInput = 0;
  let totalOutput = 0;
  let totalCached = 0;
  // Some OpenAI-compatible providers reject the `tools`/`tool_choice` params outright.
  // Once that happens we stop sending them for the rest of this run instead of failing.
  let toolsSupported = true;

  yield { type: "timeline", event: { time: now(), label: "Research started" } };

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    yield {
      type: "thought",
      thought: { time: now(), type: "thinking", text: "Thinking about the best next step…" },
    };

    let completion: OpenAI.Chat.Completions.ChatCompletion | undefined;
    let retryAttempt = 0;

    while (!completion) {
      try {
        completion = await client.chat.completions.create({
          model: input.model,
          messages,
          temperature: 0.3,
          ...(toolsSupported ? { tools: TOOL_DEFINITIONS, tool_choice: "auto" as const } : {}),
        });
      } catch (err) {
        const status = (err as { status?: number } | undefined)?.status;
        const message = err instanceof Error ? err.message : String(err);
        const lower = message.toLowerCase();
        const mentionsTools = lower.includes("tool") || lower.includes("function");

        // Provider doesn't support tool calling at all — degrade gracefully and retry once.
        if (toolsSupported && mentionsTools && (status === 400 || status === 404)) {
          toolsSupported = false;
          logger.warn("agent.tools_unsupported", { model: input.model, status: status ?? null });
          continue;
        }

        // Transient errors (rate limit / server error) — retry a couple of times with backoff.
        const retriable = status === 429 || (typeof status === "number" && status >= 500);
        if (retriable && retryAttempt < 2) {
          retryAttempt += 1;
          logger.warn("agent.completion_retry", { model: input.model, status: status ?? null, attempt: retryAttempt });
          await sleep(300 * retryAttempt);
          continue;
        }

        logger.error("agent.completion_failed", { model: input.model, status: status ?? null });
        yield { type: "error", message };
        return;
      }
    }

    const usage = completion.usage;
    if (usage) {
      totalInput += usage.prompt_tokens ?? 0;
      totalOutput += usage.completion_tokens ?? 0;
      totalCached += usage.prompt_tokens_details?.cached_tokens ?? 0;
    }

    const choice = completion.choices[0];
    const message = choice?.message;
    if (!message) {
      yield { type: "error", message: "The model returned an empty response." };
      return;
    }

    const toolCalls = message.tool_calls ?? [];

    if (toolCalls.length === 0) {
      const content = (message.content ?? "").trim();
      if (!content) {
        // Empty final answer with no tool calls and no report — nothing useful was produced.
        yield { type: "empty" };
        return;
      }
      yield {
        type: "thought",
        thought: { time: now(), type: "final", text: "Composing final answer…" },
      };
      for (const chunk of chunkText(content)) {
        yield { type: "token", text: chunk };
      }
      yield { type: "timeline", event: { time: now(), label: "Answer ready" } };
      yield { type: "done", usage: { input_tokens: totalInput, output_tokens: totalOutput, cached_tokens: totalCached } };
      return;
    }

    messages.push(message);

    for (const call of toolCalls) {
      if (call.type !== "function") {
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ error: "Unsupported tool call type" }) });
        continue;
      }
      const args = safeParseJSON(call.function.arguments);

      if (call.function.name === "web_search") {
        const query = String(args.query ?? "");
        const count = typeof args.count === "number" ? args.count : 5;
        yield {
          type: "thought",
          thought: { time: now(), type: "tool_call", text: `Searching the web for "${query}"…` },
        };
        yield { type: "timeline", event: { time: now(), label: "Search started", detail: query } };

        try {
          const results = await braveSearch(query, count);
          yield {
            type: "thought",
            thought: {
              time: now(),
              type: "tool_result",
              text: `Found ${results.length} result(s) for "${query}".`,
            },
          };
          yield {
            type: "timeline",
            event: { time: now(), label: `Read ${results.length} article(s)`, detail: query },
          };
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(results),
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          yield { type: "thought", thought: { time: now(), type: "tool_result", text: `Search failed: ${msg}` } };
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify({ error: msg }),
          });
        }
        continue;
      }

      if (call.function.name === "generate_report") {
        const report: ReportSummary = {
          tldr: String(args.tldr ?? ""),
          key_findings: Array.isArray(args.key_findings) ? args.key_findings.map(String) : [],
          recommendations: Array.isArray(args.recommendations) ? args.recommendations.map(String) : [],
          sources: Array.isArray(args.sources)
            ? args.sources.map((s: { title?: string; url?: string }) => ({
                title: String(s?.title ?? ""),
                url: String(s?.url ?? ""),
              }))
            : [],
        };
        const title = String(args.title ?? "Research report");

        yield {
          type: "thought",
          thought: { time: now(), type: "tool_call", text: "Building the executive summary report…" },
        };
        yield { type: "timeline", event: { time: now(), label: "Generated executive summary" } };
        yield { type: "report", report };

        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({ status: "report generated", title }),
        });
        continue;
      }
      if (call.function.name === "generate_pdf") {
  yield {
    type: "thought",
    thought: {
      time: now(),
      type: "tool_call",
      text: "Generating PDF..."
    },
  };

  messages.push({
    role: "tool",
    tool_call_id: call.id,
    content: JSON.stringify({
      status: "pdf generated",
      url: "/reports/sample.pdf"
    }),
  });

  continue;
}

      // Unknown tool: acknowledge so the model doesn't stall.
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify({ error: "Unknown tool" }),
      });
    }
  }

  yield {
    type: "thought",
    thought: { time: now(), type: "final", text: "Reached the reasoning step limit; summarizing what I have." },
  };
  yield {
    type: "done",
    usage: { input_tokens: totalInput, output_tokens: totalOutput, cached_tokens: totalCached },
    incomplete: true,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkText(text: string, size = 6): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size));
  return chunks;
}

function safeParseJSON(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
