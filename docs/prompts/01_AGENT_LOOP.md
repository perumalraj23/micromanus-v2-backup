# MICRO MANUS - AGENT LOOP COMPLETE IMPLEMENTATION

You are a Principal Engineer from OpenAI, Anthropic, Stripe and Vercel.

You are modifying an EXISTING production application called MicroManus.

DO NOT:
- Rewrite architecture.
- Add unnecessary dependencies.
- Change DB schema unless absolutely required.
- Break existing functionality.

YOUR JOB:

Transform MicroManus into a real Manus/Perplexity style research agent.

------------------------------------------------

CURRENT ISSUES

- TOOL_DEFINITIONS imported but unused.
- Brave Search never executes.
- Tool calls never occur.
- Reports rarely generate.
- PDF generation is incomplete.
- Timeline is inconsistent.
- Thought process is not reliable.
- Streaming is partially simulated.
- Empty responses consume credits.
- Aborts may consume credits.
- Max iterations may terminate silently.
- Error handling is inconsistent.
- Analytics depend on successful reports.
- Assignment demo currently fails.

------------------------------------------------

FILES TO REVIEW

- src/lib/agent/loop.ts
- src/lib/agent/tools.ts
- src/lib/agent/prompt.ts
- src/lib/agent/brave-search.ts
- src/lib/agent/report.ts
- src/app/api/chat/route.ts
- src/hooks/use-agent-stream.ts
- src/components/chat/*
- src/components/report/*
- src/app/reports/*
- src/lib/pricing.ts

------------------------------------------------

OBJECTIVES

Fix ALL issues related to:

1. Tool calling.
2. Brave Search.
3. Streaming.
4. Timeline.
5. Thoughts.
6. Reports.
7. PDF generation.
8. Analytics integration.
9. Cost calculation.
10. Error handling.
11. Retry logic.
12. Abort handling.
13. Empty responses.
14. Credit refunds.
15. Multi-model support.
16. Provider compatibility.

------------------------------------------------

MODEL COMPATIBILITY

Verify compatibility with:

- OpenAI
- Gemini
- Anthropic
- Groq
- OpenRouter

The system must gracefully degrade if:

- tools unsupported
- streaming unsupported
- rate limited
- timeout occurs

------------------------------------------------

ADD WOW FACTORS

Implement:

1. Live agent status.

States:

- Thinking
- Searching Web
- Reading Sources
- Extracting Facts
- Comparing Information
- Writing Executive Summary
- Generating PDF
- Complete

2. Live timeline.

3. Real search count.

4. Source counter.

5. Progress bar.

6. Research duration.

7. Tokens consumed.

8. Estimated cost.

9. Sources visited.

10. Completion percentage.

------------------------------------------------

TEST CASES

Verify:

1.

Prompt:

Analyze recent California wildfires.

Expected:

- Thought generated
- Search performed
- Timeline visible
- Sources shown
- Report generated
- PDF generated
- Analytics updated

------------------------------------------------

Prompt:

Compare Tesla vs BYD.

Expected:

- Multiple searches
- Comparison table
- Executive summary
- PDF

------------------------------------------------

Prompt:

What is my name?

Expected:

- Context retained.

------------------------------------------------

Prompt:

Generate 20-page research report.

Expected:

- No timeout.
- Graceful handling.

------------------------------------------------

PERFORMANCE

Target:

- First token <2 seconds
- Complete response <30 seconds
- PDF <5 seconds
- Search latency <2 seconds

------------------------------------------------

SECURITY

Verify:

- No API keys leaked.
- No stack traces.
- No PII exposed.
- No secrets logged.

------------------------------------------------

RETURN

1. Root cause.
2. Files modified.
3. Complete replacement code.
4. Tests added.
5. Risks.
6. Rollback plan.
7. Performance impact.
8. Manual verification steps.
9. Production checklist.
10. Assignment readiness score.

DO NOT STOP UNTIL THIS ENTIRE AREA IS COMPLETE.