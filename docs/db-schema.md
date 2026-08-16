# DB Schema

Canonical DDL: `supabase/migrations/0001_init.sql`.
Canonical policies: `supabase/migrations/0002_rls.sql`.
Storage: `supabase/migrations/0003_storage.sql`.

## Tables (Phase 1)

- `families` — one row per family.
- `users` — parents; `id` = `auth.users.id`.
- `user_preferences` — parent locale.
- `children` — July, Berry; `pin_hash` (argon2id), `avatar_url` (signed URL), `preferred_language`.
- `tasks`, `task_assignments`, `task_completions` — schema present; UI in Phase 2.
- `rewards`, `reward_redemptions` — schema present; UI in Phase 2.
- `coin_transactions`, `star_transactions` — immutable ledgers; inserts only via SECURITY DEFINER functions in Phase 2. Balances via view `child_balances`.

## Habit System (0015)

- `tasks.behavior_type` — `responsibility | habit_building | challenge | character | family`. Default `challenge`.
- `tasks.availability_type` — `assigned_only | choice_pool | both`. Default `assigned_only`.
- `task_assignments.assignment_source` — `parent | choice_pool | family | system`. Default `parent`.
- `child_task_reward_progress` — per-child habit fading: `reward_stage` (`full_reward | reduced_reward | stars_only | graduated`), `completions` counter.
- `effective_rewards(coin, star, stage)` — SQL function computing effective rewards per stage.
- `award_task` / `auto_award_task` — updated to check `behavior_type` + `reward_stage`.

## Quest Pool (0012–0013)

- `tasks.in_pool`, `pool_max_per_day`, `pool_max_per_week` — pool membership.
- `child_pool_config` — per-child pool limits. Auto-created on child insert.
- `pool_claims`, `pool_refresh_log` — daily claim tracking.

## Parent Messages (0014)

- `parent_messages` — parent→child messages with types `QUEST_APPROVAL | WEEKLY_JOURNAL | GENERAL`.

## Evidence System (0016)

- `tasks.evidence_type` — `none | photo | audio | text | choice | parent_observation`. Default `none`.
- `tasks.evidence_required` — boolean, default `false`.
- `tasks.max_audio_seconds` — smallint 5–60, default `30`.
- `task_evidence` — evidence metadata per task completion: `evidence_type`, `storage_path`, `text_content`, `choice_value`, `audio_duration`, lifecycle `status` (`active | promoted | deleted | expired`), `expires_at`.
- `task_evidence.deletion_reason` — `PARENT_DELETED | AUTO_EXPIRED | PROMOTED_TO_MEMORY | SYSTEM_CLEANUP`.
- `task_evidence.memory_id` — FK to `family_memories` (set when promoted).
- Storage bucket `family-evidence` — private, 10 MB limit, RLS family-scoped via `{family_id}/…` folder path.
- Daily cron `cleanup-evidence` (03:00 UTC) — expires active media past `expires_at`.

## Family Memories (0017)

- `family_memories` — permanent storage for promoted evidence: `title`, `caption`, `media_type`, `media_storage_path`, `memory_date`, `source_type`, `source_id`, soft-delete via `deleted_at`.
- Storage bucket `family-memories` — private, permanent, no auto-expiration, RLS family-scoped.

## Post-MVP (not migrated yet)

`badges`, `child_badges`, `family_quests`, `family_quest_members`, `weekly_challenges`, `collections`, `child_collection_items`.

## Ledger invariants

See `plans/goldquest-mvp.md` §5. Enforced via `award_task(completion_id)` and `redeem_reward(redemption_id)` Postgres functions. Updated in 0015 to respect `behavior_type` and `reward_stage`.
