-- 0007_dev_seed.sql — DEV ONLY seed: fixed-UUID family + parent user for local bypass.
-- Safe to run multiple times (ON CONFLICT DO NOTHING).
-- Remove or skip this migration before production deploy.

do $$
begin
  if current_setting('app.env', true) = 'production' then
    raise exception 'Refusing to run dev seed in production';
  end if;
end $$;

insert into families (id, name)
values ('00000000-0000-0000-0000-000000000001', 'Dev Family')
on conflict (id) do nothing;

insert into users (id, family_id, email, role)
values (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'dev@localhost',
  'parent'
)
on conflict (id) do nothing;
