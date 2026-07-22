# TASK: Production Documentation

You are a Senior Staff Engineer.

Your goal is to make MicroManus understandable by a new engineer in under 30 minutes.

Deliverables:

1. Rewrite README.

Include:
- What is MicroManus.
- Architecture.
- Features.
- Setup.
- Deployment.
- Screenshots.
- Troubleshooting.

2. Create:

docs/
    ARCHITECTURE.md
    SETUP.md
    DEPLOYMENT.md
    TROUBLESHOOTING.md
    API_REFERENCE.md

3. Add diagrams for:

- Authentication flow.
- Agent loop.
- Credit flow.
- Stripe flow.
- Report flow.
- SSE flow.

4. Add:

ENVIRONMENT_VARIABLES.md

Including:

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- OPENAI_API_KEY
- BRAVE_API_KEY
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- ENCRYPTION_KEY

5. Add:

DEPLOY_CHECKLIST.md

Including:

- OAuth setup.
- Stripe.
- Vercel.
- Supabase.
- Environment variables.
- Webhook validation.

Acceptance Criteria:
- New engineer can run app in under 10 minutes.
- All deployment steps documented.
- No undocumented environment variables.