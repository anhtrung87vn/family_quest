---
phase: 1
title: "Schema — responsibility_policy + responsibility_events"
status: pending
priority: P1
effort: "3h"
dependencies: []
---

# Phase 1: Schema — responsibility_policy + responsibility_events

## Overview

Add the `responsibility_policy` column to the `tasks` table and create the `responsibility_events` table with proper RLS, indexes, and backward-compatible defaults. This is the foundation for all subsequent phases.

## Requirements

- Functional:
  - Add `responsibility_policy` column to `tasks` with allowed values: `NONE`, `REPAIR_REQUIRED`, `COMPLETE_BEFORE_PRIVILEGE`, `PARENT_DECIDES`
  - Default to `NONE` for backward compatibility (existing tasks unchanged)
  - Create `responsibility_events` table with all fields from spec section 7
  - Enable RLS on `responsibility_events` with family-scoped policies
  - Add indexes for efficient queries
  - Migration must be idempotent (`IF NOT EXISTS` / `IF EXISTS`)
- Non-functional:
  - No existing migration files modified
  - All existing tests pass
  - Zero downtime deployment (additive schema change only)

## Architecture

### responsibility_policy on tasks

```sql
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS responsibility_policy text
    NOT NULL DEFAULT 'NONE'
    CHECK (responsibility_policy IN ('NONE', 'REPAIR_REQUIRED', 'COMPLETE_BEFORE_PRIVILEGE', 'PARENT_DECIDES'));
```

This column determines what happens when a responsibility-type task is missed. Only meaningful when `behavior_type = 'responsibility'`, but stored on all tasks (defaulting to `NONE` for non-responsibility tasks).

### responsibility_events table

```sql
CREATE TABLE IF NOT EXISTS responsibility_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id       uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  child_id        uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  task_id         uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  task_assignment_id uuid REFERENCES task_assignments(id) ON DELETE SET NULL,
  task_completion_id uuid REFERENCES task_completions(id) ON DELETE SET NULL,

  event_type      text NOT NULL CHECK (event_type IN (
    'FORGOTTEN', 'NEEDED_HELP', 'EXCUSED', 'REFUSED', 'REMINDER'
  )),
  status          text NOT NULL DEFAULT 'OPEN' CHECK (status IN (
    'OPEN', 'RESOLVED', 'CANCELLED'
  )),

  occurred_at     timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz,

  created_by      uuid REFERENCES users(id),
  parent_note     text,
  reminder_count  integer NOT NULL DEFAULT 0,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
```

### RLS Policies

Parent read/write scoped by `family_id = auth_family_id()`. Child read own events (via admin client in server actions, not RLS — child is not auth.user). Service-role access for child actions mirrors existing child action pattern.

```sql
-- Parent: full access within family
CREATE POLICY responsibility_events_family ON responsibility_events
  FOR ALL USING (family_id = auth_family_id())
  WITH CHECK (family_id = auth_family_id());
```

### Indexes

```sql
CREATE INDEX IF NOT EXISTS resp_events_family_idx ON responsibility_events(family_id);
CREATE INDEX IF NOT EXISTS resp_events_child_status_idx ON responsibility_events(child_id, status);
CREATE INDEX IF NOT EXISTS resp_events_task_idx ON responsibility_events(task_id);
CREATE INDEX IF NOT EXISTS resp_events_child_occurred_idx ON responsibility_events(child_id, occurred_at DESC);
```

## Related Code Files

- Create: `supabase/migrations/0029_responsibility_events.sql`
- Modify: None (purely additive migration)

## Implementation Steps

1. Create migration file `supabase/migrations/0029_responsibility_events.sql`
2. Add `responsibility_policy` column to `tasks` table with `NOT NULL DEFAULT 'NONE'`
3. Create `responsibility_events` table with all fields
4. Enable RLS and add family-scoped policy
5. Add performance indexes
6. Backfill: set `responsibility_policy = 'REPAIR_REQUIRED'` for system templates with `behavior_type = 'responsibility'` (only system templates, NOT family tasks)
7. Run migration against local Supabase to verify
8. Verify existing task queries still work with the new column

## Success Criteria

- [ ] `responsibility_policy` column exists on `tasks` with correct CHECK constraint
- [ ] Default is `NONE` — all existing tasks unaffected
- [ ] `responsibility_events` table exists with all specified columns
- [ ] RLS enabled with family-scoped read/write policy
- [ ] Indexes created for child_id+status, family_id, task_id, child_id+occurred_at
- [ ] System responsibility templates have `responsibility_policy = 'REPAIR_REQUIRED'`
- [ ] Migration is idempotent (can run twice without error)
- [ ] Existing `SELECT * FROM tasks` queries return data without error (new column has default)

## Risk Assessment

- **Risk**: Migration number conflict with curriculum plan (0026-0028 already used by curriculum). **Mitigation**: Use 0029 — coordinate numbering. If curriculum plan takes 0029, renumber to next available.
- **Risk**: Large table ALTER on tasks in production. **Mitigation**: `ADD COLUMN ... DEFAULT` is online in Postgres 11+ (constant default, no table rewrite).
- **Risk**: Backfilling system templates could affect family-cloned copies. **Mitigation**: Only update `is_system_template = true` rows. Family copies are separate rows.
- **Risk**: `ADD COLUMN IF NOT EXISTS` with inline CHECK constraint — Postgres does not support `ADD COLUMN IF NOT EXISTS ... CHECK (...)` in a single statement reliably across all versions. **Mitigation**: Use separate `ADD COLUMN IF NOT EXISTS` then `ADD CONSTRAINT IF NOT EXISTS` or use `DO $$ BEGIN ... EXCEPTION WHEN ... END $$` pattern like existing migrations.
- **Risk**: `responsibility_events` table has both `task_assignment_id` and `task_completion_id` as nullable FKs. If a task is never assigned (manual parent observation), these could both be null. **Mitigation**: This is acceptable — the event is anchored by `task_id` + `child_id` + `occurred_at`. Assignment/completion IDs are optional cross-references.
- **Risk**: No unique constraint preventing duplicate events for the same child+task+date. **Mitigation**: Add a dedup check in the server action (Phase 2), not a DB constraint, since a child could legitimately have multiple FORGOTTEN events for the same task on different occasions within a day (e.g., morning and evening routines).
