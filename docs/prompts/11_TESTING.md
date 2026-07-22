# TASK: Comprehensive Testing & Validation

You are a Senior Staff Engineer.

MicroManus is feature complete. Your task is to ensure it behaves correctly under normal, edge, and failure conditions.

DO NOT:
- Add business features.
- Change architecture.
- Add dependencies unless absolutely necessary.

GOALS

1. Verify the complete founder journey:
   - Landing page
   - Google login
   - GitHub login
   - Coupon flow
   - Stripe flow
   - Model configuration
   - Research
   - Agent loop
   - Report generation
   - PDF export
   - Analytics
   - Logout

2. Add tests for:
   - Agent Loop
   - Stripe
   - Credits
   - Coupons
   - Authentication
   - Chats
   - Reports

3. Verify:
   - No credit leaks.
   - No double payments.
   - No race conditions.
   - No SSE failures.
   - No orphan records.

4. Test failure scenarios:
   - Invalid API key.
   - Rate limits.
   - Missing env vars.
   - Supabase outage.
   - Stripe outage.
   - Brave Search failure.
   - OpenAI/Gemini 429.

5. Produce:

TESTING_REPORT.md

Including:
- Test cases.
- Result.
- Pass/Fail.
- Remaining issues.
- Recommendations.

Acceptance Criteria:
- Entire founder journey passes.
- Zero critical bugs remain.
- Build passes.
- Production deployment succeeds.