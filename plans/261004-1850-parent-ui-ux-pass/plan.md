---
title: "Parent UI/UX pass"
description: "Fix the parent-side UX issues found in the 2026-10-04 screenshot review: one-tap approvals, compact age-aware Tasks, consistent language, safer reset actions, clearer Rewards/Overview/Family Quests, and small readability fixes."
status: done (pending visual check in browser)
priority: P1
created: 2026-10-04
---

# Parent UI/UX pass

## Findings → work packages (all approved by user)
| WP | Scope | Files owned |
|----|-------|-------------|
| A | Approvals: inline ✓/✗ per pending task, full task title, expand only for evidence/notes; relative time via `Intl.RelativeTimeFormat` | `approvals/page.tsx`, `components/ui/ApproveForm.tsx`, `components/ui/MessagesSection.tsx` |
| B | Tasks: compact cards (assign row behind a "Assign" toggle), out-of-age warning + "disable all tasks no child fits", child filter, i18n for "(đề xuất …)" and "Quản lý", hide 0-coin chip, tooltips | `tasks/page.tsx`, `tasks/TaskList.tsx`, `tasks/DangerZone.tsx`, `tasks/actions.ts` |
| C | Rewards: group by category (dream = flag chip, not a section), 3–4 column grid, age + 🔒 level chips, localized category labels; reset actions moved into a collapsed "Manage" danger zone with confirm (Rewards + Family Quests); Family Quests shows rewards are per child | `rewards/*`, `quests/page.tsx`, `quests/ResetQuestsButton.tsx`, `quests/CloneQuestsButton.tsx` |
| D | Overview: equal kid cards with empty-state + "Send by age", plural-safe pending text, family quest reward chips; Kids: i18n for hardcoded Vietnamese, tidy action buttons; Quest Library: "Difficulty x/10" label, default to first child; chip text ≥ 11px on touched pages | `dashboard/page.tsx`, `kids/page.tsx`, `library/QuestLibraryClient.tsx` |

Shared `messages/en.json` / `messages/vi.json` are edited only by the controller (agents return the keys they need).

## Non-goals
- Native date input format follows the browser locale; not changed.
- No new dependencies, no icon library (emoji + `CoinIcon`).

## Acceptance
- `pnpm typecheck`, `pnpm lint` (no new warnings), `pnpm test` pass.
- No hardcoded user-visible Vietnamese/English strings left in the touched files.

## Result (2026-10-04)
- WP A–D delivered; 50 i18n keys merged per locale (no conflicts; every `t()` key resolves in en and vi).
- Shared helpers: `lib/time-ago.ts`, `lib/task-age-fit.ts`; new `components/ui/PendingApprovalRow.tsx`; server action `disableOutOfAgeTasks`.
- Also fixed: task edit form now pre-fills evidence type / evidence required / requires approval (was resetting them on save); reward edit form "needs approval" read from `active`; stray "0" on Family Quests.
- typecheck clean, 1175 tests pass, no new lint warnings.
- Follow-ups: "Disable" and 🗑 on Tasks do the same thing; inline Reject has no confirm.
