-- 0020_evidence_seed.sql — Set evidence_type for system template tasks.
--
-- Each task gets an appropriate evidence type based on what makes
-- pedagogical sense for the activity.  Only system templates
-- (family_id = nil UUID) are updated.  Family-created tasks keep
-- their defaults (evidence_type = 'none').
--
-- Philosophy: evidence should feel like SHARING, not surveillance.

-- =========================================================
-- 🌱 RESPONSIBILITIES — mostly no evidence or choice self-check
-- =========================================================

-- Simple daily tasks — no evidence needed (trust the child)
-- Make My Bed, Put Away Belongings, Clear My Plate, Put Dirty Clothes Away, Brush Teeth
-- → none (default, no update needed)

-- Take Care of Plants → photo: child shows the watered plants (fun, optional)
update tasks set evidence_type = 'photo', evidence_required = false
  where is_system_template = true
    and name = 'Take Care of Plants';

-- =========================================================
-- 🌿 HABIT BUILDING — choice/photo to track habit ownership
-- =========================================================

-- Prepare School Bag → choice: child self-checks readiness
update tasks set evidence_type = 'choice', evidence_required = false
  where is_system_template = true
    and name = 'Prepare School Bag';

-- Keep Desk Organized → photo: child shows tidy desk
update tasks set evidence_type = 'photo', evidence_required = false
  where is_system_template = true
    and name = 'Keep Desk Organized';

-- Finish Homework → choice: child self-reports completion
update tasks set evidence_type = 'choice', evidence_required = false
  where is_system_template = true
    and name = 'Finish Homework';

-- Fold My Clothes → photo: child shows folded clothes
update tasks set evidence_type = 'photo', evidence_required = false
  where is_system_template = true
    and name = 'Fold My Clothes';

-- Clean My Room → photo: child shows clean room
update tasks set evidence_type = 'photo', evidence_required = false
  where is_system_template = true
    and name = 'Clean My Room';

-- Screen Time Self-Control → parent_observation: parent confirms
update tasks set evidence_type = 'parent_observation', evidence_required = false
  where is_system_template = true
    and name = 'Screen Time Self-Control';

-- Sleep on Time → parent_observation: parent confirms
update tasks set evidence_type = 'parent_observation', evidence_required = false
  where is_system_template = true
    and name = 'Sleep on Time';

-- =========================================================
-- 🎯 CHALLENGES — Learning
-- =========================================================

-- Reading tasks → choice: child self-reflects on reading
update tasks set evidence_type = 'choice', evidence_required = false
  where is_system_template = true
    and name in ('Read 20 Minutes', 'Read 30 Minutes', 'English Reading');

-- Learn words → text: child writes words they learned
update tasks set evidence_type = 'text', evidence_required = false
  where is_system_template = true
    and name in ('Learn 5 New English Words', 'Learn 10 New English Words');

-- English Speaking Practice → audio: child records speaking
update tasks set evidence_type = 'audio', evidence_required = true, max_audio_seconds = 30
  where is_system_template = true
    and name = 'English Speaking Practice';

-- Math Practice → choice: child self-rates difficulty
update tasks set evidence_type = 'choice', evidence_required = false
  where is_system_template = true
    and name = 'Math Practice';

-- Beautiful Handwriting → photo: child shows handwriting page
update tasks set evidence_type = 'photo', evidence_required = false
  where is_system_template = true
    and name = 'Beautiful Handwriting';

-- Tell Me What You Learned → audio: child explains verbally
update tasks set evidence_type = 'audio', evidence_required = false, max_audio_seconds = 30
  where is_system_template = true
    and name = 'Tell Me What You Learned';

-- Review Today's Lessons → text: child writes a short summary
update tasks set evidence_type = 'text', evidence_required = false
  where is_system_template = true
    and name = 'Review Today''s Lessons';

-- Music Practice → audio: child records a short clip
update tasks set evidence_type = 'audio', evidence_required = false, max_audio_seconds = 30
  where is_system_template = true
    and name = 'Music Practice';

-- Prepare for Tomorrow → choice: child self-reports readiness
update tasks set evidence_type = 'choice', evidence_required = false
  where is_system_template = true
    and name = 'Prepare for Tomorrow';

-- =========================================================
-- 🎯 CHALLENGES — Big challenges
-- =========================================================

-- Finish One Book → photo: child shows book cover
update tasks set evidence_type = 'photo', evidence_required = false
  where is_system_template = true
    and name = 'Finish One Book';

-- Mini Research Project → photo: child shows their work (required)
update tasks set evidence_type = 'photo', evidence_required = true
  where is_system_template = true
    and name = 'Mini Research Project';

-- Draw Something Creative → photo: child shows their art (required)
update tasks set evidence_type = 'photo', evidence_required = true
  where is_system_template = true
    and name = 'Draw Something Creative';

-- Learn About a Country → text: child writes what they learned
update tasks set evidence_type = 'text', evidence_required = false
  where is_system_template = true
    and name = 'Learn About a Country';

-- Plan My Week → photo: child shows their plan
update tasks set evidence_type = 'photo', evidence_required = false
  where is_system_template = true
    and name = 'Plan My Week';

-- =========================================================
-- 🎯 CHALLENGES — Health & Activity
-- =========================================================

-- Exercise/Outdoor/Bike/Swimming → photo: fun, optional
update tasks set evidence_type = 'photo', evidence_required = false
  where is_system_template = true
    and name in ('Exercise 20 Minutes', 'Outdoor Play', 'Bike Ride', 'Swimming Practice');

-- Healthy Snack Choice → photo: child shows their choice
update tasks set evidence_type = 'photo', evidence_required = false
  where is_system_template = true
    and name = 'Healthy Snack Choice';

-- =========================================================
-- ❤️ CHARACTER / FAMILY — parent observation (parent confirms)
-- =========================================================

-- All character/family tasks → parent_observation
update tasks set evidence_type = 'parent_observation', evidence_required = false
  where is_system_template = true
    and category = 'family';

-- Exception: Call Grandparents → choice: child reflects on conversation
update tasks set evidence_type = 'choice', evidence_required = false
  where is_system_template = true
    and name = 'Call Grandparents';
