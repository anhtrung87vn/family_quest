-- 0039_family_time_zone.sql — Use the family's time zone for database dates.
--
-- The app computes "today", weeks and due dates in Asia/Bangkok
-- (lib/family-time.ts). A few column defaults and helpers still use
-- current_date (family_quests.start_date, family_memories.memory_date,
-- weekly_reflections.week_start/week_end, pool claim/refresh dates, the child
-- age helper), which follows the database session time zone — UTC by default,
-- 7 hours behind Vietnam. Setting the database default time zone makes those
-- agree with the app. Stored timestamptz values are unaffected (they are
-- absolute instants); only date defaults and textual timestamp output change.
--
-- New sessions pick this up; existing pooled connections may need a restart
-- (Supabase dashboard → Settings → Restart project) to apply immediately.

alter database postgres set timezone to 'Asia/Bangkok';
