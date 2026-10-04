# BloomQuest Family

Private family reward PWA. Next.js 15 + Supabase.

Phase 1 scaffold: parent magic-link auth, children CRUD with avatars + 6-digit PIN, en/vi locale routing, RLS-protected schema, avatar storage bucket.

## Quick start

1. Install deps

   ```bash
   pnpm install
   ```

2. Create a Supabase project → copy keys into `.env.local` (see `.env.example`).

3. Apply every file in `supabase/migrations/` in numeric order (`0001` → latest) via the Supabase SQL editor (or `supabase db push` if using the CLI). Skip `0007_dev_seed.sql` outside local development — it creates the fixed-UUID dev family used by `DEV_FAMILY_ID`.

4. In Supabase Auth settings, set the site URL to `http://localhost:3000` and add `http://localhost:3000/api/auth/callback` to the redirect allow list.

5. Run dev

   ```bash
   pnpm dev
   ```

   Visit http://localhost:3000 — you'll be redirected to `/en`.

## Structure

See `plans/goldquest-mvp.md` §3 for the target layout.

## Phase 1 exit criterion

Parent logs in via magic link → adds July and Berry with avatars + PIN → toggles UI language and it persists across reloads and sign-outs.
