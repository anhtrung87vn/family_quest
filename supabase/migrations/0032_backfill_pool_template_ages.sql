-- 0032_backfill_pool_template_ages.sql
-- Backfill min_age / recommended_age / max_age on the 30 pool choice-quest
-- templates from 0012_quest_pool.sql. These have lowercase names and were
-- added before the curriculum age system existed.
-- Idempotent: only updates rows where min_age IS NULL.
-- All rows: is_system_template = true, family_id = nil UUID.

-- ── 📚 LEARNING ───────────────────────────────────────────────────────────────

-- "Learn about a country" (lowercase pool version)
-- Curiosity task, broad age, matches BQ-LEARN-ANIMAL-FACTS-A07 philosophy
UPDATE tasks SET min_age = 7, recommended_age = 9, max_age = 14
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Learn about a country';

-- "Read for fun" — reading for enjoyment, starts young
UPDATE tasks SET min_age = 6, recommended_age = 8, max_age = 18
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Read for fun';

-- "Learn 5 new words" — vocabulary, matches BQ-LEARN-ENG-WORDS-A07
UPDATE tasks SET min_age = 6, recommended_age = 7, max_age = 12
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Learn 5 new words';

-- "Mini research project" — matches BQ-LEARN-RESEARCH-Q-A09
UPDATE tasks SET min_age = 8, recommended_age = 10, max_age = 15
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Mini research project';

-- "English speaking practice" — matches BQ-COMM-ENG-SPEAK-A08
UPDATE tasks SET min_age = 7, recommended_age = 8, max_age = 14
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'English speaking practice';

-- ── 🎨 CREATIVITY ─────────────────────────────────────────────────────────────

-- "Draw something new" — creative expression, early start
UPDATE tasks SET min_age = 5, recommended_age = 7, max_age = 14
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Draw something new';

-- "Music practice" (pool lowercase version)
UPDATE tasks SET min_age = 6, recommended_age = 8, max_age = 18
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Music practice';

-- "Write a short story" — needs writing ability, age 8+
UPDATE tasks SET min_age = 7, recommended_age = 9, max_age = 15
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Write a short story';

-- "Make something with your hands" — craft/building, broad age
UPDATE tasks SET min_age = 5, recommended_age = 7, max_age = 14
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Make something with your hands';

-- "Design a greeting card" — art + social, age 6+
UPDATE tasks SET min_age = 5, recommended_age = 7, max_age = 14
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Design a greeting card';

-- ── ❤️ KINDNESS / FAMILY ──────────────────────────────────────────────────────

-- "Help someone today" — basic prosocial, age 5+
UPDATE tasks SET min_age = 5, recommended_age = 7, max_age = 18
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Help someone today';

-- "Write a thank-you note" — needs basic writing, age 7+
UPDATE tasks SET min_age = 6, recommended_age = 8, max_age = 14
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Write a thank-you note';

-- "Call or chat with grandparents" — age 6+ (can hold conversation)
UPDATE tasks SET min_age = 6, recommended_age = 8, max_age = 18
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Call or chat with grandparents';

-- "Help a sibling" — age 6+
UPDATE tasks SET min_age = 6, recommended_age = 8, max_age = 18
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Help a sibling';

-- "Do a random act of kindness" — social awareness, age 7+
UPDATE tasks SET min_age = 6, recommended_age = 8, max_age = 18
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Do a random act of kindness';

-- ── 🌱 RESPONSIBILITY ─────────────────────────────────────────────────────────

-- "Water the plants" — matches BQ-LIFE-WATER-PLANTS-A07
UPDATE tasks SET min_age = 5, recommended_age = 7, max_age = 18
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Water the plants';

-- "Tidy one space" — simple tidying, age 5+
UPDATE tasks SET min_age = 5, recommended_age = 7, max_age = 14
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Tidy one space';

-- "Set the table for dinner" — matches BQ-LIFE-SET-TABLE-A08
UPDATE tasks SET min_age = 5, recommended_age = 7, max_age = 14
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Set the table for dinner';

-- "Prepare tomorrow's school bag" — matches BQ-SELF-SCHOOL-BAG-A07/A08
UPDATE tasks SET min_age = 6, recommended_age = 8, max_age = 12
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Prepare tomorrow''s school bag';

-- "Screen time self-control" (pool lowercase) — age 7+
UPDATE tasks SET min_age = 7, recommended_age = 9, max_age = 15
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Screen time self-control';

-- ── 🏃 HEALTH / ACTIVITY ──────────────────────────────────────────────────────

-- "Go for a walk or bike ride" — age 6+
UPDATE tasks SET min_age = 6, recommended_age = 8, max_age = 18
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Go for a walk or bike ride';

-- "Exercise for 20 minutes" (pool lowercase) — broad age
UPDATE tasks SET min_age = 5, recommended_age = 8, max_age = 18
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Exercise for 20 minutes';

-- "Choose a healthy snack" — nutrition awareness, age 5+
UPDATE tasks SET min_age = 5, recommended_age = 7, max_age = 12
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Choose a healthy snack';

-- "Drink enough water today" — self-care habit, age 5+
UPDATE tasks SET min_age = 5, recommended_age = 7, max_age = 14
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Drink enough water today';

-- "Outdoor play" (pool lowercase) — age 5+
UPDATE tasks SET min_age = 5, recommended_age = 7, max_age = 14
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Outdoor play';

-- ── 🧭 EXPLORE / CURIOSITY ────────────────────────────────────────────────────

-- "Watch a nature documentary" — curiosity, age 6+
UPDATE tasks SET min_age = 6, recommended_age = 8, max_age = 14
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Watch a nature documentary';

-- "Cook or bake something simple" — matches BQ-LIFE-SANDWICH-A08 (age 7-9)
UPDATE tasks SET min_age = 7, recommended_age = 9, max_age = 14
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Cook or bake something simple';

-- "Learn a fun fact and share it" — broad curiosity, age 5+
UPDATE tasks SET min_age = 5, recommended_age = 7, max_age = 14
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Learn a fun fact and share it';

-- "Teach someone something" — matches BQ-COMM-TEACH-SKILL-A10 (age 9-11)
UPDATE tasks SET min_age = 8, recommended_age = 10, max_age = 18
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Teach someone something';

-- "Try something new today" — growth mindset, broad age
UPDATE tasks SET min_age = 6, recommended_age = 8, max_age = 16
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Try something new today';
