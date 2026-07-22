# MICRO MANUS - COMPLETE ANALYTICS PLATFORM IMPLEMENTATION

You are a Staff Engineer from Datadog, Mixpanel, and Stripe.

You are working on an EXISTING production application called MicroManus.

DO NOT:

- Rewrite the application.
- Replace Supabase.
- Replace existing APIs.
- Introduce unnecessary dependencies.
- Break existing functionality.

Your goal is to transform Analytics from a simple dashboard into a founder-grade observability platform.

------------------------------------------------

CURRENT STATE

Analytics currently shows:

- Total Chats
- Reports Generated
- Credits Remaining
- Input Tokens
- Output Tokens
- Cache Tokens
- Cost Per Chat
- Cost Per Model

Problems:

1. Charts are basic.
2. Labels are missing.
3. No time filtering.
4. No trends.
5. No comparisons.
6. No founder insights.
7. No usage timeline.
8. No cost optimization suggestions.
9. No model performance metrics.
10. No research insights.
11. No WOW factor.

------------------------------------------------

FILES TO REVIEW

- src/app/analytics/*
- src/app/api/analytics/*
- src/lib/pricing.ts
- src/components/*
- src/lib/*
- usage_events
- reports
- chats
- profiles

------------------------------------------------

OBJECTIVE

Build an analytics experience that makes Siddarth Jain think:

"This engineer understands products."

------------------------------------------------

IMPLEMENT

SECTION 1

OVERVIEW CARDS

--------------------------------

Total Chats
27

Reports Generated
14

Credits Remaining
11

Lifetime Spend
$18

--------------------------------

Average Cost Per Research

$0.00042

--------------------------------

Most Used Model

gpt-4.1

--------------------------------

Cache Savings

$2.41

--------------------------------

------------------------------------------------

SECTION 2

USAGE CHARTS

Implement:

1. Daily Research Volume

Last 30 Days

2. Token Consumption

Input vs Output

3. Credits Usage

Purchased vs Consumed

4. Cost Trend

Daily cost.

5. Reports Generated

Per day.

------------------------------------------------

SECTION 3

MODEL INSIGHTS

Show:

--------------------------------

GPT-4.1

Requests:
18

Avg Cost:
$0.0004

Avg Latency:
1.2s

--------------------------------

Claude

Requests:
7

Avg Cost:
$0.0008

--------------------------------

Gemini

Requests:
5

Avg Cost:
$0.0002

--------------------------------

------------------------------------------------

SECTION 4

FOUNDER INSIGHTS

Examples:

--------------------------------

Your most active day:
Tuesday

Most researched topic:
Kubernetes

Most expensive model:
Claude

Cheapest model:
Gemini

Average report length:
1240 words

--------------------------------

------------------------------------------------

SECTION 5

USAGE TIMELINE

Examples:

11:21

Started California wildfire research.

11:22

Generated report.

11:24

Downloaded PDF.

11:30

Switched to GPT-4.

--------------------------------

------------------------------------------------

SECTION 6

RESEARCH INSIGHTS

Examples:

Top Categories:

- AI
- Kubernetes
- DevOps
- Finance
- Startups

Average Session:

6 minutes

Longest Session:

18 minutes

--------------------------------

------------------------------------------------

SECTION 7

COST OPTIMIZATION

Examples:

--------------------------------

You could save:

$2.40

By using:

Gemini Flash

For:

Simple questions.

--------------------------------

Claude is costing 3x more than GPT-4.

--------------------------------

75% of your requests do not use web search.

--------------------------------

------------------------------------------------

WOW FACTORS

Implement at least 5.

1.

Weekly Report

--------------------------------

This Week:

+14 chats
+4 reports
+$0.42 spent

--------------------------------

2.

Heatmap

Research activity by day.

3.

Research Streak

7 Day Streak

4.

Achievement Badges

Examples:

- First Report
- 100 Chats
- Power Researcher
- PDF Master

5.

Leaderboard Style Stats

Examples:

Top 1% Researcher

6.

Fun Facts

Examples:

You asked about Kubernetes 12 times.

7.

Personal AI Assistant Stats

Examples:

Your AI spent:

- 3 hours researching.
- Read 127 articles.
- Generated 14 reports.

------------------------------------------------

TIME FILTERS

Support:

- Today
- 7 Days
- 30 Days
- 90 Days
- Lifetime

------------------------------------------------

MOBILE REQUIREMENTS

Verify:

- Charts responsive.
- Cards stack.
- Labels visible.
- Timeline scrollable.

------------------------------------------------

TEST CASES

1.

New user.

Expected:

- Empty states.

--------------------------------

2.

Heavy user.

Expected:

- Charts render.

--------------------------------

3.

No reports.

Expected:

- Friendly empty message.

--------------------------------

4.

Multiple models.

Expected:

- Cost comparison.

--------------------------------

5.

Large datasets.

Expected:

- Fast rendering.

------------------------------------------------

EMPTY STATES

Examples:

--------------------------------

No research yet.

Start your first deep dive.

--------------------------------

No reports generated.

Ask MicroManus to generate one.

--------------------------------

------------------------------------------------

RETURN

1. Root cause.
2. Files modified.
3. Complete replacement code.
4. New components.
5. API changes.
6. Risks.
7. Rollback plan.
8. Test cases.
9. Analytics readiness score.
10. Founder delight score.

DO NOT STOP UNTIL ANALYTICS FEELS LIKE A MINI DATADOG FOR AI RESEARCH.