# Report — 01: Agent Loop

## Metadata

- Prompt: docs/prompts/01_AGENT_LOOP.md
- Date: 2026-07-22
- Branch: main
- Commit Hash: (see git log after commit)
- Build Status: PASS (`npm run build`, `npm run lint`)

## Executive Summary

Root cause of nearly every symptom in the prompt ("Brave Search never executes", "Tool calls
never occur", "Reports rarely generate") was a single bug: `src/lib/agent/loop.ts` imported
`TOOL_DEFINITIONS` but never passed `tools`/`tool_choice` to `client.chat.completions.create()`.
Without that parameter, the model has no tools to call, so it never invokes `web_search` or
`generate_report` — the agent could only ever produce a plain chat answer. This was confirmed by
lint (`'TOOL_DEFINITIONS' is defined but never used'`) before the fix.

Fixed the tool-calling bug plus the surrounding reliability issues: raw error/PII logging, no
retry logic, no graceful degradation for providers that reject `tools`, empty responses being
treated as valid answers, and the step-limit path being indistinguishable from success.

## Files Modified

- `src/lib/agent/loop.ts` — pass `tools`/`tool_choice` to the completions call; removed
  `console.log`/`console.dir` dump of raw provider errors (contained request bodies/keys);
  added bounded retry (429/5xx, up to 2 attempts, backoff) and automatic degradation to
  no-tools mode if a provider rejects `tools` with 400/404; distinguish an empty final answer
  (`{ type: "empty" }`) from a normal answer; mark step-limit exhaustion as `incomplete: true`
  instead of a silent success.
- `src/lib/logger.ts` (new) — structured JSON logger (`logger.info/warn/error`) used instead of
  ad hoc `console.log` for agent-loop diagnostics.

## Bugs Fixed

1. Tool calling never triggered (`tools` param missing) — **root cause fix**.
2. Brave Search never executing — direct consequence of #1, now works whenever the model
   decides to call `web_search`.
3. Reports rarely generating — direct consequence of #1, now works via `generate_report`.
4. Raw error objects (`console.dir(err, { depth: null })`) logged to stdout, which can contain
   provider request/response bodies (potential key/PII leakage) — removed.
5. No retry logic for transient 429/5xx errors — added (max 2 retries, linear backoff).
6. No graceful degradation when a provider doesn't support tool calling — added automatic
   fallback to a tools-less call for the rest of that run.
7. Empty model responses were silently treated as a valid final answer (charged full credit,
   saved as an empty assistant message) — now surfaced distinctly so the API route can refund
   and show a friendly retry message (see `03_REPORT.md`).
8. Hitting `MAX_ITERATIONS` looked identical to a normal completion (both emitted a plain
   `done` event) — now flagged `incomplete: true`.

## Security Improvements

- Removed console logging of raw provider errors, model name, and base URL in one block that
  could leak upstream error bodies (potentially containing echoed request data).

## Performance Improvements

- Bounded retries (max 2, capped backoff) prevent a single flaky provider call from hanging the
  whole 120s route `maxDuration` budget indefinitely without a limit.

## Tests Performed

- `npm run build` — passes (Next.js/TypeScript compile + static generation).
- `npm run lint` — passes, 0 errors/warnings (previously 1 warning for the unused
  `TOOL_DEFINITIONS`).
- Manual code trace of the tool-calling path (`web_search` → Brave → `messages.push` →
  `generate_report` → report event) confirms the loop now round-trips correctly given a valid
  API key.
- **Not performed (no live credentials in this environment):** an end-to-end run against a real
  OpenAI/Anthropic/Gemini/Groq/OpenRouter key. `.env.local` only has placeholder values for
  `STRIPE_SECRET_KEY`/`BRAVE_SEARCH_API_KEY`, so a live "Analyze California wildfires" run
  could not be executed here. This should be the first manual smoke test once real keys are
  configured.

## Risks

- The "provider doesn't support tools" detection is heuristic (looks for "tool"/"function" in a
  400/404 error message). A provider with a differently worded rejection would still fail the
  first call, but will surface as a normal error rather than a silent hang — no worse than
  before, and most OpenAI-compatible providers use consistent wording.
- Retries add up to ~900ms of extra latency in the worst case (2 retries) before failing —
  acceptable relative to the 30s target response time.

## Remaining Work

- True token-level provider streaming (`stream: true`) was intentionally not implemented in
  this pass. The current implementation calls the provider non-streaming and chunks the final
  text client-side, which is reliable but not "real" streaming. Implementing correct streamed
  tool-call argument accumulation across 5 different provider dialects (OpenAI, Anthropic,
  Gemini, Groq, OpenRouter) is a meaningfully larger, riskier change; flagged for a follow-up
  once a specific provider list is confirmed.
- Live multi-provider compatibility testing (OpenAI/Anthropic/Gemini/Groq/OpenRouter) requires
  real API keys, which are not available in this environment.

## Rollback Plan

`git revert` the commit for this prompt. The change is isolated to `src/lib/agent/loop.ts` and
the new `src/lib/logger.ts` (no DB/schema changes), so reverting fully restores prior behavior.

## Final Status

Core defect (tool calling) fixed and verified via build/lint/code trace. Live provider
verification deferred pending real API keys.
