-- 0030_dedup_system_templates.sql
-- Part 1: Remove legacy system task templates (from 0006_seed_templates) that were
-- superseded by richer curriculum templates (0027/0028). The duplicates share
-- the same name but the old rows lack a template_key (NULL) while the new
-- curriculum rows have a BQ-* template_key.
-- Safe: is_system_template rows under nil-UUID family have no child assignments.

DELETE FROM tasks
WHERE is_system_template = true
  AND family_id = '00000000-0000-0000-0000-000000000000'
  AND template_key IS NULL
  AND name IN (
    'Make My Bed',
    'Clear My Plate',
    'Plan My Week',
    'Help Prepare Dinner'
  );

-- Part 2: Backfill age metadata on family tasks that were cloned from curriculum
-- templates but were created before min_age/max_age/recommended_age existed.
-- Matches via source_template_key → system template's template_key.
-- Only touches rows where min_age is still NULL (safe to run multiple times).

UPDATE tasks AS ft
SET
  min_age          = st.min_age,
  recommended_age  = st.recommended_age,
  max_age          = st.max_age
FROM tasks AS st
WHERE ft.is_system_template = false
  AND ft.min_age IS NULL
  AND ft.source_template_key IS NOT NULL
  AND st.is_system_template = true
  AND st.template_key = ft.source_template_key;

-- Part 3: For family tasks cloned from OLD templates (0006 era, no template_key),
-- match by name against the now-upgraded system templates that do have age data.

UPDATE tasks AS ft
SET
  min_age          = st.min_age,
  recommended_age  = st.recommended_age,
  max_age          = st.max_age
FROM tasks AS st
WHERE ft.is_system_template = false
  AND ft.min_age IS NULL
  AND ft.source_template_key IS NULL
  AND st.is_system_template = true
  AND st.template_key IS NOT NULL
  AND st.name = ft.name;
