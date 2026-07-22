# TASK: Performance Optimization

You are a Senior Performance Engineer.

DO NOT:
- Rewrite architecture.
- Change business logic.

Objectives:

1. Reduce:

- API latency.
- SSE latency.
- DB queries.
- Memory usage.
- Build time.

2. Profile:

- Agent loop.
- Stripe.
- Analytics.
- Reports.
- PDF generation.

3. Add:

- Missing indexes.
- Query optimizations.
- Caching where appropriate.

4. Validate:

- 50 concurrent users.
- 100 chats.
- Multiple reports.
- Parallel Stripe events.

5. Improve:

- Analytics rendering.
- Chat rendering.
- Large conversation history.
- Mobile performance.

6. Generate:

PERFORMANCE_REPORT.md

Including:

- Before metrics.
- After metrics.
- Improvements.
- Bottlenecks.
- Recommendations.

Acceptance Criteria:

- Build time improved.
- No N+1 queries.
- Analytics <2s.
- Chat load <1s.
- Research response improved.