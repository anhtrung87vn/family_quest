---
title: "Age-based quest & reward economy"
description: "Rebalance coins to real VND prices, add evidence to every quest, spread quest and reward templates evenly across ages 6–17, and let parents send (or auto-provision on child creation) age-matched quests and rewards."
status: done
priority: P1
created: 2026-10-04
---

# Age-based quest & reward economy

## Outcome
- Reward template `coin_cost` reflects current Vietnamese retail prices at **1 coin = 1,000đ** (family experiences priced at one child's share = family cost ÷ 4; privileges priced by value).
- Quest template `coin_reward` is derived from effort (minutes, frequency, habit fading) so an 8-year-old earns ~150–210 coins/week and an 11-year-old ~250–335 coins/week at full engagement (design doc §71/§82 target 260–310).
- Every quest template has a fitting `evidence_type` (sharing, not surveillance).
- Quest and reward templates cover every age 6–17 with a similar count and mix.
- Parent can open "Send by age" for a child, review the suggested quests/rewards (from date of birth), and send them.
- Creating a child with a date of birth automatically adds age-matched pool quests and rewards.
- Child pool and reward shop only show items whose age range includes the child's age.

## Decisions (user-confirmed 2026-10-04)
- Exchange rate 1 coin = 1,000đ.
- Build the feature now, not only the data.
- Sending is parent-initiated (preview → confirm); auto-provision only on child creation.

## Constraints / non-goals
- Responsibilities and character/kindness quests keep 0 coins; stars unchanged (levels depend on them).
- Ledgers untouched; existing redemptions keep their recorded `coin_cost`.
- Never rewrite applied migrations; new numbered migrations only.
- Family copies are synced by a separate opt-in script that only touches rows still equal to the old template values.

## Phases
| # | Phase | Status |
|---|-------|--------|
| 1 | Schema `0035`: reward age columns, `template_key`, `source_template_key`, `reference_price_vnd` | ✅ done |
| 2 | Data `0036`: quest coins + evidence, legacy age retarget, new age-6 / teen-habit templates, reward prices + ages + new age-spread rewards, family-quest coins, backups | ✅ done (replayed 0001→0036 in PGlite) |
| 3 | Sync script for existing family copies (`supabase/scripts/`) | ✅ done (verified: parent edits preserved, re-runnable) |
| 4 | Shared age helpers (`lib/age.ts`) + provisioning (`lib/age-provisioning.ts`) | ✅ done (tests/age*.test.ts) |
| 5 | Feature: "Send by age" page, auto-provision on child create, child pool/shop age filter, clone copies new columns and skips inactive templates | ✅ done (typecheck, 1160 tests pass) |
| 6 | Docs: `docs/db-schema.md`, `full_schema.sql` | ✅ done |

## Acceptance
- Replaying `0001`→`0036` in PGlite succeeds; every age 6–17 has 13–19 quest templates with `recommended_age` = age and ≥20 eligible rewards.
- `pnpm typecheck`, `pnpm lint`, `pnpm test` pass.

## Evidence
- Prices: `plans/reports/researcher-261004-1648-vn-reward-prices.md`.

## Follow-up (2026-10-04, user decisions)
- Dream rewards stay at real prices (no compression).
- `0037`: child vs adult ticket split for cinema/theme park (11+), zero coins on pre-0034 kindness copies and routine family quests.
- Family quest completion now pays each contributing child (`awardFamilyQuest`).
- Applied on live DB by user: 0035, 0036, sync script. Pending: 0037 + deploy of app code.
