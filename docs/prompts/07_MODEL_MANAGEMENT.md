# MICRO MANUS - COMPLETE MODEL MANAGEMENT PLATFORM IMPLEMENTATION

You are a Principal AI Infrastructure Engineer from OpenAI, Anthropic, and Vercel.

Your objective is to transform MicroManus's Settings page into a production-grade AI Model Management platform.

DO NOT:

- Rewrite the architecture.
- Replace Supabase.
- Replace OpenAI SDK.
- Add unnecessary dependencies.
- Break existing functionality.

Preserve all existing features.

------------------------------------------------

CURRENT STATE

MicroManus currently supports:

- OpenAI-compatible endpoints
- API Key storage
- Base URL
- Model name

Known issues:

1. No Edit Model functionality.
2. No Test Connection button.
3. No health checks.
4. No latency measurements.
5. No model capabilities display.
6. No active model indicator.
7. No connection diagnostics.
8. No provider badges.
9. No usage statistics.
10. No default recommendations.
11. No onboarding guidance.
12. Poor error differentiation.

------------------------------------------------

FILES TO REVIEW

- src/app/settings/*
- src/app/api/model-configs/*
- src/lib/agent/*
- src/lib/encryption.ts
- src/components/*
- model_configs table

------------------------------------------------

OBJECTIVE

Build a settings experience that makes Siddarth Jain think:

"This engineer understands AI infrastructure."

------------------------------------------------

SUPPORTED PROVIDERS

Verify and improve support for:

1.

OpenAI

Examples:

- GPT-4.1
- GPT-4o
- GPT-5
- GPT-4.1 Mini

------------------------------------------------

2.

Anthropic

Examples:

- Claude Sonnet
- Claude Opus

------------------------------------------------

3.

Google

Examples:

- Gemini Flash
- Gemini Pro

------------------------------------------------

4.

xAI

Examples:

- Grok-4
- Grok-4 Fast

------------------------------------------------

5.

OpenRouter

Examples:

- DeepSeek
- Qwen
- Kimi
- Llama

------------------------------------------------

6.

Groq

Examples:

- Llama 3.3
- Mixtral

------------------------------------------------

IMPLEMENT

SECTION 1

MODEL CARDS

Display:

--------------------------------

GPT-4.1

Provider:
OpenAI

Status:
Connected

Latency:
1.2s

Requests:
47

Cost:
$0.04

--------------------------------

------------------------------------------------

SECTION 2

TEST CONNECTION

Implement:

Button:

"Test Connection"

Flow:

1. Send:
"Say Hello"

2. Measure:

- latency
- success rate
- response time

3. Show:

--------------------------------

Connected Successfully

Latency:
1.2s

Tokens:
18

Provider:
OpenAI

--------------------------------

------------------------------------------------

SECTION 3

EDIT MODEL

Allow editing:

- Name
- Provider
- Base URL
- API Key
- Model

Without deleting and recreating.

------------------------------------------------

SECTION 4

ACTIVE MODEL

Show:

--------------------------------

ACTIVE

GPT-4.1

--------------------------------

Only one active model at a time.

------------------------------------------------

SECTION 5

MODEL CAPABILITIES

Examples:

--------------------------------

GPT-4.1

✓ Tool Calling
✓ Vision
✓ Function Calling
✓ Large Context

--------------------------------

Claude

✓ Large Context
✓ Reasoning

--------------------------------

Gemini

✓ Fast
✓ Cheap

--------------------------------

------------------------------------------------

SECTION 6

CONNECTION DIAGNOSTICS

Examples:

--------------------------------

Connection:
Healthy

Authentication:
Passed

Latency:
1.3s

Endpoint:
Reachable

--------------------------------

------------------------------------------------

SECTION 7

PROVIDER BADGES

Examples:

- OpenAI
- Anthropic
- Google
- xAI
- Groq
- OpenRouter

------------------------------------------------

SECTION 8

MODEL RECOMMENDATIONS

Examples:

--------------------------------

Recommended:

For Research:
Claude Sonnet

For Speed:
Gemini Flash

For Cost:
Llama 3.3

For Balanced:
GPT-4.1

--------------------------------

------------------------------------------------

SECTION 9

USAGE INSIGHTS

Examples:

--------------------------------

Most Used:
GPT-4.1

Most Expensive:
Claude

Cheapest:
Gemini

--------------------------------

------------------------------------------------

SECTION 10

ONBOARDING

Examples:

--------------------------------

Step 1

Add API Key.

Step 2

Test Connection.

Step 3

Set Active Model.

Step 4

Start Researching.

--------------------------------

------------------------------------------------

WOW FACTORS

Implement at least 5.

1.

Latency Leaderboard

--------------------------------

Gemini:
0.8s

GPT:
1.2s

Claude:
2.1s

--------------------------------

2.

Model Health Dashboard

3.

Connection History

4.

AI Provider Comparison

5.

Recommended Model Banner

6.

Cost Estimator

Examples:

"This model costs ~3x more."

7.

One Click Verification

--------------------------------

Verify All Models

--------------------------------

------------------------------------------------

ERROR HANDLING

Current:

"Invalid API Key"

Implement:

--------------------------------

OpenAI rejected your API key.

Verify:

- Key copied correctly
- Billing enabled
- Model exists

--------------------------------

Examples:

- Rate limit.
- Timeout.
- Authentication failure.
- Invalid endpoint.
- Unsupported model.

------------------------------------------------

TEST CASES

1.

Invalid API Key.

Expected:

- Friendly error.

------------------------------------------------

2.

Wrong Base URL.

Expected:

- Endpoint unreachable.

------------------------------------------------

3.

Timeout.

Expected:

- Retry.

------------------------------------------------

4.

Unsupported Model.

Expected:

- Guidance.

------------------------------------------------

5.

Provider Down.

Expected:

- Graceful degradation.

------------------------------------------------

RETURN

1. Root cause.
2. Files modified.
3. Complete replacement code.
4. API changes.
5. Risks.
6. Rollback plan.
7. Test cases.
8. Model readiness score.
9. AI infrastructure score.
10. Founder delight score.

DO NOT STOP UNTIL MODEL MANAGEMENT FEELS LIKE A MINI OPENROUTER DASHBOARD.