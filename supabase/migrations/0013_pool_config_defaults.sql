-- 0013_pool_config_defaults.sql
-- Auto-create child_pool_config on child insert, with grade-based defaults.
-- Grade 6+ gets max_claims_per_day = 2 and pool_size = 6; others get 1 and 4.

create or replace function create_child_pool_config()
returns trigger language plpgsql security definer as $$
declare
  v_max_claims integer;
  v_pool_size  integer;
begin
  if new.grade >= 6 then
    v_max_claims := 2;
    v_pool_size  := 6;
  else
    v_max_claims := 1;
    v_pool_size  := 4;
  end if;

  insert into child_pool_config (child_id, max_claims_per_day, pool_size)
  values (new.id, v_max_claims, v_pool_size)
  on conflict (child_id) do nothing;

  return new;
end;
$$;

drop trigger if exists child_pool_config_trigger on children;
create trigger child_pool_config_trigger
  after insert on children
  for each row execute function create_child_pool_config();

-- Backfill for any children already in the database
insert into child_pool_config (child_id, max_claims_per_day, pool_size)
select
  id,
  case when grade >= 6 then 2 else 1 end,
  case when grade >= 6 then 6 else 4 end
from children
on conflict (child_id) do nothing;
