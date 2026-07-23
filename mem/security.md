---
name: Security scanner guidance
description: Rules for security scanner to avoid re-flagging known-safe patterns
type: constraint
---
- `public.email_send_state` is a service_role-only internal dispatcher state table. RLS enabled + no anon/authenticated SELECT policy is intentional (fail-closed). Do not flag.
