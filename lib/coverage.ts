/**
 * Development Coverage and Skill Ladder data fetching.
 *
 * Uses completed task_assignments to derive:
 * - Domain coverage (areas practiced in last N days)
 * - Skill ladder progress (highest completed level per ladder)
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { ALL_SKILL_DOMAINS, type SkillDomain } from "@/lib/category-style";
import { SKILL_LADDERS, ALL_LADDER_KEYS } from "@/lib/ladders";

export interface DomainCoverage {
  domain: SkillDomain;
  count: number;
}

/**
 * Get domain practice counts for a child over the last `days` days.
 * Returns all 9 domains, even if count is 0.
 */
export async function getDevelopmentCoverage(
  childId: string,
  days: number = 30
): Promise<DomainCoverage[]> {
  const admin = createAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data } = await admin
    .from("task_assignments")
    .select("task:tasks(skill_domain)")
    .eq("child_id", childId)
    .eq("status", "approved")
    .gte("created_at", since.toISOString());

  // Count domains
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const task: any = Array.isArray(row.task) ? row.task[0] : row.task;
    const domain = task?.skill_domain;
    if (domain) counts.set(domain, (counts.get(domain) ?? 0) + 1);
  }

  // Return all domains with counts
  return ALL_SKILL_DOMAINS.map((d) => ({
    domain: d,
    count: counts.get(d) ?? 0,
  }));
}

export interface LadderProgress {
  ladderKey: string;
  maxCompletedLevel: number;
  totalLevels: number;
}

/**
 * Get the highest completed skill_ladder_level per ladder for a child.
 */
export async function getSkillLadderProgress(
  childId: string
): Promise<LadderProgress[]> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("task_assignments")
    .select("task:tasks(skill_ladder_key, skill_ladder_level)")
    .eq("child_id", childId)
    .eq("status", "approved");

  // Find max level per ladder
  const maxLevels = new Map<string, number>();
  for (const row of data ?? []) {
    const task: any = Array.isArray(row.task) ? row.task[0] : row.task;
    const key = task?.skill_ladder_key;
    const level = task?.skill_ladder_level;
    if (key && typeof level === "number") {
      maxLevels.set(key, Math.max(maxLevels.get(key) ?? 0, level));
    }
  }

  return ALL_LADDER_KEYS.map((k) => ({
    ladderKey: k,
    maxCompletedLevel: maxLevels.get(k) ?? 0,
    totalLevels: SKILL_LADDERS[k].maxLevel,
  }));
}

export interface GraduatedHabit {
  task_id: string;
  task_name: string;
  task_name_vi: string | null;
  graduated_at: string;
}

/**
 * Get habits that have been graduated for a child.
 */
export async function getGraduatedHabits(
  childId: string
): Promise<GraduatedHabit[]> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("child_task_reward_progress")
    .select("task_id, graduated_at, task:tasks(name, name_vi)")
    .eq("child_id", childId)
    .eq("reward_stage", "graduated")
    .not("graduated_at", "is", null)
    .order("graduated_at", { ascending: false });

  return (data ?? []).map((row: any) => {
    const task = Array.isArray(row.task) ? row.task[0] : row.task;
    return {
      task_id: row.task_id,
      task_name: task?.name ?? "",
      task_name_vi: task?.name_vi ?? null,
      graduated_at: row.graduated_at,
    };
  });
}
