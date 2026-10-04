# BloomQuest Family — Implementation Plan

Source: `GoldQuest_Family_Design.md` (sections 1–58). Product name: **BloomQuest Family**.
Target: private family reward web app (Next.js + Supabase, PWA), English default + Vietnamese, two children (July / Berry).

---

## 1. Outcome Contract

- **Outcome**: A working PWA the family can use daily. Parent creates/approves tasks, children submit them, Quest Coins are earned via an immutable ledger, and rewards can be redeemed.
- **Success criteria (MVP done)**:
  1. Parent logs in via Supabase Auth (magic link / OTP).
  2. Two child profiles exist (July, Berry) with parent-uploaded avatars, PIN login.
  3. Parent creates a task → assigns → child marks done → parent approves → coins ledgered.
  4. Reward store: parent creates reward → child requests → parent approves → coins deducted (ledgered).
  5. UI responsive (phone / tablet / desktop), installable as PWA, en + vi locales working with runtime switch persisted.
  6. Deployed to Vercel with Supabase backing.
- **Non-goals for MVP** (deferred to Phase 3+): Stars ledger UI, badges, streaks, levels, Family Quests, Dream Reward milestones, weekly challenges, adventure map, collections, themes, notifications, confetti, photo proof, offline mode.
- **Explicit constraint**: Stars **schema** ships in MVP (per design §21 Star Transaction Model) but UI beyond a simple lifetime total is deferred.

---

## 2. Tech Stack (locked from design §17)

- **Frontend**: Next.js 15 (App Router) + TypeScript + React 19
- **Styling**: Tailwind CSS v4, `class-variance-authority`, `clsx`
- **i18n**: `next-intl` (routing per-locale, `en` default, `vi` optional)
- **Backend**: Next.js Route Handlers + Server Actions
- **DB + Auth + Storage**: Supabase (PostgreSQL, RLS, Auth, Storage bucket `family-avatars`)
- **Data access**: `@supabase/ssr` (server + client), zod for schema validation
- **PWA**: `@ducanh2912/next-pwa` (or `serwist`) + manifest + icons
- **Hosting**: Vercel
- **Repo**: GitHub, conventional commits

---

## 3. Repository Layout

```
Family_Reward/
├─ app/
│  ├─ [locale]/
│  │  ├─ (marketing)/              landing / login entry
│  │  ├─ (parent)/                 parent dashboard (Supabase Auth guarded)
│  │  │  ├─ dashboard/
│  │  │  ├─ tasks/
│  │  │  ├─ rewards/
│  │  │  ├─ kids/
│  │  │  └─ settings/
│  │  ├─ (child)/                  child mode (PIN gate)
│  │  │  ├─ select/                Who's playing?
│  │  │  ├─ pin/
│  │  │  └─ [child]/               home / quests / rewards / me
│  │  └─ layout.tsx
│  ├─ api/                         route handlers where server actions not enough
│  └─ manifest.ts                  PWA manifest
├─ components/                     shared UI (Button, Card, ProgressBar, CoinChip, StarChip)
├─ lib/
│  ├─ supabase/                    server.ts, client.ts, admin.ts
│  ├─ ledger.ts                    coin/star ledger helpers
│  ├─ auth/                        parent + child PIN helpers
│  └─ i18n/                        next-intl config
├─ messages/
│  ├─ en.json
│  └─ vi.json
├─ supabase/
│  ├─ migrations/
│  │  ├─ 0001_init.sql
│  │  ├─ 0002_rls.sql
│  │  └─ 0003_seed.sql
│  └─ seed/                        JSON seed for tasks/rewards/badges
├─ public/icons/                   PWA icons
├─ plans/goldquest-mvp.md          this file
├─ docs/
│  ├─ architecture.md
│  ├─ db-schema.md
│  └─ deployment.md
├─ .env.example
├─ next.config.ts
├─ tailwind.config.ts
├─ tsconfig.json
└─ package.json
```

---

## 4. Database Schema (Phase 1 DDL)

From design §19–§21 + Star Transaction Model. All tables scoped by `family_id`; RLS enforces isolation. Names are snake_case, IDs are `uuid` default `gen_random_uuid()`.

### 4.1 Core tables

```sql
create table families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table users ( -- parents; child auth is PIN-based, not in auth.users
  id uuid primary key references auth.users(id) on delete cascade,
  family_id uuid not null references families(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null check (role in ('parent')) default 'parent',
  created_at timestamptz not null default now()
);

create table children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,                          -- "July", "Berry" (not translated)
  grade smallint,                              -- 3, 6, etc.
  avatar_url text,
  pin_hash text not null,                      -- bcrypt/argon hash of 4-6 digit PIN
  current_dream_reward_id uuid,                -- FK added later (rewards)
  preferred_language text not null default 'en' check (preferred_language in ('en','vi')),
  lifetime_stars integer not null default 0,   -- cached; ledger is source of truth
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_preferences (
  user_id uuid primary key references users(id) on delete cascade,
  language text not null default 'en' check (language in ('en','vi'))
);
```

### 4.2 Tasks

```sql
create table tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  description text,
  category text,                               -- learning|responsibility|family|health|...
  coin_reward integer not null default 0 check (coin_reward >= 0),
  star_reward integer not null default 0 check (star_reward >= 0),
  difficulty smallint check (difficulty between 1 and 3),
  is_recurring boolean not null default false,
  recurrence_rule text,                        -- RRULE or JSON (days-of-week list)
  requires_approval boolean not null default true,
  is_system_template boolean not null default false,
  active boolean not null default true,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create table task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  child_id uuid not null references children(id) on delete cascade,
  due_date date,
  status text not null check (status in ('todo','submitted','approved','rejected','expired')) default 'todo',
  created_at timestamptz not null default now()
);

create table task_completions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references task_assignments(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references users(id),
  status text not null check (status in ('submitted','approved','rejected')) default 'submitted',
  parent_note text,
  celebration_message text                     -- design §52
);
```

### 4.3 Rewards

```sql
create table rewards (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  description text,
  category text,                               -- small|medium|large|dream|experience
  coin_cost integer not null check (coin_cost > 0),
  image_url text,
  requires_approval boolean not null default true,
  dream_eligible boolean not null default false,
  is_system_template boolean not null default false,
  active boolean not null default true,
  stock integer,                               -- null = unlimited
  created_at timestamptz not null default now()
);

create table reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references rewards(id) on delete restrict,
  child_id uuid not null references children(id) on delete cascade,
  coin_cost integer not null,                  -- snapshot at request time
  status text not null check (status in ('requested','approved','rejected','fulfilled','cancelled')) default 'requested',
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references users(id)
);

-- add FK now that rewards exists
alter table children
  add constraint children_current_dream_reward_fk
  foreign key (current_dream_reward_id) references rewards(id) on delete set null;
```

### 4.4 Ledgers (immutable)

```sql
create table coin_transactions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  amount integer not null,                     -- signed
  transaction_type text not null check (transaction_type in (
    'TASK_REWARD','BONUS','REWARD_REDEMPTION','MANUAL_ADJUSTMENT',
    'CORRECTION','STREAK_BONUS','FAMILY_QUEST'
  )),
  reference_id uuid,                           -- task_completion / redemption / etc
  description text,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);
create index on coin_transactions (child_id, created_at desc);

create table star_transactions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  amount integer not null,
  transaction_type text not null check (transaction_type in (
    'TASK_STAR_REWARD','BADGE_BONUS','STREAK_BONUS','WEEKLY_CHALLENGE',
    'FAMILY_QUEST','MANUAL_ADJUSTMENT','CORRECTION'
  )),
  reference_id uuid,
  description text,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);
create index on star_transactions (child_id, created_at desc);

-- Convenience view; balance is authoritative from ledger
create view child_balances as
  select
    c.id as child_id,
    coalesce((select sum(amount) from coin_transactions where child_id = c.id), 0) as coin_balance,
    coalesce((select sum(amount) from star_transactions where child_id = c.id), 0) as star_balance
  from children c;
```

### 4.5 Post-MVP tables (schema deferred)

`badges`, `child_badges`, `family_quests`, `family_quest_members`, `weekly_challenges`, `collections`, `child_collection_items`. Documented in `docs/db-schema.md`, migrated when Phase 3/4 starts.

### 4.6 RLS Policy Summary

- **families / users / user_preferences**: parent can read/write only rows where `family_id = current_user.family_id`.
- **children**: parent read/write in family; child reads happen via server-side session using `service_role` from route handler after PIN verification (children are not `auth.users`).
- **tasks / task_assignments / task_completions / rewards / reward_redemptions / *_transactions**: family-scoped.
- All child-mode writes go through server actions that verify the PIN session cookie against `children.pin_hash`; direct client → Supabase writes from child mode are blocked.

---

## 5. Ledger Rules (invariants)

1. **Balances are never mutated directly.** All coin/star changes are inserts into the ledger.
2. **Task approval flow**: transitioning a `task_completion` to `approved` in a single Postgres transaction must also insert one `coin_transactions` row (and `star_transactions` row if `star_reward > 0`) with `reference_id = task_completion.id` and `transaction_type = 'TASK_REWARD'` / `'TASK_STAR_REWARD'`.
3. **Redemption**: setting `reward_redemptions.status = 'approved'` must, in one transaction, insert a negative `coin_transactions` row with `transaction_type = 'REWARD_REDEMPTION'`, `reference_id = redemption.id`. Reject if `child_balances.coin_balance < coin_cost`.
4. **Manual adjustment** requires a non-null `description` (reason).
5. **No deletes** on ledger rows; corrections happen via a compensating `CORRECTION` row.
6. Enforced via Postgres function `award_task(completion_id)` and `redeem_reward(redemption_id)` called from server actions; both `SECURITY DEFINER` with family-scope checks.

---

## 6. Phased Milestones

### Phase 1 — Foundation (Design §27 Phase 1)

Deliverables:
- Next.js + TS + Tailwind + next-intl scaffolded.
- Supabase project + `.env.example` documenting `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Migrations `0001_init.sql` + `0002_rls.sql` + `0003_seed.sql` applied.
- Locale routing (`/en/...`, `/vi/...`), Settings > Language switch persisted to `user_preferences` (parent) or `children.preferred_language` (child).
- Storage bucket `family-avatars` with signed-URL read policy; avatar upload UI in parent flow (§21 avatar storage rules).
- Parent Auth (Supabase magic link).
- Basic layouts (parent shell, child shell placeholder).

Exit: Parent can log in, create the family, add July & Berry with avatars and PINs, and switch UI language.

### Phase 2 — Usable MVP (Design §27 Phase 2, §28)

Deliverables:
- Parent: create task (one-time + weekday recurrence), assign to child, view pending approvals, approve/reject → ledger insert.
- Parent: create reward, approve redemptions → ledger insert; manual coin adjustment with reason.
- Child: PIN login, Home screen (avatar, coin balance, today's quests), Quests tab (Today / Waiting / Completed), Rewards tab (Available / Redeemed), Me tab (balance + coin history).
- Server action helpers: `submitTask`, `approveTask`, `rejectTask`, `createRedemption`, `approveRedemption`, `adjustCoins`.
- Postgres functions `award_task`, `redeem_reward`, `manual_adjust_coins` (transactional).
- Recurring task generator: server action or Vercel cron (`/api/cron/generate-assignments`) that creates `task_assignments` for the day based on `recurrence_rule`.
- Seed data (design §38): ~25 Grade 3 tasks, ~30 Grade 6 tasks, ~20 rewards; loaded via `0003_seed.sql` as system templates.

Exit: The family can use the app daily end-to-end.

### Phase 3 — Kids Experience (deferred)

Dream Reward on Home (§5, §29), progress bars, Stars UI, badges, streaks (with grace-day design §46), levels (§4.4), confetti on approval. Age-adaptive density (§54).

### Phase 4 — Family Experience (deferred)

Family Quests (§12, §32), weekly challenges (§33), weekly reflection (§53), parent celebration messages (§52), statistics.

### Phase 5 — PWA polish (deferred)

Full manifest tuning, offline shell, push notifications (parent approval prompts + child weekly-goal nudges), Add-to-Home-Screen prompt.

### Phase 6 — Post-launch (deferred)

Adventure map (§44), collections (§48), monthly themes (§43.3), Weekly Treasure Box (§51), photo proof, vacation mode.

---

## 7. i18n Strategy (design §15)

- All UI strings via `next-intl` keys; never hard-coded. Key namespaces: `home`, `quests`, `rewards`, `profile`, `settings`, `parent`, `common`, `errors`, `notifications`.
- Names July/Berry are **not** translated.
- Currency: English `Quest Coins`, Vietnamese `Xu`. Stars: `Stars` / `Sao`. Locale-driven, not conditional.
- Locale detection order: cookie → user/child preference → `Accept-Language` → `en`.
- Language switch persists to DB and cookie, so it survives sign-out.

---

## 8. UX Guardrails (from design §24–§58)

Enforced in review, not runtime:
- No sibling leaderboard anywhere in child UI (§2.2, §45). Parent dashboard may show side-by-side.
- Big tap targets: primary buttons ≥ 52 px, tappable rows ≥ 44 px (§56).
- Icons **plus** text for important actions (§57.2).
- No dense tables / no corporate dashboard look in child mode (§55).
- No punitive streak messaging (§46).
- No paid random-reward mechanics (§51).
- Basic responsibilities (brushing teeth, eating meals) not defaulted as coin tasks in seed data (§37).

---

## 9. Security Checklist

- Supabase RLS on every table; verified with SQL smoke tests before Phase 2 ships.
- Service-role key only in server actions / route handlers, never bundled.
- Child PIN: stored as `argon2` hash (via `hash-wasm` in a route handler); rate-limit PIN attempts per child (5 / 15 min) with lockout event.
- Avatar bucket: private, served via short-lived signed URLs from server components.
- Parent session ≠ child session. Child PIN session is a separate signed HttpOnly cookie tied to `child_id`, capped at 12 h.
- No PII in coin/star transaction `description` beyond what parent typed.
- CSP headers via `next.config.ts`; no third-party scripts in child mode.

---

## 10. Testing Strategy

- **Unit** (Vitest): ledger math, PIN hash+verify, recurrence expansion (`rrule` → list of dates).
- **Integration** (Vitest + Supabase local): `award_task` transaction, `redeem_reward` insufficient-balance rejection, RLS isolation across two families.
- **E2E** (Playwright): parent auth → create task → assign → child submits → parent approves → child sees updated balance. Locale switch survives reload.
- **Manual smoke**: PWA install on iPhone Safari + Android Chrome; avatar upload from mobile camera roll.

---

## 11. Deployment (design §26)

- GitHub repo `goldquest-family` (private).
- Vercel project linked to `main`; preview deployments on PRs.
- Supabase: one project for prod, one for staging/preview (`SUPABASE_URL_PREVIEW` env override).
- Vercel Cron: daily `05:00` local time runs `POST /api/cron/generate-assignments` with a shared secret header.
- Custom domain later; MVP ships on `goldquest.vercel.app` (or similar).

---

## 12. Open Decisions (need answers before Phase 1 code)

1. **PIN length**: 6 digits
2. **Parent auth**: magic link only
3. **Recurring task generator**: Vercel Cron (needs project on Pro) 
4. **Star rewards in MVP**: emit rows into `star_transactions` from task approvals now (schema present) and just not show them,
5. **Locale routing**: prefix all routes (`/en/...`, `/vi/...`) 
6. **Reward image upload**: MVP scope says avatars only (§22). Ship rewards with emoji/icon only in MVP; image upload deferred.

---

## 13. First Concrete Next Step

Once decisions in §12 are locked, kick off Phase 1 by:
1. `pnpm create next-app@latest . --ts --tailwind --app --src-dir=false --import-alias "@/*"`
2. Install: `@supabase/ssr @supabase/supabase-js next-intl zod hash-wasm`
3. Create Supabase project, paste keys into `.env.local`, run `0001_init.sql` + `0002_rls.sql`.
4. Land locale routing + parent magic-link auth.
5. Land children CRUD + avatar upload + PIN set.

Phase 2 begins after Phase 1's exit criterion is met.
