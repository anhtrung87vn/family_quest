# Agent Context — Family Reward / BloomQuest

> Comprehensive coding rules for consistent development across the project.

---

## 1. Project Overview

**BloomQuest Family** is a bilingual (English/Vietnamese) Next.js family task/reward app. It distinguishes between responsibilities, habit-building tasks, challenges, and character/family contributions so children do not learn that every good behavior must be paid.

### Core Philosophy

Whenever adding a new task or reward feature, ask:

- Does this help the child become more independent over time?
- Or does it make the child more dependent on BloomQuest rewards?

Prefer the first.

> Principle: Coins motivate a challenge. Stars show growth. Parent recognition gives meaning. Responsibilities build independence. Successful habits eventually graduate out of rewards.

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js App Router | 15.x |
| React | React + React DOM | 19.x |
| Language | TypeScript (strict mode) | 5.x |
| CSS | Tailwind CSS v4 (via `@tailwindcss/postcss`) | 4.x |
| Component variants | `class-variance-authority` + `clsx` | - |
| Database | Supabase (Postgres) | - |
| Auth (Parent) | Supabase Auth (Google OAuth + email/password) | - |
| Auth (Child) | Custom HMAC-signed HttpOnly cookie (argon2id PIN) | - |
| i18n | `next-intl` v3 | 3.x |
| Validation | Zod | 3.x |
| Testing | Vitest (unit) + Playwright (E2E) | - |
| Package Manager | pnpm | - |
| PWA | Serwist (production only) | 9.x |
| Deployment | Vercel (region: sin1) | - |
| Hashing | `hash-wasm` (argon2id for PIN hashing) | - |

---

## 3. Project Structure

```
app/
  layout.tsx                    # Root layout (metadata only, delegates to children)
  globals.css                   # Tailwind import + CSS custom properties + animations
  manifest.ts                   # PWA manifest
  sw.ts                         # Service worker (Serwist)
  offline/page.tsx              # Offline fallback page
  [locale]/
    layout.tsx                  # Locale layout: NextIntlClientProvider, InstallPrompt
    page.tsx                    # Landing/marketing page
    login/                      # Parent auth (Google + email/password)
    signout/                    # Auto-submit sign-out
    (parent)/
      layout.tsx                # Parent shell: auth guard, sidebar, nav
      dashboard/page.tsx
      tasks/                    # Task CRUD + assign + behavior type
        actions.ts              # Server actions
        TaskList.tsx             # Client component
        page.tsx                # Server component
      rewards/                  # Reward CRUD
      approvals/                # Task/reward approval queue
      quests/                   # Family quests
      kids/                     # Child management
      stats/                    # Statistics
      settings/                 # User preferences
      reflections/              # Weekly reflections
      evidence/[id]/            # Evidence detail view
    child/
      select/page.tsx           # Child picker
      pin/                      # PIN entry + session minting
      (app)/
        layout.tsx              # Child shell: session guard, header, BottomNav
        home/page.tsx           # Today's tasks grouped by behavior type
        quests/page.tsx         # Child quest view
        rewards/page.tsx        # Reward shop
        me/page.tsx             # Profile + journey
        actions.ts              # Child server actions
        error.tsx               # Error boundary
  api/
    auth/callback/route.ts      # OAuth callback + first-login onboarding
    cron/generate-assignments/  # Daily recurring task generation
    cron/cleanup-evidence/      # Evidence expiration
    addin/tasks/route.ts        # External integration endpoint
    backup/route.ts             # Data backup
    evidence/[id]/download/     # Evidence download

components/
  ui/                           # Shared UI components (Button, Card, EmptyState, etc.)

lib/
  supabase/
    server.ts                   # createClient() — cookie-based, anon key
    admin.ts                    # createAdminClient() — service-role, server-only
    client.ts                   # createClient() — browser-side
    fetch-retry.ts              # Exponential backoff for ECONNRESET
  auth/
    child-session.ts            # HMAC-signed cookie session for children
    pin.ts                      # argon2id PIN hashing
  i18n/
    routing.ts                  # next-intl routing config (locales: en, vi)
    request.ts                  # next-intl request config
  dev-family.ts                 # DEV_BYPASS + resolveContext()
  dev-tls-patch.ts              # TLS bypass for local Supabase
  ledger.ts                     # Coin/star transaction helpers
  category-style.ts             # Visual style lookups for categories, behaviors, stages
  recurrence.ts                 # Recurrence rule parsing + todayISO()
  levels.ts                     # Level system based on lifetime_stars
  streaks.ts                    # Streak tracking with grace-day logic
  badges.ts                     # Badge auto-awarding
  compress-image.ts             # Image compression utility

messages/
  en.json                       # English translations
  vi.json                       # Vietnamese translations

supabase/
  migrations/                   # Numbered SQL migrations (0001 through 0023+)

tests/                          # Vitest unit tests
e2e/                            # Playwright E2E tests
docs/                           # Architecture, DB schema, deployment docs
plans/                          # Feature plans (Habit.md, Evidence.md, etc.)
```

---

## 4. Architecture Rules

### Server-First

- **Server Components** are the default. Only add `"use client"` when the component needs interactivity (state, effects, event handlers, browser APIs).
- **Server Actions** handle all Supabase writes. Declared with `"use server"` at the top of `actions.ts` files.
- The browser never talks to Supabase directly except for auth session refresh via `@supabase/ssr`.

### Two Session Domains

- **Parent**: Supabase Auth (Google OAuth or email/password). Cookies managed by `@supabase/ssr` middleware. Session refreshed in `middleware.ts`.
- **Child**: Separate signed HttpOnly cookie (`bq_child`), 12h TTL, minted server-side after PIN verify. Child is NOT an `auth.user`. Child actions use `createAdminClient()` (service-role) scoped by `session.childId`.

### Data Access Patterns

| Context | Client | Use Case |
|---------|--------|----------|
| Server Component / Action (parent) | `resolveContext()` from `lib/dev-family.ts` | Returns `{ supabase, familyId, userId }` — real session or DEV_BYPASS fallback |
| Server Component / Action (child) | `createAdminClient()` from `lib/supabase/admin.ts` | Service-role, scoped by `getChildSession().childId` |
| Middleware | `createServerClient()` inline | Session refresh only |
| Browser component | `createClient()` from `lib/supabase/client.ts` | Auth session state only (rare) |
| Cron / API routes | `createAdminClient()` | Protected by `CRON_SECRET` bearer token |

### resolveContext() Priority

1. Real authenticated session (always wins, even in DEV_BYPASS mode)
2. DEV_BYPASS fallback (unauthenticated dev-only testing via `DEV_FAMILY_ID` / `DEV_USER_ID`)
3. Throw "Unauthorized"

---

## 5. Coding Conventions

### TypeScript

- **Strict mode** enabled. No `any` unless absolutely necessary (cast with comment).
- Use `@/*` path aliases (mapped to project root).
- Prefer `interface` for component props, `type` for unions and utility types.
- Every server action file starts with `"use server";` and imports `"@/lib/dev-tls-patch"`.
- Define inline types for complex data shapes near their usage (see `PoolTask`, `ClaimedPoolQuest` in child home).

### Server Actions Pattern

All server actions follow this structure:

```typescript
"use server";

import "@/lib/dev-tls-patch";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { resolveContext } from "@/lib/dev-family";

const requireFamily = resolveContext;

// 1. Define Zod schema
const schema = z.object({ /* ... */ });

// 2. Export async function taking FormData
export async function myAction(formData: FormData) {
  // 3. Parse + validate with Zod
  const parsed = schema.parse({
    field: formData.get("field"),
    // checkbox: formData.get("x") === "on"
    // coerce number: coerce in schema
  });

  // 4. Resolve auth context
  const { supabase, familyId } = await requireFamily();

  // 5. Database operation
  const { error } = await supabase.from("table").insert({ ... });
  if (error) throw error;

  // 6. Revalidate affected paths
  revalidatePath("/[locale]/(parent)/tasks", "page");
}
```

Key patterns:
- Use `z.coerce.number()` for numeric form fields.
- Checkbox values: `formData.get("x") === "on"` or `=== "true"`.
- `revalidatePath()` uses the route pattern (e.g., `"/[locale]/(parent)/tasks"`), with `"page"` as the second argument.
- For child actions: use `getChildSession()` instead of `resolveContext()`, and `createAdminClient()` for DB access.
- Non-critical side effects (badges, streaks) wrapped in try/catch with `console.error()` — never crash the main action.

### Zod Validation

- Always validate inputs with Zod schemas before database operations.
- Use `z.string().uuid()` for ID parameters.
- Use `z.coerce.number().int().min(N).max(M)` for numeric fields.
- Use `z.enum([...])` for constrained string values.
- Use `.optional().nullable()` for optional fields that can be null.

### Error Handling

- Server actions: throw on critical errors (`if (error) throw error`).
- Non-critical operations (badges, streaks, messages): wrap in try/catch, log with `console.error("[context]", error)`.
- Child home page: catches all data-fetch errors, sets `fetchError = true` and shows a banner instead of crashing.
- Prefix log messages with `[functionName]` for traceability.
- Never swallow errors silently — always log.

### Soft Delete

Tasks use soft-delete (`active: false`) to preserve history. Never hard-delete tasks. Rewards can be hard-deleted.

---

## 6. UI / Styling Conventions

### Tailwind CSS v4

- Uses `@import "tailwindcss"` in `globals.css` (not `@tailwind` directives).
- PostCSS plugin: `@tailwindcss/postcss`.
- **No `tailwind.config.ts`** — Tailwind v4 uses CSS-based configuration.

### Design System Colors

| Semantic | Tailwind Class | Usage |
|----------|---------------|-------|
| Brand | `amber-500` / `amber-600` | Primary buttons, coin indicators |
| Background | `stone-50` | Page backgrounds |
| Card | `white` + `border-stone-200` | Card backgrounds |
| Text primary | `stone-800` | Headings |
| Text secondary | `stone-500` / `stone-600` | Descriptions |
| Text muted | `stone-400` | Hints, inactive labels |
| Emerald | `emerald-*` | Responsibilities, graduated status |
| Amber | `amber-*` | Habit building, coins, brand |
| Blue | `blue-*` | Challenges, learning |
| Purple | `purple-*` | Stars, character, creativity |
| Pink | `pink-*` | Family |
| Indigo | `indigo-*` | Dream rewards |
| Red | `red-*` | Danger, delete |

### Component Patterns

**Button** (`components/ui/Button.tsx`):
- Uses `cva` (class-variance-authority) for variants: `primary`, `secondary`, `ghost`, `danger`.
- Sizes: `sm` (h-10), `md` (h-12), `lg` (h-14).
- Rounded: `rounded-xl`.
- Minimum touch target: 44px (enforced in `globals.css`).

**Card** (`components/ui/Card.tsx`):
- `rounded-2xl border border-stone-200 bg-white p-5 shadow-sm`.
- Accepts `className` for customization.

**EmptyState** (`components/ui/EmptyState.tsx`):
- Centered layout with emoji icon, title, optional description.

**Badges/Chips**:
- `rounded-full px-2 py-0.5 text-[11px] font-semibold` with semantic bg + text colors.
- Coin: `bg-amber-100 text-amber-700`.
- Star: `bg-purple-100 text-purple-700`.
- Streak: `bg-orange-100 text-orange-700`.

**Spacing**:
- Lists: `space-y-3` (cards), `space-y-2` (compact items).
- Page content: `space-y-5` (child home) or `space-y-4`.
- Grid gaps: `gap-2` to `gap-4`.

**Loading states** (`loading.tsx`):
- Skeleton screens with `animate-pulse`, `bg-stone-200` / `bg-stone-100`.
- Match the layout shape of the loaded content.

**Error boundary** (`error.tsx`):
- `"use client"` directive.
- Centered Card with emoji, message, and retry Button.

### Custom Animations

Defined in `globals.css`:
- `animate-confetti-fall` — celebration confetti.
- `animate-fade-in-up` — gentle entrance.
- `animate-bounce-in` — bouncy entrance for badges/achievements.

### Icons

- Use emoji for all icons (no icon library).
- Exception: Quest Coins use `<CoinIcon />` (`components/ui/CoinIcon.tsx`), because the 🪙 emoji renders silver on Apple and gold on Android. Plain-text messages say "xu" instead.
- Category → icon mapping in `lib/category-style.ts`.
- Reward → icon mapping in `rewardIcon()` function.
- Level → icon: `["🌱", "🧭", "🚀", "🌟", "🏆", "👑"]`.

---

## 7. i18n Rules

### Configuration

- Locales: `["en", "vi"]`, default: `"en"`.
- Locale prefix: `"always"` — every route starts with `/en/` or `/vi/`.
- Translation files: `messages/en.json` and `messages/vi.json`.
- Plugin: `createNextIntlPlugin("./lib/i18n/request.ts")` in `next.config.ts`.

### Usage in Components

**Server Components:**
```typescript
import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  // Use: t("parent.tasks"), t("child.hello", { name })
}
```

**Client Components:**
```typescript
import { useTranslations } from "next-intl";

export function MyComponent() {
  const t = useTranslations();
}
```

### Translation Key Structure

```json
{
  "common": { "appName", "coins", "stars", "save", "cancel", ... },
  "marketing": { "tagline", "parentLogin", "childMode" },
  "login": { "title", "signIn", "signUp", ... },
  "parent": { "dashboard", "tasks", "rewards", "approvals", ... },
  "child": { "hello", "tabs.*", "doneShort", "evidence*", ... }
}
```

### When Adding New Strings

1. Add the key to **both** `messages/en.json` and `messages/vi.json`.
2. Use the `t()` function — never hardcode user-visible text in components.
3. Exception: inline emoji + short labels in `category-style.ts` where i18n overhead is not justified.
4. System templates have `name_vi` / `description_vi` columns for bilingual display.
5. Use `localName(task)` / `localDesc(task)` helpers to pick the correct locale.

### Routing

Import navigation utilities from `@/lib/i18n/routing`:
```typescript
import { Link, redirect, usePathname, useRouter } from "@/lib/i18n/routing";
```

Never use `next/navigation` redirect directly — use `redirect({ href, locale })` from the routing module.

---

## 8. Database Conventions

### Migrations

- Sequential numbering: `0001_init.sql`, `0002_rls.sql`, ... (no gaps except the removed no-op `0004`).
- Located in `supabase/migrations/`. A fresh database is built by running all of them in order; there is no consolidated schema file.
- Never edit a migration that has been applied — add a new numbered one.

### Dates and time zone

- The family calendar is `Asia/Bangkok` (`lib/family-time.ts`). Servers run in UTC, so never use `getDate()` / `getDay()` / `toISOString().slice(0, 10)` for calendar logic.
- "Today" → `todayISO()` / `familyDateISO()`; weekday → `familyWeekday()`; week start → `mondayOfISO()`; midnight of a day as an instant (for `timestamptz` filters) → `familyDayStart(iso)`.
- Display dates with `timeZone: FAMILY_TIME_ZONE`. The database default time zone is also `Asia/Bangkok` (migration `0039`).
- Always use `if not exists` / `if exists` for idempotent DDL.

### Row-Level Security (RLS)

- Every table has RLS enabled (see `0002_rls.sql`).
- Family isolation enforced through `auth_family_id()` SECURITY DEFINER function that resolves `auth.uid()` → `users.family_id`.
- System templates use `family_id = '00000000-0000-0000-0000-000000000000'` (nil UUID).

### Key Tables

| Table | Purpose |
|-------|---------|
| `families` | One row per family |
| `users` | Parents; `id = auth.users.id`, FK to `families` |
| `user_preferences` | Parent locale preference |
| `children` | Child profiles with `pin_hash`, `avatar_url`, `lifetime_stars` |
| `tasks` | Task definitions with `behavior_type`, `availability_type`, `evidence_type` |
| `task_assignments` | Per-child task assignments with `due_date`, `status` |
| `task_completions` | Completion records with `status`, `parent_note`, `celebration_message` |
| `task_evidence` | Evidence metadata (photo/audio/text/choice) per completion |
| `rewards` | Reward definitions with `coin_cost`, `category`, `stock` |
| `reward_redemptions` | Redemption requests with approval flow |
| `coin_transactions` | Append-only coin ledger |
| `star_transactions` | Append-only star ledger |
| `child_balances` | View computing current balances |
| `child_streaks` | Streak tracking with grace-day logic |
| `child_task_reward_progress` | Per-child habit fading stages |
| `parent_messages` | Parent→child messages with media |
| `family_memories` | Promoted evidence (permanent storage) |
| `pool_claims` / `pool_refresh_log` | Quest pool tracking |
| `child_pool_config` | Per-child pool configuration |

### Ledger Invariants

- Coin/star transactions are **append-only** (insert-only, never update/delete).
- Balance is computed from the sum of transactions (via `child_balances` view).
- Coins are deducted at redemption request time (hold pattern). Refunded on reject/cancel.
- SECURITY DEFINER functions: `award_task`, `auto_award_task`, `submit_task`, `request_redemption`, `redeem_reward`, `reject_redemption`.

### Enums

| Column | Values | Default |
|--------|--------|---------|
| `tasks.behavior_type` | `responsibility`, `habit_building`, `challenge`, `character`, `family` | `challenge` |
| `tasks.availability_type` | `assigned_only`, `choice_pool`, `both` | `assigned_only` |
| `tasks.evidence_type` | `none`, `photo`, `audio`, `text`, `choice`, `parent_observation` | `none` |
| `task_assignments.assignment_source` | `parent`, `choice_pool`, `family`, `system` | `parent` |
| `child_task_reward_progress.reward_stage` | `full_reward`, `reduced_reward`, `stars_only`, `graduated` | `full_reward` |
| `task_evidence.status` | `active`, `promoted`, `deleted`, `expired` | `active` |

---

## 9. Testing

### Unit Tests (Vitest)

- Located in `tests/` directory.
- Config: `vitest.config.ts` with `@` path alias.
- Test file naming: `*.test.ts`.
- Pattern: `describe` → `it` blocks with `expect`.
- Test pure logic only (no Supabase mocking). Examples: `levels.test.ts`, `category-style.test.ts`, `recurrence.test.ts`.

**Run:** `pnpm test` (single run) or `pnpm test:watch` (watch mode).

### E2E Tests (Playwright)

- Located in `e2e/` directory.
- Config: `playwright.config.ts`.
- Test file naming: `*.spec.ts`.

**Run:** `pnpm test:e2e`.

### Verification Commands

```bash
pnpm typecheck     # TypeScript type checking
pnpm lint          # ESLint
pnpm test          # Vitest unit tests
pnpm build         # Full production build
pnpm test:e2e      # Playwright E2E
```

---

## 10. Development Mode (DEV_BYPASS)

When `NODE_ENV === "development"` and `DEV_FAMILY_ID` is set in `.env.local`:

- Server actions work without authentication via `resolveContext()` fallback.
- `awardTask` in `ledger.ts` has a full DEV_BYPASS path that replicates the SECURITY DEFINER function logic using `createAdminClient()`.
- Parent layout skips auth redirect in development.
- TLS verification disabled for local Supabase (via `instrumentation.ts` undici patch + `NODE_TLS_REJECT_UNAUTHORIZED=0`).
- All server actions import `@/lib/dev-tls-patch` at the top for TLS bypass.

### Required `.env.local` for Dev

```env
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
DEV_FAMILY_ID=<uuid>
DEV_USER_ID=<uuid>
CHILD_SESSION_SECRET=<any-secret>
```

---

## 11. Security Rules

- **Service-role key** only in `lib/supabase/admin.ts`. Never import from Client Components.
- **CSP** enforced in `next.config.ts`. No third-party scripts. Frame ancestors: none.
- **Never** log or expose secrets, API keys, or service-role keys.
- **Never** expose `createAdminClient()` to client-side code.
- Child PIN hashing: argon2id via `hash-wasm`. Timing-safe comparison for session tokens.
- CRON endpoints protected by `CRON_SECRET` bearer token.
- Storage paths scoped by `{family_id}/{child_id}/` for RLS-like isolation.
- File upload validation: MIME type allowlists, size limits (10MB evidence, 5MB reward images, 20MB message media).

---

## 12. Deployment

- **Platform:** Vercel (region: `sin1`).
- **Build:** `pnpm install` → `next build`.
- **Crons:**
  - `POST /api/cron/generate-assignments` — daily at 22:00 UTC (recurring task creation).
  - `POST /api/cron/cleanup-evidence` — daily at 03:00 UTC (evidence expiration).
- **PWA:** Serwist service worker only in production builds.
- **Environment variables:** See `.env.example`.

---

## 13. Style Utility Functions

When displaying categories, behaviors, or stages, use the existing utility functions in `lib/category-style.ts`:

```typescript
import { taskStyle, rewardStyle, behaviorStyle, stageStyle, rewardIcon, levelIcon } from "@/lib/category-style";

taskStyle("learning")       // → { icon, color, bg, border }
rewardStyle("dream")        // → { icon, color, bg, border, accent }
behaviorStyle("responsibility") // → { icon, color, bg, border, label_en, label_vi }
stageStyle("graduated")     // → { icon, color, bg, label_en, label_vi }
rewardIcon("Ice Cream")     // → "🍦"
levelIcon(3)                // → "🚀"
```

Never duplicate these mappings — always use the centralized functions.

---

## 14. Habit System — Current Status

### Implemented

- Database: `behavior_type`, `availability_type`, `assignment_source`, `child_task_reward_progress`, `effective_rewards()`.
- Server: `ledger.ts` respects reward stages; `createTask` includes behavior/availability; `updateBehaviorType` / `updateRewardStage` actions.
- UI: Parent task form with behavior/availability dropdowns; TaskList with behavior badges; Child home grouped by behavior type; Responsibilities show no coins; Habits show stage indicator.
- i18n: Both `en.json` and `vi.json` have behavior/habit strings.

### Remaining

- Parent UI for per-child habit management page.
- Habit graduation celebration animation.
- Weekly reflection child-visible view.
- Anti-farming daily/weekly reward limits.

---

## 15. Common Patterns Reference

### Page Component (Server)

```typescript
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function MyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const admin = createAdminClient();
  // ... fetch data, render
}
```

### Client Component

```typescript
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface Props { /* typed props */ }

export function MyComponent({ ... }: Props) {
  const [state, setState] = useState(...);
  // ...
}
```

### Form with Server Action

```tsx
<form action={myServerAction}>
  <input type="hidden" name="id" value={item.id} />
  <input name="name" required className="h-9 w-full rounded-lg border border-stone-300 px-3 text-sm" />
  <Button type="submit" size="sm">Save</Button>
</form>
```

### Supabase Query with Join

```typescript
const { data } = await admin
  .from("task_assignments")
  .select("id, status, task:tasks(id, name, category, coin_reward)")
  .eq("child_id", childId)
  .in("status", ["todo", "rejected"])
  .lte("due_date", today);
```

Handle array-or-object joins:
```typescript
const task = Array.isArray(a.task) ? a.task[0] : a.task;
```

### Revalidation

Always revalidate affected paths after mutations:
```typescript
revalidatePath("/[locale]/(parent)/tasks", "page");
revalidatePath("/[locale]/child/(app)/home", "page");
```

---

## 16. Do's and Don'ts

### Do

- Use `resolveContext()` for parent-side auth in server actions.
- Use `getChildSession()` for child-side auth.
- Validate all inputs with Zod before DB operations.
- Add translations to both `en.json` and `vi.json`.
- Use existing UI components (Button, Card, EmptyState).
- Use `taskStyle()`, `behaviorStyle()`, `stageStyle()`, etc. for consistent visuals.
- Wrap non-critical side effects in try/catch.
- Use `revalidatePath()` after mutations.
- Use `"force-dynamic"` for pages that show real-time data.
- Write unit tests for pure logic in `tests/`.
- Use emoji for icons (no icon library).
- Follow the `rounded-2xl` / `rounded-xl` / `rounded-full` hierarchy.
- Use `pnpm` for package management.

### Don't

- Don't import `createAdminClient` in client components.
- Don't hard-delete tasks (use soft-delete via `active: false`).
- Don't hardcode user-visible text — use `t()` from next-intl.
- Don't use `next/navigation` redirect — use `redirect()` from `@/lib/i18n/routing`.
- Don't add icon libraries (react-icons, lucide, etc.) — use emoji.
- Don't add UI component libraries (shadcn, MUI, etc.) — use the custom components in `components/ui/`.
- Don't modify ledger invariants (append-only coin/star transactions).
- Don't bypass RLS without clear justification and `createAdminClient()`.
- Don't add `tailwind.config.ts` — Tailwind v4 uses CSS config.
- Don't use `@tailwind` directives — use `@import "tailwindcss"`.
- Don't expose service-role keys or secrets in client-side code.
- Don't add new dependencies without checking existing ones first.
