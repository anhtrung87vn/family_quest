# Deployment

## Environments

- **Production**: Vercel project linked to `main`. Supabase project `goldquest-prod`.
- **Preview**: Vercel preview deployments on PRs. Supabase project `goldquest-staging` behind `SUPABASE_URL_PREVIEW`.

## Required environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL` (e.g. `https://goldquest.vercel.app`)
- `CRON_SECRET` (Phase 2 — recurring assignment generator)

## First-time Supabase setup

1. Create the project.
2. Run migrations `0001` → `0004` in order (`supabase db push` or via the SQL editor).
3. In Auth settings:
   - Enable email provider (magic link).
   - Set Site URL to `NEXT_PUBLIC_SITE_URL`.
   - Add `${NEXT_PUBLIC_SITE_URL}/api/auth/callback` to Redirect URLs.
4. Verify the `family-avatars` bucket exists and is private (created by `0003_storage.sql`).

## Vercel

- Add all env vars in Project → Settings → Environment Variables.
- Framework preset: Next.js. Build command: `next build`. Install: `pnpm install`.
- Cron (Phase 2): `POST /api/cron/generate-assignments` daily 05:00 local, with `Authorization: Bearer $CRON_SECRET`.
