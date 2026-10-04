/**
 * Age-based provisioning of system quest and reward templates into a family.
 *
 * Used by the parent "Send by age" page and automatically when a child is
 * created with a date of birth. Family copies keep the template's age range,
 * so the child pool and reward shop can show each child only what fits.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { ageFromDob, isAgeEligible } from "@/lib/age";
import { rankTemplates, type TemplateRow } from "@/lib/recommendations";
import { todayISO } from "@/lib/recurrence";

const SYSTEM_FAMILY_ID = "00000000-0000-0000-0000-000000000000";

/** Pool quests suggested per child (the pool shows a ranked subset each day). */
export const POOL_QUEST_LIMIT = 20;
/** Assigned (non-pool) quests suggested per child — responsibilities and habits. */
export const CORE_QUEST_LIMIT = 12;

export const TASK_TEMPLATE_COLUMNS =
  "id, name, name_vi, description, description_vi, category, coin_reward, star_reward, difficulty, requires_approval, is_recurring, recurrence_rule, in_pool, pool_max_per_day, behavior_type, responsibility_policy, availability_type, evidence_type, evidence_required, max_audio_seconds, skill_domain, skill_subdomain, min_age, recommended_age, max_age, independence_level, estimated_minutes, recommended_frequency, requires_supervision, development_goal, development_goal_vi, parent_tip, parent_tip_vi, template_key, skill_ladder_key, skill_ladder_level";

export const REWARD_TEMPLATE_COLUMNS =
  "id, name, name_vi, description, description_vi, category, coin_cost, requires_approval, dream_eligible, stock, min_age, recommended_age, max_age, reference_price_vnd, min_level, template_key";

export interface QuestTemplate extends TemplateRow {
  name_vi?: string | null;
  in_pool: boolean | null;
  recommended_frequency?: string | null;
  template_key?: string | null;
  [column: string]: unknown;
}

export interface RewardTemplate {
  id: string;
  name: string;
  name_vi?: string | null;
  category: string | null;
  coin_cost: number;
  min_age: number | null;
  recommended_age: number | null;
  max_age: number | null;
  reference_price_vnd?: number | null;
  min_level?: number | null;
  template_key?: string | null;
  [column: string]: unknown;
}

/** Copy a system task template into a family row (template_key → source_template_key). */
export function toFamilyTask<T extends { id?: unknown; template_key?: unknown }>(tpl: T, familyId: string, userId: string) {
  const { id: _id, template_key, ...rest } = tpl;
  return { ...rest, family_id: familyId, created_by: userId, is_system_template: false, active: true, source_template_key: template_key ?? null };
}

/** Copy a system reward template into a family row (template_key → source_template_key). */
export function toFamilyReward<T extends { id?: unknown; template_key?: unknown }>(tpl: T, familyId: string) {
  const { id: _id, template_key, ...rest } = tpl;
  return { ...rest, family_id: familyId, is_system_template: false, active: true, source_template_key: template_key ?? null };
}

/**
 * Templates carry a descriptive recommended_frequency but no recurrence rule.
 * When a core quest is sent to a child, make the family copy recur so the
 * daily cron keeps assigning it; one-off and monthly quests stay one-off.
 */
export function recurrenceFor(frequency: string | null | undefined): { is_recurring: boolean; recurrence_rule: string | null } {
  if (frequency === "daily") return { is_recurring: true, recurrence_rule: JSON.stringify({ freq: "daily" }) };
  if (frequency === "weekly") return { is_recurring: true, recurrence_rule: JSON.stringify({ freq: "weekly", days: [6] }) };
  return { is_recurring: false, recurrence_rule: null };
}

/**
 * Pick quest templates for a child's age.
 *  - pool: in_pool templates the family does not have yet, ranked by age fit.
 *  - core: assigned-only templates (responsibilities/habits) recommended within
 *    one year of the child's age that the child is not already doing.
 */
export function selectQuestSuggestions<T extends QuestTemplate>(
  templates: T[],
  age: number,
  existing: { familyTaskNames: Set<string>; childTaskNames: Set<string> },
) {
  const eligible = templates.filter((t) => isAgeEligible(t, age));
  const pool = rankTemplates(eligible.filter((t) => t.in_pool), {
    childAge: age,
    recentCompletions: [],
    activeTaskNames: existing.familyTaskNames,
    limit: POOL_QUEST_LIMIT,
  });
  const core = rankTemplates(
    eligible.filter((t) => !t.in_pool && Math.abs((t.recommended_age ?? age) - age) <= 1),
    { childAge: age, recentCompletions: [], activeTaskNames: existing.childTaskNames, limit: CORE_QUEST_LIMIT },
  );
  return { pool, core };
}

/** Reward templates that fit the child's age and the family does not have yet, cheapest first. */
export function selectRewardSuggestions<T extends RewardTemplate>(templates: T[], age: number, familyRewardNames: Set<string>): T[] {
  return templates
    .filter((r) => isAgeEligible(r, age) && !familyRewardNames.has(r.name))
    .sort((a, b) => a.coin_cost - b.coin_cost);
}

async function loadFamilyState(familyId: string, childId: string) {
  const db = createAdminClient();
  const [tasksRes, rewardsRes, assignRes] = await Promise.all([
    db.from("tasks").select("id, name, in_pool").eq("family_id", familyId).eq("active", true),
    db.from("rewards").select("name").eq("family_id", familyId).eq("active", true),
    db.from("task_assignments").select("task:tasks(name)").eq("child_id", childId).in("status", ["todo", "submitted", "rejected"]),
  ]);
  if (tasksRes.error) throw tasksRes.error;
  if (rewardsRes.error) throw rewardsRes.error;
  if (assignRes.error) throw assignRes.error;
  const familyTasks = new Map((tasksRes.data ?? []).map((t) => [t.name as string, t.id as string]));
  const childTaskNames = new Set<string>();
  for (const a of assignRes.data ?? []) {
    const task = Array.isArray(a.task) ? a.task[0] : a.task;
    if (task?.name) childTaskNames.add(task.name);
  }
  return {
    familyTasks,
    familyRewardNames: new Set((rewardsRes.data ?? []).map((r) => r.name as string)),
    childTaskNames,
  };
}

/** Suggested quests and rewards for one child, based on date of birth. */
export async function loadAgeSuggestions(childId: string, familyId: string) {
  const db = createAdminClient();
  const { data: child, error } = await db.from("children").select("date_of_birth").eq("id", childId).single();
  if (error) throw error;
  const age = ageFromDob(child?.date_of_birth);
  if (age == null) return { age: null, pool: [], core: [], rewards: [] };

  const [taskTpl, rewardTpl, state] = await Promise.all([
    db.from("tasks").select(TASK_TEMPLATE_COLUMNS).eq("family_id", SYSTEM_FAMILY_ID).eq("is_system_template", true).eq("active", true),
    db.from("rewards").select(REWARD_TEMPLATE_COLUMNS).eq("family_id", SYSTEM_FAMILY_ID).eq("is_system_template", true).eq("active", true),
    loadFamilyState(familyId, childId),
  ]);
  if (taskTpl.error) throw taskTpl.error;
  if (rewardTpl.error) throw rewardTpl.error;

  const { pool, core } = selectQuestSuggestions((taskTpl.data ?? []) as unknown as QuestTemplate[], age, {
    familyTaskNames: new Set(state.familyTasks.keys()),
    childTaskNames: state.childTaskNames,
  });
  const rewards = selectRewardSuggestions((rewardTpl.data ?? []) as unknown as RewardTemplate[], age, state.familyRewardNames);
  return { age, pool, core, rewards };
}

/**
 * Copy the chosen templates into the family and give the child its core quests.
 * Pool quests need no assignment — the child claims them from the pool.
 * Idempotent: existing family rows (same name) are reused, never duplicated.
 */
export async function provisionForChild(input: {
  childId: string;
  familyId: string;
  userId: string;
  taskTemplateIds: string[];
  rewardTemplateIds: string[];
}) {
  const { childId, familyId, userId, taskTemplateIds, rewardTemplateIds } = input;
  const db = createAdminClient();
  const state = await loadFamilyState(familyId, childId);
  let tasksAdded = 0;
  let assignmentsAdded = 0;
  let rewardsAdded = 0;

  if (taskTemplateIds.length) {
    const { data: tpls, error } = await db.from("tasks").select(TASK_TEMPLATE_COLUMNS)
      .in("id", taskTemplateIds).eq("is_system_template", true).eq("active", true);
    if (error) throw error;
    const templates = (tpls ?? []) as unknown as QuestTemplate[];

    const newRows = templates
      .filter((t) => !state.familyTasks.has(t.name))
      .map((t) => ({ ...toFamilyTask(t, familyId, userId), ...(t.in_pool ? {} : recurrenceFor(t.recommended_frequency)) }));
    if (newRows.length) {
      const { data: inserted, error: insErr } = await db.from("tasks").insert(newRows).select("id, name");
      if (insErr) throw insErr;
      for (const r of inserted ?? []) state.familyTasks.set(r.name, r.id);
      tasksAdded = inserted?.length ?? 0;
    }

    const today = todayISO();
    const assignments = templates
      .filter((t) => !t.in_pool && !state.childTaskNames.has(t.name) && state.familyTasks.has(t.name))
      .map((t) => ({ task_id: state.familyTasks.get(t.name)!, child_id: childId, due_date: today, status: "todo" as const }));
    if (assignments.length) {
      const { error: aErr } = await db.from("task_assignments").insert(assignments);
      if (aErr) throw aErr;
      assignmentsAdded = assignments.length;
    }
  }

  if (rewardTemplateIds.length) {
    const { data: tpls, error } = await db.from("rewards").select(REWARD_TEMPLATE_COLUMNS)
      .in("id", rewardTemplateIds).eq("is_system_template", true).eq("active", true);
    if (error) throw error;
    const rows = ((tpls ?? []) as unknown as RewardTemplate[])
      .filter((r) => !state.familyRewardNames.has(r.name))
      .map((r) => toFamilyReward(r, familyId));
    if (rows.length) {
      const { error: insErr } = await db.from("rewards").insert(rows);
      if (insErr) throw insErr;
      rewardsAdded = rows.length;
    }
  }

  return { tasksAdded, assignmentsAdded, rewardsAdded };
}

/**
 * Auto-provision for a newly created child: every age-matched pool quest and
 * reward suggestion. Core (assigned) quests are left for the parent to choose.
 */
export async function autoProvisionNewChild(childId: string, familyId: string, userId: string) {
  const s = await loadAgeSuggestions(childId, familyId);
  if (s.age == null) return null;
  return provisionForChild({
    childId,
    familyId,
    userId,
    taskTemplateIds: s.pool.map((t) => t.id),
    rewardTemplateIds: s.rewards.map((r) => r.id),
  });
}
