-- 0031_backfill_legacy_template_ages.sql
-- Backfill min_age / recommended_age / max_age on the 45 legacy system templates
-- from 0006_seed_templates.sql that have no curriculum age data.
-- Age ranges are derived from the 0027/0028 curriculum philosophy:
--   - Only updates rows where min_age IS NULL (idempotent).
--   - Only touches is_system_template = true rows.
--
-- Reasoning per group:
--   🌱 RESPONSIBILITIES (daily self-care): taught from age 5-6, optimal 7-8
--   🌿 HABIT BUILDING (school routines):   start age 7, optimal 8-9
--   🎯 CHALLENGES — LEARNING (basic):      start age 7, optimal 8-10
--   🎯 CHALLENGES — LEARNING (harder):     start age 9, optimal 10-12
--   🎯 CHALLENGES — HEALTH/ACTIVITY:       start age 6, broad range
--   🎯 CHALLENGES — SELF-MGMT (Grade 6+):  start age 11
--   ❤️ CHARACTER / FAMILY (basic):         start age 5, broad range
--   ❤️ CHARACTER / FAMILY (complex):       start age 9, optimal 10-12

-- ── 🌱 RESPONSIBILITIES ────────────────────────────────────────────────────────

-- Daily hygiene & tidy — age 5-6 start, optimal 7, continues indefinitely
UPDATE tasks SET min_age = 5, recommended_age = 7, max_age = 18
WHERE is_system_template = true AND min_age IS NULL
  AND name IN ('Put Away Belongings', 'Put Dirty Clothes Away', 'Brush Teeth');

-- Plant care — slightly more coordination needed, start 6
UPDATE tasks SET min_age = 6, recommended_age = 7, max_age = 18
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Take Care of Plants';

-- ── 🌿 HABIT BUILDING ─────────────────────────────────────────────────────────

-- School prep & desk — matches 0027 BQ-SELF-SCHOOL-BAG-A07/A08 (age 7-8)
UPDATE tasks SET min_age = 7, recommended_age = 8, max_age = 12
WHERE is_system_template = true AND min_age IS NULL
  AND name IN ('Prepare School Bag', 'Keep Desk Organized');

-- Homework independence — matches BQ-SELF-HW-NO-REMIND-A09 (age 8-10)
UPDATE tasks SET min_age = 7, recommended_age = 9, max_age = 13
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Finish Homework';

-- Laundry/tidying — matches BQ-LIFE-FOLD-CLOTHES-A09 (age 8-10)
UPDATE tasks SET min_age = 8, recommended_age = 9, max_age = 12
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Fold My Clothes';

-- Room cleaning — matches BQ-LIFE-ROOM-RESET-A10 (age 9-11)
UPDATE tasks SET min_age = 8, recommended_age = 10, max_age = 14
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Clean My Room';

-- Screen time self-control — developmentally age 8-9 start
UPDATE tasks SET min_age = 7, recommended_age = 9, max_age = 15
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Screen Time Self-Control';

-- Bedtime — age 6 start, optimal 8
UPDATE tasks SET min_age = 6, recommended_age = 8, max_age = 14
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Sleep on Time';

-- ── 🎯 CHALLENGES — LEARNING (basic) ──────────────────────────────────────────

-- Reading 20 min — matches BQ-LEARN-READ-20-A08 (age 7-9)
UPDATE tasks SET min_age = 6, recommended_age = 8, max_age = 12
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Read 20 Minutes';

-- Reading 30 min — matches BQ-LEARN-READ-30-A10 (age 9-12)
UPDATE tasks SET min_age = 8, recommended_age = 10, max_age = 14
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Read 30 Minutes';

-- English reading — age 7-8 start
UPDATE tasks SET min_age = 7, recommended_age = 8, max_age = 14
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'English Reading';

-- English vocabulary 5 words — matches BQ-LEARN-ENG-WORDS-A07 (age 6-8)
UPDATE tasks SET min_age = 6, recommended_age = 7, max_age = 11
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Learn 5 New English Words';

-- English vocabulary 10 words — harder, age 9-11
UPDATE tasks SET min_age = 8, recommended_age = 10, max_age = 14
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Learn 10 New English Words';

-- English speaking — matches BQ-COMM-ENG-SPEAK-A08 (age 7-9)
UPDATE tasks SET min_age = 7, recommended_age = 8, max_age = 13
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'English Speaking Practice';

-- Math practice — age 7-8, ongoing
UPDATE tasks SET min_age = 7, recommended_age = 8, max_age = 14
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Math Practice';

-- Handwriting — peaks at primary school age 6-9
UPDATE tasks SET min_age = 6, recommended_age = 8, max_age = 11
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Beautiful Handwriting';

-- Tell what you learned — matches BQ-COMM-TELL-LEARNED-A08 (age 7-9)
UPDATE tasks SET min_age = 6, recommended_age = 8, max_age = 12
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Tell Me What You Learned';

-- Review lessons — similar to Finish Homework (age 7-10)
UPDATE tasks SET min_age = 7, recommended_age = 9, max_age = 13
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Review Today''s Lessons';

-- Music practice — can start young, ongoing
UPDATE tasks SET min_age = 6, recommended_age = 8, max_age = 18
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Music Practice';

-- ── 🎯 CHALLENGES — LEARNING (big projects) ────────────────────────────────────

-- Finish a book — matches BQ-LEARN-LONG-READ-A14 (age 12-15 for longer reads)
UPDATE tasks SET min_age = 8, recommended_age = 10, max_age = 16
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Finish One Book';

-- Research project — matches BQ-LEARN-RESEARCH-Q-A09 (age 8-11)
UPDATE tasks SET min_age = 9, recommended_age = 11, max_age = 15
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Mini Research Project';

-- Creative drawing — can start early, optimal primary age
UPDATE tasks SET min_age = 5, recommended_age = 8, max_age = 14
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Draw Something Creative';

-- Learn about a country — curiosity task, age 8+
UPDATE tasks SET min_age = 7, recommended_age = 9, max_age = 14
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Learn About a Country';

-- ── 🎯 CHALLENGES — HEALTH & ACTIVITY ─────────────────────────────────────────

-- Exercise 20 min & Outdoor Play — broad age, matches BQ-HEALTH-EXERCISE-A13
UPDATE tasks SET min_age = 5, recommended_age = 8, max_age = 18
WHERE is_system_template = true AND min_age IS NULL
  AND name IN ('Exercise 20 Minutes', 'Outdoor Play');

-- Bike ride — needs motor skills, age 6+
UPDATE tasks SET min_age = 6, recommended_age = 8, max_age = 18
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Bike Ride';

-- Swimming — structured practice, age 7+
UPDATE tasks SET min_age = 6, recommended_age = 8, max_age = 16
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Swimming Practice';

-- Healthy snack choice — age 6, matches nutrition awareness
UPDATE tasks SET min_age = 5, recommended_age = 7, max_age = 12
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Healthy Snack Choice';

-- ── 🎯 CHALLENGES — SELF-MANAGEMENT (Grade 6+) ─────────────────────────────────

-- Weekly planning — matches BQ-SELF-PLAN-WEEK-A11 (age 10-12)
-- Note: Plan My Week was already handled by the 0030 dedup (covered by 0027).
-- Prepare for Tomorrow — matches BQ-SELF-PREP-TOMORROW-A09 (age 8-10)
UPDATE tasks SET min_age = 8, recommended_age = 9, max_age = 13
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Prepare for Tomorrow';

-- ── ❤️ CHARACTER / FAMILY — basic (age 5+) ─────────────────────────────────────

-- Basic kindness & helping — start at age 5, broad ongoing
UPDATE tasks SET min_age = 5, recommended_age = 7, max_age = 18
WHERE is_system_template = true AND min_age IS NULL
  AND name IN ('Help Someone', 'Do a Kind Act', 'Say Thank You');

-- Sibling help (basic) — age 6+ when sibling awareness develops
UPDATE tasks SET min_age = 6, recommended_age = 8, max_age = 18
WHERE is_system_template = true AND min_age IS NULL
  AND name IN ('Help Sister', 'Help Family Without Being Asked');

-- Sibling tutoring — requires school ability, age 9+
UPDATE tasks SET min_age = 9, recommended_age = 11, max_age = 18
WHERE is_system_template = true AND min_age IS NULL
  AND name IN ('Help Sister With Homework', 'Teach Sister Something');

-- Extended family connection — age 7+ (can hold phone conversation)
UPDATE tasks SET min_age = 6, recommended_age = 8, max_age = 18
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Call Grandparents';

-- Conflict resolution — emotional maturity needed, age 8-9
UPDATE tasks SET min_age = 8, recommended_age = 10, max_age = 18
WHERE is_system_template = true AND min_age IS NULL
  AND name IN ('Resolve a Conflict Calmly', 'Admit a Mistake Honestly');

-- ── ❤️ CHARACTER / FAMILY — household contribution ─────────────────────────────

-- Setting table & dishes — early household contribution, age 6+
UPDATE tasks SET min_age = 5, recommended_age = 7, max_age = 14
WHERE is_system_template = true AND min_age IS NULL
  AND name IN ('Help Set the Table', 'Help With Dishes');

-- Vacuuming — needs strength and coordination, age 8+
UPDATE tasks SET min_age = 7, recommended_age = 9, max_age = 16
WHERE is_system_template = true AND min_age IS NULL
  AND name = 'Vacuum a Room';
