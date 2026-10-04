---
phase: 2
title: "Schema Foundation"
status: pending
priority: P1
effort: "4h"
dependencies: [1]
---

# Phase 2: Schema Foundation

## Overview

Extend the `tasks` table with all curriculum-specific columns needed for age-aware System Quest templates: development domains, age metadata, difficulty (1-10 scale), independence level, template identity, skill ladders, and parent-facing guidance text.

## Requirements

- Functional: All new columns nullable for backward compatibility; existing tasks unchanged; new enum values validated via CHECK constraints; `template_key` unique for system templates.
- Non-functional: Migration is idempotent (`if not exists`); no data loss; no downtime.

## Architecture

Single migration file adding ~15 nullable columns to `tasks`. No new tables needed — curriculum metadata lives on the same `tasks` rows that already hold `behavior_type`, `availability_type`, `evidence_type`.

### New columns on `tasks`

| Column | Type | Constraint | Default | Purpose |
|--------|------|-----------|---------|---------|
| `skill_domain` | `text` | CHECK in 9 values | `null` | Primary development domain |
| `skill_subdomain` | `text` | — | `null` | Optional sub-categorization |
| `min_age` | `integer` | CHECK 4-21 | `null` | Minimum recommended age |
| `recommended_age` | `integer` | CHECK 4-21 | `null` | Anchor age for ranking |
| `max_age` | `integer` | CHECK 4-21 | `null` | Maximum recommended age |
| `difficulty` (widen) | `smallint` | CHECK 1-10 | existing | Expand from 1-3 to 1-10 |
| `independence_level` | `text` | CHECK in 3 values | `null` | GUIDED / SUPPORTED / INDEPENDENT |
| `estimated_minutes` | `integer` | CHECK 1-480 | `null` | Estimated time to complete |
| `recommended_frequency` | `text` | — | `null` | e.g., "daily", "weekly", "once" |
| `requires_supervision` | `boolean` | — | `false` | Safety flag |
| `development_goal` | `text` | — | `null` | Parent-facing "why this matters" |
| `development_goal_vi` | `text` | — | `null` | Vietnamese translation |
| `parent_tip` | `text` | — | `null` | Guidance for parent |
| `parent_tip_vi` | `text` | — | `null` | Vietnamese translation |
| `template_key` | `text` | UNIQUE where system | `null` | Stable identifier (e.g., BQ-MONEY-L01) |
| `source_template_key` | `text` | — | `null` | Key of system template this was copied from |
| `skill_ladder_key` | `text` | — | `null` | Ladder name (e.g., COOKING) |
| `skill_ladder_level` | `integer` | CHECK 1-20 | `null` | Level within the ladder |

### Widen `difficulty` constraint

Current: `difficulty between 1 and 3`. New: `difficulty between 1 and 10`. Must drop old constraint and add new one.

## Related Code Files

- Create: `supabase/migrations/0026_curriculum_schema.sql`
- Modify: `app/[locale]/(parent)/tasks/actions.ts` — update `createTaskSchema` to accept new fields; update `cloneSystemTemplates()` to copy new columns
- Modify: `lib/category-style.ts` — add `domainStyle()` function for 9 skill domains
- Modify: `messages/en.json` + `messages/vi.json` — add domain labels, independence level labels

## Implementation Steps

1. **Migration `0026_curriculum_schema.sql`**:

   ```sql
   -- Widen difficulty from 1-3 to 1-10
   alter table tasks drop constraint if exists tasks_difficulty_check;
   alter table tasks add constraint tasks_difficulty_check
     check (difficulty between 1 and 10);

   -- Curriculum columns
   alter table tasks
     add column if not exists skill_domain text
       check (skill_domain in (
         'LEARNING','SELF_MANAGEMENT','LIFE_HOME','MONEY',
         'COMMUNICATION','CHARACTER_FAMILY','HEALTH','DIGITAL',
         'WORLD_INDEPENDENCE'
       )),
     add column if not exists skill_subdomain text,
     add column if not exists min_age integer check (min_age between 4 and 21),
     add column if not exists recommended_age integer check (recommended_age between 4 and 21),
     add column if not exists max_age integer check (max_age between 4 and 21),
     add column if not exists independence_level text
       check (independence_level in ('GUIDED','SUPPORTED','INDEPENDENT')),
     add column if not exists estimated_minutes integer check (estimated_minutes between 1 and 480),
     add column if not exists recommended_frequency text,
     add column if not exists requires_supervision boolean not null default false,
     add column if not exists development_goal text,
     add column if not exists development_goal_vi text,
     add column if not exists parent_tip text,
     add column if not exists parent_tip_vi text,
     add column if not exists template_key text,
     add column if not exists source_template_key text,
     add column if not exists skill_ladder_key text,
     add column if not exists skill_ladder_level integer check (skill_ladder_level between 1 and 20);

   -- Unique template_key for system templates only
   create unique index if not exists tasks_template_key_uniq
     on tasks(template_key)
     where template_key is not null and is_system_template = true;

   -- Index for age-based queries on system templates
   create index if not exists tasks_curriculum_idx
     on tasks(skill_domain, recommended_age)
     where is_system_template = true and active = true;

   -- Backfill skill_domain from category for existing system templates
   update tasks set skill_domain = 'LEARNING'
     where is_system_template = true and category = 'learning' and skill_domain is null;
   update tasks set skill_domain = 'LIFE_HOME'
     where is_system_template = true and category = 'responsibility' and skill_domain is null;
   update tasks set skill_domain = 'CHARACTER_FAMILY'
     where is_system_template = true and category = 'family' and skill_domain is null;
   update tasks set skill_domain = 'HEALTH'
     where is_system_template = true and category = 'health' and skill_domain is null;
   update tasks set skill_domain = 'LEARNING'
     where is_system_template = true and category = 'creativity' and skill_domain is null;
   ```

2. **Update `createTaskSchema`** in `app/[locale]/(parent)/tasks/actions.ts`:
   - Add optional fields: `skill_domain`, `min_age`, `recommended_age`, `max_age`, `independence_level`, `estimated_minutes`, `development_goal`, `parent_tip`, `requires_supervision`.
   - Keep all new fields optional — family-created tasks may not set them.

3. **Update `cloneSystemTemplates()`**: Include all new columns in the `select()` call so copies carry curriculum metadata. Set `source_template_key = t.template_key` on cloned rows.

4. **Add `domainStyle()` to `lib/category-style.ts`**:
   ```typescript
   export type SkillDomain = 'LEARNING' | 'SELF_MANAGEMENT' | 'LIFE_HOME' | 'MONEY' |
     'COMMUNICATION' | 'CHARACTER_FAMILY' | 'HEALTH' | 'DIGITAL' | 'WORLD_INDEPENDENCE';

   const DOMAIN_STYLES: Record<SkillDomain, { icon: string; color: string; bg: string; border: string; label_en: string; label_vi: string }> = {
     LEARNING:          { icon: '🧠', color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200',    label_en: 'Learning & Thinking',   label_vi: 'Học tập & Tư duy' },
     SELF_MANAGEMENT:   { icon: '🎯', color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',   label_en: 'Self Management',       label_vi: 'Tự quản lý' },
     LIFE_HOME:         { icon: '🏠', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label_en: 'Life & Home Skills',    label_vi: 'Kỹ năng sống' },
     MONEY:             { icon: '💰', color: 'text-yellow-600',  bg: 'bg-yellow-50',  border: 'border-yellow-200',  label_en: 'Money',                 label_vi: 'Tiền bạc' },
     COMMUNICATION:     { icon: '💬', color: 'text-cyan-600',    bg: 'bg-cyan-50',    border: 'border-cyan-200',    label_en: 'Communication',         label_vi: 'Giao tiếp' },
     CHARACTER_FAMILY:  { icon: '❤️', color: 'text-pink-600',    bg: 'bg-pink-50',    border: 'border-pink-200',    label_en: 'Character & Family',    label_vi: 'Phẩm chất & Gia đình' },
     HEALTH:            { icon: '🏃', color: 'text-orange-600',  bg: 'bg-orange-50',  border: 'border-orange-200',  label_en: 'Health',                label_vi: 'Sức khỏe' },
     DIGITAL:           { icon: '💻', color: 'text-indigo-600',  bg: 'bg-indigo-50',  border: 'border-indigo-200',  label_en: 'Digital Intelligence',  label_vi: 'Kỹ năng số' },
     WORLD_INDEPENDENCE:{ icon: '🌍', color: 'text-teal-600',    bg: 'bg-teal-50',    border: 'border-teal-200',    label_en: 'World & Independence',  label_vi: 'Thế giới & Tự lập' },
   };
   ```

5. **Add i18n strings** for domain labels, independence levels, and quest library UI text.

6. **Write unit test** `tests/curriculum-schema.test.ts` — validate domain enum values, age range logic, template_key format regex.

## Success Criteria

- [ ] All new columns exist on `tasks` table (nullable)
- [ ] `difficulty` constraint widened to 1-10 without data loss
- [ ] `template_key` uniqueness enforced for system templates
- [ ] Existing tasks unchanged (all new columns null for non-system rows)
- [ ] `domainStyle()` function works for all 9 domains
- [ ] `createTaskSchema` accepts new optional fields
- [ ] `cloneSystemTemplates()` copies all new curriculum columns
- [ ] Build passes with no type errors

## Risk Assessment

- **Risk**: Dropping `difficulty` CHECK constraint on production could fail if concurrent writes happen.
  - **Mitigation**: Use `alter table ... drop constraint if exists` — idempotent and safe.
  - **Signal**: Migration rollback error in deploy logs.
  - **Response**: Retry deployment; constraint drop is fast DDL.

- **Risk**: `template_key` unique index creation blocks if duplicates exist.
  - **Mitigation**: Index is partial (`where template_key is not null and is_system_template = true`). No existing rows have `template_key` yet, so no conflicts possible.
