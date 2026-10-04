-- 0026_curriculum_schema.sql — Extend tasks table with curriculum-specific columns

-- Widen difficulty from 1-3 to 1-10
alter table tasks drop constraint if exists tasks_difficulty_check;
alter table tasks add constraint tasks_difficulty_check
  check (difficulty between 1 and 10);

-- Curriculum columns
alter table tasks
  add column if not exists skill_domain text
    check (skill_domain in (
      'LEARNING','SELF_MANAGEMENT','LIFE_HOME','MONEY',
      'COMMUNICATION','CHARACTER_FAMILY','HEALTH','DIGITAL',
      'WORLD_INDEPENDENCE'
    )),
  add column if not exists skill_subdomain text,
  add column if not exists min_age integer check (min_age between 4 and 21),
  add column if not exists recommended_age integer check (recommended_age between 4 and 21),
  add column if not exists max_age integer check (max_age between 4 and 21),
  add column if not exists independence_level text
    check (independence_level in ('GUIDED','SUPPORTED','INDEPENDENT')),
  add column if not exists estimated_minutes integer check (estimated_minutes between 1 and 480),
  add column if not exists recommended_frequency text,
  add column if not exists requires_supervision boolean not null default false,
  add column if not exists development_goal text,
  add column if not exists development_goal_vi text,
  add column if not exists parent_tip text,
  add column if not exists parent_tip_vi text,
  add column if not exists template_key text,
  add column if not exists source_template_key text,
  add column if not exists skill_ladder_key text,
  add column if not exists skill_ladder_level integer check (skill_ladder_level between 1 and 20);

-- Unique template_key for system templates only
create unique index if not exists tasks_template_key_uniq
  on tasks(template_key)
  where template_key is not null and is_system_template = true;

-- Index for age-based queries on system templates
create index if not exists tasks_curriculum_idx
  on tasks(skill_domain, recommended_age)
  where is_system_template = true and active = true;

-- Backfill skill_domain from category for existing system templates
update tasks set skill_domain = 'LEARNING'
  where is_system_template = true and category = 'learning' and skill_domain is null;
update tasks set skill_domain = 'LIFE_HOME'
  where is_system_template = true and category = 'responsibility' and skill_domain is null;
update tasks set skill_domain = 'CHARACTER_FAMILY'
  where is_system_template = true and category = 'family' and skill_domain is null;
update tasks set skill_domain = 'HEALTH'
  where is_system_template = true and category = 'health' and skill_domain is null;
update tasks set skill_domain = 'LEARNING'
  where is_system_template = true and category = 'creativity' and skill_domain is null;
