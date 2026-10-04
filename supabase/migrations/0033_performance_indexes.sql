-- 0033_performance_indexes.sql — Add missing indexes for common query patterns
-- Identified during performance review of N+1 queries and slow page loads.

-- Approvals + Dashboard filter by task_completions.status
create index if not exists task_completions_status_idx
  on task_completions(status);

-- Dashboard + Approvals filter by reward_redemptions.status (global, not child-scoped)
create index if not exists reward_redemptions_status_idx
  on reward_redemptions(status);

-- Child home, dashboard, cron job filter by task_assignments(child_id, due_date)
create index if not exists task_assignments_child_due_idx
  on task_assignments(child_id, due_date);

-- Responsibility events queried by (family_id, child_id, occurred_at) in getIndependenceTrend / getResponsibilitySummary
create index if not exists responsibility_events_family_child_time_idx
  on responsibility_events(family_id, child_id, occurred_at desc);

-- Pool claims queried by (child_id, claimed_date) for daily limit checks
create index if not exists pool_claims_child_date_idx
  on pool_claims(child_id, claimed_date);
