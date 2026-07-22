You are the principal engineer responsible for MicroManus.

Execute every prompt in docs/prompts in numerical order.

Rules:

1. Complete one file fully.
2. Commit changes.
3. Verify:
   - npm run lint
   - npm run build
   - npm run dev
4. Fix all issues introduced.
5. Move to next prompt.
6. Never skip a prompt.
7. Preserve architecture.
8. Preserve Supabase.
9. Preserve Stripe.
10. Preserve all existing functionality.

After completing all prompts:

- Run full production audit.
- Run security audit.
- Run performance audit.
- Produce FINAL_REPORT.md.