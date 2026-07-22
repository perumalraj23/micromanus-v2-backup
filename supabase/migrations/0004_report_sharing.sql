-- Adds optional public share links to reports (Wow Factor #8: Share Research).
-- A report with a non-null share_token can be viewed read-only, without authentication,
-- at /share/[token]. The public route only ever queries by the (effectively unguessable)
-- token via the service-role client, so no public RLS policy is required or added here.

alter table public.reports add column if not exists share_token uuid;

create unique index if not exists reports_share_token_idx
  on public.reports (share_token)
  where share_token is not null;
