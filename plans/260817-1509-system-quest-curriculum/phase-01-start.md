---
phase: 1
title: "Child Age Support"
status: pending
priority: P1
effort: "2h"
dependencies: []
---

# Phase 1: Child Age Support

## Overview

Add `date_of_birth` to the `children` table and a helper to derive the child's current age. This is the prerequisite for all age-aware recommendation, filtering, and UX logic.

## Requirements

- Functional: Parent can set/edit a child's birthday; age is derived server-side; existing children without birthday continue working (nullable column).
- Non-functional: Age computation must handle timezone edge cases; never store age as a static field (always derive from `date_of_birth`).

## Architecture

1. New nullable column `date_of_birth date` on `children`.
2. SQL helper function `child_age(dob date)` returns integer age (floor of years since DOB).
3. Parent Kids management page gets a birthday picker field.
4. Server action `updateChildBirthday` validates and persists.
5. Child home page and Quest Library use `child_age()` for recommendation queries.

## Related Code Files

- Create: `supabase/migrations/0025_child_age.sql`
- Modify: `app/[locale]/(parent)/kids/page.tsx` — add birthday input
- Modify: `app/[locale]/(parent)/kids/actions.ts` — add `updateChildBirthday` server action (if exists; otherwise add to relevant kids action file)
- Modify: `lib/dev-family.ts` — no changes needed (age is DB-derived)

## Implementation Steps

1. **Migration `0025_child_age.sql`**:
   ```sql
   alter table children
     add column if not exists date_of_birth date;

   -- Helper: compute integer age from date_of_birth
   create or replace function child_age(dob date)
   returns integer
   language sql immutable as $$
     select extract(year from age(current_date, dob))::integer
   $$;

   -- Convenience: get age for a child_id
   create or replace function child_age_by_id(p_child_id uuid)
   returns integer
   language sql stable as $$
     select child_age(date_of_birth) from children where id = p_child_id
   $$;
   ```

2. **Parent UI — birthday field**: Add a date input to the child edit form on the kids page. Label: "Birthday" / "Ngày sinh". Not required — parent can skip it.

3. **Server action**: Zod schema with `z.string().date().optional().nullable()`. Update via `supabase.from("children").update({ date_of_birth }).eq("id", childId)`.

4. **i18n strings**: Add `parent.childBirthday`, `parent.childBirthdayHint` to both `messages/en.json` and `messages/vi.json`.

5. **Dev seed**: Optionally set `date_of_birth` for dev children in `0007_dev_seed.sql` (or a new seed file) so recommendation testing works immediately.

## Success Criteria

- [ ] `children.date_of_birth` column exists (nullable)
- [ ] `child_age(date)` SQL function returns correct integer age
- [ ] Parent can set birthday from kids management page
- [ ] Existing children without birthday are unaffected (null)
- [ ] Age display shows on child profile card (e.g., "Berry · Age 9")

## Risk Assessment

- **Risk**: Parent never sets birthday → recommendation engine has no age signal.
  - **Mitigation**: Quest Library still works with manual domain/difficulty filters. Show a gentle prompt: "Set Berry's birthday to get personalized quest recommendations."
  - **Signal it broke**: >50% of children have null `date_of_birth` after 30 days.
  - **Response**: Add birthday prompt to onboarding flow (not in V1 scope).
