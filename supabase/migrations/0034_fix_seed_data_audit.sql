-- 0034_fix_seed_data_audit.sql — Fix seed data issues found during philosophy audit.
-- Addresses:
--   FIX 1: Pool templates (0012) have wrong behavior_type and coin violations
--   FIX 2: Legacy templates (0006) that duplicate curriculum templates (0027/0028)
--   FIX 3: Quest templates (0011) pay coins for responsibilities

-- =========================================================
-- FIX 1: Pool templates (0012) — wrong behavior_type & coin violations
--
-- Pool templates inserted by 0012 have lowercase names and were NOT matched
-- by the 0015_habit_system backfill (which only matched Title Case names from 0006).
-- They all defaulted to behavior_type = 'challenge'.
--
-- Problem categories:
--   a) 'responsibility' pool tasks have coin_reward > 0 → should be 'responsibility'
--      type with 0 coins (responsibilities don't earn coins)
--   b) 'family' pool tasks have coin_reward > 0 → violates "don't pay for kindness"
--   c) Some pool tasks should be 'habit_building' not 'challenge'
-- =========================================================

-- 1a. Responsibility pool tasks → behavior_type = 'responsibility', zero coins
UPDATE tasks SET
  behavior_type = 'responsibility',
  coin_reward = 0,
  star_reward = 0
WHERE is_system_template = true
  AND in_pool = true
  AND name IN (
    'Water the plants',
    'Tidy one space',
    'Set the table for dinner'
  );

-- 1b. Habit-building pool tasks → behavior_type = 'habit_building'
-- These are behaviors we want to encourage temporarily with small rewards
UPDATE tasks SET
  behavior_type = 'habit_building'
WHERE is_system_template = true
  AND in_pool = true
  AND name IN (
    'Prepare tomorrow''s school bag',
    'Screen time self-control',
    'Drink enough water today'
  );

-- 1c. Family/kindness pool tasks → behavior_type = 'character', zero coins
-- "Don't pay children for being kind" — character actions earn stars, not coins
UPDATE tasks SET
  behavior_type = 'character',
  coin_reward = 0
WHERE is_system_template = true
  AND in_pool = true
  AND category = 'family';

-- =========================================================
-- FIX 2: Deactivate legacy (0006) templates that are superseded by
-- richer curriculum templates (0027/0028).
--
-- The 0030 dedup only removed 4 exact-name matches. These remaining
-- legacy templates duplicate the same concept but with different names
-- or are fully covered by curriculum. Deactivating (not deleting) so
-- existing family clones are unaffected but new onboarding won't show
-- stale templates in the Library.
--
-- Criteria: legacy template (template_key IS NULL, from 0006) where
-- a curriculum template (template_key LIKE 'BQ-%') covers the same skill.
-- =========================================================

-- Legacy responsibilities fully covered by curriculum ages 7-8:
-- "Make My Bed" → covered by BQ-LIFE-MAKE-BED-A07
-- "Put Away Belongings" → covered by BQ-LIFE-PUT-AWAY-A07
-- "Clear My Plate" → covered by BQ-LIFE-CLEAR-PLATE-A07
-- "Put Dirty Clothes Away" → covered by BQ-LIFE-DIRTY-CLOTHES-A07
-- "Brush Teeth" → covered by BQ-LIFE-BRUSH-TEETH-A07
-- "Take Care of Plants" → covered by BQ-LIFE-WATER-PLANTS-A07
UPDATE tasks SET active = false
WHERE is_system_template = true
  AND template_key IS NULL
  AND in_pool IS NOT true
  AND name IN (
    'Make My Bed', 'Put Away Belongings', 'Clear My Plate',
    'Put Dirty Clothes Away', 'Brush Teeth', 'Take Care of Plants'
  );

-- Legacy habit-building fully covered by curriculum ages 7-9:
-- "Prepare School Bag" → BQ-SELF-SCHOOL-BAG-A07 / A08
-- "Keep Desk Organized" → BQ-SELF-DESK-ORGANIZED-A08
-- "Finish Homework" → BQ-SELF-HW-NO-REMIND-A09
-- "Fold My Clothes" → BQ-LIFE-FOLD-CLOTHES-A09
-- "Clean My Room" → BQ-LIFE-ROOM-RESET-A10
-- "Screen Time Self-Control" → BQ-SELF-SCREEN-CONTROL-A08
-- "Sleep on Time" → BQ-LIFE-BEDTIME-A07
UPDATE tasks SET active = false
WHERE is_system_template = true
  AND template_key IS NULL
  AND in_pool IS NOT true
  AND name IN (
    'Prepare School Bag', 'Keep Desk Organized', 'Finish Homework',
    'Fold My Clothes', 'Clean My Room', 'Screen Time Self-Control',
    'Sleep on Time'
  );

-- Legacy challenges covered by curriculum:
-- "Read 20 Minutes" → BQ-LEARN-READ-20-A08
-- "Read 30 Minutes" → BQ-LEARN-READ-30-A10
-- "English Reading" → BQ-LEARN-ENG-READ-A09
-- "Learn 5 New English Words" → BQ-LEARN-ENG-WORDS-A07
-- "Learn 10 New English Words" → BQ-LEARN-ENG-10WORDS-A09
-- "English Speaking Practice" → BQ-COMM-ENG-SPEAK-A08
-- "Math Practice" → BQ-LEARN-MATH-A08
-- "Beautiful Handwriting" → BQ-LEARN-HANDWRITING-A08
-- "Tell Me What You Learned" → BQ-COMM-TELL-LEARNED-A08
-- "Review Today's Lessons" → BQ-LEARN-REVIEW-LESSONS-A08
-- "Music Practice" → BQ-LEARN-MUSIC-A09
-- "Finish One Book" → BQ-LEARN-7DAY-SKILL-A12 (broader concept)
-- "Mini Research Project" → BQ-LEARN-RESEARCH-Q-A09
-- "Draw Something Creative" → BQ-LEARN-DRAW-A09
-- "Learn About a Country" → BQ-LEARN-ANIMAL-FACTS-A07 (broader)
-- "Exercise 20 Minutes" → covered by health curriculum
-- "Outdoor Play" → covered by health curriculum
-- "Bike Ride" → covered by health curriculum
-- "Swimming Practice" → covered by health curriculum
-- "Healthy Snack Choice" → BQ-LIFE-HEALTHY-SNACK-A08
-- "Plan My Week" → BQ-SELF-PLAN-WEEK-A11 (already removed by 0030)
-- "Prepare for Tomorrow" → BQ-SELF-PREP-TOMORROW-A09
UPDATE tasks SET active = false
WHERE is_system_template = true
  AND template_key IS NULL
  AND in_pool IS NOT true
  AND name IN (
    'Read 20 Minutes', 'Read 30 Minutes', 'English Reading',
    'Learn 5 New English Words', 'Learn 10 New English Words',
    'English Speaking Practice', 'Math Practice',
    'Beautiful Handwriting', 'Tell Me What You Learned',
    'Review Today''s Lessons', 'Music Practice',
    'Finish One Book', 'Mini Research Project',
    'Draw Something Creative', 'Learn About a Country',
    'Exercise 20 Minutes', 'Outdoor Play', 'Bike Ride',
    'Swimming Practice', 'Healthy Snack Choice',
    'Prepare for Tomorrow'
  );

-- Legacy character/family covered by curriculum:
-- "Help Someone" → BQ-CHAR-KIND-ACT-A07
-- "Do a Kind Act" → BQ-CHAR-KIND-ACT-A07
-- "Help Sister" → BQ-CHAR-HELP-SIBLING-A11
-- "Help Family Without Being Asked" → BQ-CHAR-HELP-WITHOUT-ASK-A08
-- "Help Sister With Homework" → BQ-COMM-TEACH-SKILL-A10
-- "Teach Sister Something" → BQ-COMM-TEACH-SKILL-A10
-- "Call Grandparents" → BQ-CHAR-CALL-GRANDPARENTS-A08
-- "Say Thank You" → BQ-CHAR-THANK-YOU-A07
-- "Resolve a Conflict Calmly" → BQ-CHAR-RESOLVE-DISAGREE-A15
-- "Admit a Mistake Honestly" → covered by character curriculum
-- "Help Set the Table" → BQ-LIFE-SET-TABLE-A08
-- "Help With Dishes" → covered by LIFE_HOME curriculum
-- "Help Prepare Dinner" → already removed by 0030
-- "Vacuum a Room" → BQ-LIFE-VACUUM-A09
UPDATE tasks SET active = false
WHERE is_system_template = true
  AND template_key IS NULL
  AND in_pool IS NOT true
  AND name IN (
    'Help Someone', 'Do a Kind Act', 'Help Sister',
    'Help Family Without Being Asked', 'Help Sister With Homework',
    'Teach Sister Something', 'Call Grandparents', 'Say Thank You',
    'Resolve a Conflict Calmly', 'Admit a Mistake Honestly',
    'Help Set the Table', 'Help With Dishes', 'Vacuum a Room'
  );

-- =========================================================
-- FIX 3: Quest templates — "Morning Routine Streak" and "Tidy House Challenge"
-- pay coins for what are fundamentally responsibilities.
--
-- Philosophy: "Trách nhiệm cơ bản KHÔNG nhận Quest Coins"
-- Morning routine and tidying are basic responsibilities, not extra effort.
-- Change to 0 coins (keep stars for recognition of consistency).
-- =========================================================

UPDATE family_quests SET coin_reward = 0
WHERE is_system_template = true
  AND title IN ('Morning Routine Streak', 'Tidy House Challenge');
