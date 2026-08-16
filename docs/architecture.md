# Architecture

## Runtime

- **Next.js 15 App Router** with per-locale routing (`/en/...`, `/vi/...`).
- **Server-first**: Server Components + Server Actions handle all Supabase reads/writes. The browser only talks to Supabase directly for auth session refresh via `@supabase/ssr`.
- **Two session domains**:
  - Parent — Supabase Auth (magic link). Cookies managed by `@supabase/ssr` middleware.
  - Child (Phase 2) — separate signed HttpOnly cookie bound to `child_id`, minted server-side after PIN verify against `children.pin_hash` (argon2id via `hash-wasm`).

## Data

- Postgres via Supabase. Row-Level Security on every table (see `supabase/migrations/0002_rls.sql`).
- Family isolation is enforced through `auth_family_id()` (SECURITY DEFINER) which resolves `auth.uid()` → `users.family_id`.
- Ledgers (`coin_transactions`, `star_transactions`) are append-only. Phase 2 introduces `award_task` / `redeem_reward` SECURITY DEFINER functions that insert ledger rows in a single transaction.

## Storage

- Bucket `family-avatars` is private. Objects use path `{family_id}/{child_id}.{ext}`.
- Reads go through 30-day signed URLs generated in `uploadAvatar` server action; the URL is cached in `children.avatar_url`.

## i18n

- `next-intl` v3 with locale prefix always. Cookie `locale` overrides `Accept-Language`. Parent preference persisted in `user_preferences.language`.

## Security notes

- Service-role key only used in `lib/supabase/admin.ts`, imported from Route Handlers and Server Actions.
- CSP set in `next.config.ts`. No third-party scripts.
- PIN attempts rate-limit lives in Phase 2 alongside child sessions.
