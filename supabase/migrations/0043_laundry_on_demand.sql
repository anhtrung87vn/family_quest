-- 0043_laundry_on_demand.sql — "Hang the laundry" is assigned when a wash is done.
--
-- Laundry is hung whenever a load finishes, not on a fixed weekly schedule,
-- and in practice the older child (around 10–11) does it. Mark the template
-- as on-demand (no automatic recurrence when sent to a child; the parent
-- assigns it from Tasks → Assign with that day's date) and recommend it from
-- age 10 so "Send by age" suggests it to the older child.

update tasks set
  recommended_frequency = 'as_needed',
  recommended_age = 10
where is_system_template = true
  and template_key = 'BQ-LIFE-HANG-LAUNDRY-A08';

-- Family copies made before this change: stop any automatic recurrence.
update tasks set
  recommended_frequency = 'as_needed',
  recommended_age = 10,
  is_recurring = false,
  recurrence_rule = null
where is_system_template = false
  and source_template_key = 'BQ-LIFE-HANG-LAUNDRY-A08';
