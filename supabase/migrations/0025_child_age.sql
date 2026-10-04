-- 0025_child_age.sql — Add date_of_birth to children + age helper functions

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
