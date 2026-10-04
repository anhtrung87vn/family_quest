---
phase: 3
title: "Seed Curriculum 180 Templates"
status: pending
priority: P1
effort: "8h"
dependencies: [2]
---

# Phase 3: Seed Curriculum 180 Templates

## Overview

Seed all 180 System Quest templates from the curriculum document (`docs/BloomQuest_System_Quest_Curriculum_Implementation_Plan.md` sections 25). Each template gets bilingual titles/descriptions, age metadata, domain, behavior type, independence level, difficulty, parent tips, development goals, template keys, and skill ladder references.

## Requirements

- Functional: 180 templates (15 per age, ages 7-18) inserted as system templates; existing ~60 system templates preserved; no family tasks modified; all templates bilingual (en + vi).
- Non-functional: Migration idempotent via `ON CONFLICT (template_key) DO NOTHING`; bulk insert performance acceptable; total seed SQL under 50KB.

## Architecture

### Template Key Convention

```
BQ-{DOMAIN}-{SHORT_NAME}-A{AGE}
```

Examples:
```
BQ-LIFE-MAKE-BED-A07
BQ-MONEY-NEEDS-WANTS-A07
BQ-DIGITAL-AI-VERIFY-A12
BQ-WORLD-CAREER-MATRIX-A17
```

### Mapping from curriculum document to DB fields

| Document field | DB column | Transformation |
|---------------|-----------|---------------|
| Domain emoji | `skill_domain` | Map emoji to enum (🧠→LEARNING, 🎯→SELF_MANAGEMENT, etc.) |
| Behavior type | `behavior_type` | 🌱→responsibility, 🌿→habit_building, 🎯→challenge, ❤️→character |
| Assigned/Both/Choice Pool | `availability_type` | Direct map to assigned_only/both/choice_pool |
| Guided/Supported/Independent | `independence_level` | Direct map |
| "small temporary reward" | `coin_reward=3, star_reward=1` | Default for habit tasks |
| Age anchor | `recommended_age=N, min_age=N-1, max_age=N+2` | Approximate; curated per template |
| `in_pool` | derived from `availability_type` | choice_pool or both → `in_pool=true` |

### Reward defaults by behavior type

| Behavior | Coins | Stars | Notes |
|----------|-------|-------|-------|
| Responsibility | 0 | 0 | Per curriculum §15 |
| Habit Building | 3 | 1 | Small temporary; fading applies |
| Challenge (easy) | 5 | 1 | Difficulty 1-3 |
| Challenge (moderate) | 8 | 2 | Difficulty 4-6 |
| Challenge (hard) | 12 | 4 | Difficulty 7-8 |
| Challenge (major project) | 20 | 8 | Difficulty 9-10 |
| Character | 0 | 2 | Recognition > coins |
| Family | 0 | 2 | Recognition-focused |

### Skill ladder assignments

Map templates to 14 ladders defined in curriculum §13:

```
COOKING: L1(A07)→L9(A18)
HOUSEHOLD_CARE: L1(A07)→L8(A17)
PERSONAL_ORGANIZATION: L1(A07)→L8(A18)
READING: L1(A07)→L6(A14)
RESEARCH: L1(A09)→L5(A15)
COMMUNICATION: L1(A07)→L7(A17)
MONEY: L1(A07)→L12(A18)
DIGITAL_SAFETY: L1(A10)→L6(A16)
AI_LITERACY: L1(A12)→L3(A16)
FAMILY_CONTRIBUTION: L1(A07)→L6(A17)
PLANNING: L1(A08)→L8(A17)
PROJECT_EXECUTION: L1(A12)→L5(A18)
CAREER_EXPLORATION: L1(A13)→L4(A18)
TRAVEL_NAVIGATION: L1(A09)→L4(A17)
```

## Related Code Files

- Create: `supabase/migrations/0027_seed_curriculum.sql` — main seed (ages 7-12, ~90 templates)
- Create: `supabase/migrations/0028_seed_curriculum_teens.sql` — teen seed (ages 13-18, ~90 templates)
- Modify: `supabase/migrations/0007_dev_seed.sql` — add `date_of_birth` for dev children (or separate migration)

## Implementation Steps

1. **Structure the seed SQL**: Split into two migration files for maintainability. Each uses a single `INSERT INTO tasks (...) VALUES (...), (...), ... ON CONFLICT DO NOTHING;` block per age group.

2. **Age 7 example** (15 rows):
   ```sql
   INSERT INTO tasks (
     family_id, name, name_vi, description, description_vi,
     category, skill_domain, behavior_type, availability_type,
     coin_reward, star_reward, difficulty, independence_level,
     min_age, recommended_age, max_age,
     development_goal, development_goal_vi, parent_tip, parent_tip_vi,
     template_key, skill_ladder_key, skill_ladder_level,
     requires_approval, requires_supervision, in_pool, pool_max_per_day,
     is_system_template, active
   ) VALUES
   (
     '00000000-0000-0000-0000-000000000000',
     'Make My Bed', 'Dọn Giường Mỗi Sáng',
     'Make your bed neatly every morning', 'Tự dọn giường gọn gàng mỗi sáng',
     'responsibility', 'LIFE_HOME', 'responsibility', 'assigned_only',
     0, 0, 1, 'GUIDED',
     6, 7, 9,
     'Build the habit of starting the day with a completed task.',
     'Tập thói quen bắt đầu ngày mới bằng việc hoàn thành một công việc.',
     'Show the steps once, then let the child try independently.',
     'Hướng dẫn một lần, sau đó để con tự làm.',
     'BQ-LIFE-MAKE-BED-A07', 'HOUSEHOLD_CARE', 1,
     false, false, false, null,
     true, true
   ),
   -- ... 14 more rows for Age 7
   ON CONFLICT DO NOTHING;
   ```

3. **Repeat for each age 8-18**: Follow the curriculum document exactly for title, domain, behavior type, availability, and independence level. Generate Vietnamese translations for all fields.

4. **Vietnamese translations**: Every template needs `name_vi`, `description_vi`, `development_goal_vi`, `parent_tip_vi`. Use natural, age-appropriate Vietnamese — not machine translation.

5. **Backfill existing system templates**: Update the ~60 existing system templates with curriculum fields where they match (e.g., "Make My Bed" already exists — update it with `template_key`, `skill_domain`, `min_age`, etc. rather than inserting a duplicate).

6. **Validation script**: After seeding, run a verification query:
   ```sql
   SELECT recommended_age, count(*) as cnt
   FROM tasks
   WHERE is_system_template = true AND template_key IS NOT NULL
   GROUP BY recommended_age
   ORDER BY recommended_age;
   -- Expected: 15 rows per age 7-18 = 180 total
   ```

## Success Criteria

- [ ] 180 system templates with `template_key` values exist
- [ ] Every age 7-18 has exactly 15 templates
- [ ] All templates have bilingual `name`/`name_vi`, `description`/`description_vi`
- [ ] All templates have `skill_domain`, `behavior_type`, `availability_type`, `independence_level`
- [ ] All templates have `min_age`, `recommended_age`, `max_age` set
- [ ] All templates have `development_goal` + `development_goal_vi`
- [ ] All templates have `parent_tip` + `parent_tip_vi`
- [ ] Existing ~60 system templates are updated (not duplicated) where they overlap
- [ ] `template_key` unique constraint holds
- [ ] Migration runs cleanly on fresh and existing databases

## Risk Assessment

- **Risk**: Vietnamese translations are low quality or missing nuance.
  - **Mitigation**: Translations should be reviewed by a Vietnamese speaker. Use clear, simple language appropriate for parents.
  - **Signal**: User feedback on awkward translations.
  - **Response**: Update `name_vi`/`description_vi` in a follow-up migration.

- **Risk**: Existing system templates conflict with new template_key.
  - **Mitigation**: Update existing rows first (match by `name`), then insert new rows with `ON CONFLICT DO NOTHING`.
  - **Signal**: Migration error on unique constraint.
  - **Response**: Fix conflicting keys before re-running.

- **Risk**: 180-row INSERT is too large for a single statement.
  - **Mitigation**: Split into two files (ages 7-12 and 13-18). Each ~90 rows is well within Postgres limits.
