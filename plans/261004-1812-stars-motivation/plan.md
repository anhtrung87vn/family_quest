---
title: "Stars that keep motivating"
description: "Make Stars meaningful for years: longer level ladder, weekly responsibility stars, level-gated rewards, level-up gifts, and level-based avatar frames/themes."
status: done (pending 0038 apply + deploy)
priority: P1
created: 2026-10-04
---

# Stars that keep motivating

## Problem (review 2026-10-04)
- Stars only drive a 6-level title; an 8-year-old (~35 stars/week) hits the max level in ~3.5 months, an 11-year-old in ~2.5 months.
- Stars have no link to rewards; design §84 (frames, themes, unlocks) was never built.
- Graduated habits and responsibilities give 0 stars, so older, more independent children earn fewer stars.

## Decisions (user, 2026-10-04): build A + B + C + D
- **C** 12 levels up to 5,200 stars (top level ≈ 3 years at ~35 stars/week). Weekly responsibility consistency: ≥5 responsibility assignments last week, ≥90% done → 2 stars, ≥70% → 1 star (daily cron, idempotent per child/week).
- **A** `rewards.min_level`: reward stays priced in coins; it is locked until the child reaches the level. Enforced server-side on redeem.
- **B** `child_level_ups`: one row per level reached, with a privilege gift (from `lib/levels.ts`). Parent marks it given on Approvals. Existing levels are backfilled as already given.
- **D** Avatar frame (even levels) and profile theme (odd levels) auto-applied from the current level; Me page shows the collection.

## Constraints
- Stars are never spent. Coins remain the only currency.
- Level thresholds live only in `lib/levels.ts` (the migration backfill inlines them once).

## Acceptance
- Migration replays cleanly; `pnpm typecheck`, `pnpm lint`, `pnpm test` pass.
