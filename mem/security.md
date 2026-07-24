---
name: Security scanner guidance
description: Rules for security scanner to avoid re-flagging known-safe patterns
type: constraint
---
- `public.email_send_state` is a service_role-only internal dispatcher state table. RLS enabled + no anon/authenticated SELECT policy is intentional (fail-closed). Do not flag.
- `public.email_threads` is written exclusively by server-side sync workers using the service role. RLS enabled with SELECT-only client policies and no client write policies is intentional (fail-closed). Do not flag missing INSERT/UPDATE/DELETE policies.
- Similarly `contacts`, `deals`, `sync_state` are populated by server-side sync workers; missing client write policies is intentional.
- All SECURITY DEFINER functions in `public` (queue helpers, trigger fns, dispatchers) have EXECUTE revoked from anon/authenticated. Only `match_email_embeddings` is exposed to `authenticated`, and it enforces workspace membership internally via `private.is_workspace_member`. Do not flag these as executable-to-anon/authenticated.
