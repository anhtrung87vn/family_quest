import { createAdminClient } from "@/lib/supabase/admin";
import { familyDateISO } from "@/lib/family-time";

// Constants — easy to adjust in V2 without code change
export const SUGGEST_THRESHOLD = 3;
export const ANALYSIS_WINDOW_DAYS = 7;

export interface ForgettingSummary {
  taskId: string;
  taskName: string;
  taskNameVi: string | null;
  childId: string;
  childName: string;
  forgottenCount: number;
  neededHelpCount: number;
  suggestHabitSupport: boolean;
}

/**
 * Analyses FORGOTTEN events per task for a given child in the last N days.
 * Returns suggestions for tasks where forgetting exceeds threshold.
 * Only considers tasks still typed as "responsibility" (not already habit_building).
 */
export async function getResponsibilitySummary(
  familyId: string,
  childId: string,
  windowDays: number = ANALYSIS_WINDOW_DAYS,
): Promise<ForgettingSummary[]> {
  const admin = createAdminClient();
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - windowDays);

  const { data: events, error } = await admin
    .from("responsibility_events")
    .select("task_id, event_type, task:tasks(id, name, name_vi, behavior_type)")
    .eq("family_id", familyId)
    .eq("child_id", childId)
    .in("event_type", ["FORGOTTEN", "NEEDED_HELP"])
    .gte("occurred_at", windowStart.toISOString())
    .order("occurred_at", { ascending: false });

  if (error) {
    console.error("[getResponsibilitySummary] query error:", error);
    return [];
  }

  // Get child name
  const { data: child } = await admin
    .from("children")
    .select("name")
    .eq("id", childId)
    .single();
  const childName = child?.name ?? "";

  // Group by task_id
  const taskMap = new Map<string, {
    taskId: string;
    taskName: string;
    taskNameVi: string | null;
    forgottenCount: number;
    neededHelpCount: number;
    isResponsibility: boolean;
  }>();

  for (const ev of events ?? []) {
    const task: any = Array.isArray(ev.task) ? ev.task[0] : ev.task;
    if (!task) continue;

    // Skip tasks that are already habit_building
    if (task.behavior_type !== "responsibility") continue;

    const existing = taskMap.get(ev.task_id) ?? {
      taskId: ev.task_id,
      taskName: task.name ?? "",
      taskNameVi: task.name_vi ?? null,
      forgottenCount: 0,
      neededHelpCount: 0,
      isResponsibility: true,
    };

    if (ev.event_type === "FORGOTTEN") existing.forgottenCount++;
    if (ev.event_type === "NEEDED_HELP") existing.neededHelpCount++;

    taskMap.set(ev.task_id, existing);
  }

  const results: ForgettingSummary[] = [];
  for (const entry of taskMap.values()) {
    results.push({
      taskId: entry.taskId,
      taskName: entry.taskName,
      taskNameVi: entry.taskNameVi,
      childId,
      childName,
      forgottenCount: entry.forgottenCount,
      neededHelpCount: entry.neededHelpCount,
      suggestHabitSupport: entry.forgottenCount >= SUGGEST_THRESHOLD,
    });
  }

  return results;
}

export interface IndependenceTrend {
  childId: string;
  childName: string;
  independentCompletions: number;
  forgottenCount: number;
  repairsCompleted: number;
  remindersThisWeek: number;
  remindersPrevWeek: number;
  habitsGraduated: number;
  topNeedSupport: {
    taskName: string;
    taskNameVi: string | null;
    forgottenCount: number;
  }[];
}

/**
 * Computes independence trend for a child over the last N days.
 * Used by the parent Growing Independence dashboard.
 */
export async function getIndependenceTrend(
  familyId: string,
  childId: string,
  windowDays: number = 7,
): Promise<IndependenceTrend> {
  const admin = createAdminClient();

  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - windowDays);
  const prevWindowStart = new Date(windowStart);
  prevWindowStart.setDate(prevWindowStart.getDate() - windowDays);

  // Child name
  const { data: child } = await admin
    .from("children")
    .select("name")
    .eq("id", childId)
    .single();

  // Events this week
  const { data: thisWeekEvents } = await admin
    .from("responsibility_events")
    .select("event_type, status, task_id, task:tasks(name, name_vi)")
    .eq("family_id", familyId)
    .eq("child_id", childId)
    .gte("occurred_at", windowStart.toISOString());

  // Events previous week (for trend comparison)
  const { data: prevWeekEvents } = await admin
    .from("responsibility_events")
    .select("event_type")
    .eq("family_id", familyId)
    .eq("child_id", childId)
    .gte("occurred_at", prevWindowStart.toISOString())
    .lt("occurred_at", windowStart.toISOString());

  // Independent completions: approved responsibility tasks in window without FORGOTTEN event
  const { count: approvedResponsibilities } = await admin
    .from("task_assignments")
    .select("id", { count: "exact", head: true })
    .eq("child_id", childId)
    .eq("status", "approved")
    .gte("due_date", familyDateISO(windowStart));

  // Habits graduated (lifetime)
  const { count: graduated } = await admin
    .from("child_task_reward_progress")
    .select("id", { count: "exact", head: true })
    .eq("child_id", childId)
    .eq("reward_stage", "graduated");

  const events = thisWeekEvents ?? [];
  const forgottenCount = events.filter((e) => e.event_type === "FORGOTTEN").length;
  const repairsCompleted = events.filter((e) => e.status === "RESOLVED").length;
  const remindersThisWeek = events.filter((e) =>
    e.event_type === "FORGOTTEN" || e.event_type === "NEEDED_HELP",
  ).length;
  const remindersPrevWeek = (prevWeekEvents ?? []).filter((e) =>
    e.event_type === "FORGOTTEN" || e.event_type === "NEEDED_HELP",
  ).length;

  // Top tasks needing support
  const taskForgotMap = new Map<string, { taskName: string; taskNameVi: string | null; count: number }>();
  for (const ev of events.filter((e) => e.event_type === "FORGOTTEN")) {
    const task: any = Array.isArray(ev.task) ? ev.task[0] : ev.task;
    const existing = taskForgotMap.get(ev.task_id) ?? {
      taskName: task?.name ?? "",
      taskNameVi: task?.name_vi ?? null,
      count: 0,
    };
    existing.count++;
    taskForgotMap.set(ev.task_id, existing);
  }
  const topNeedSupport = Array.from(taskForgotMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((e) => ({ taskName: e.taskName, taskNameVi: e.taskNameVi, forgottenCount: e.count }));

  return {
    childId,
    childName: child?.name ?? "",
    independentCompletions: Math.max(0, (approvedResponsibilities ?? 0) - forgottenCount),
    forgottenCount,
    repairsCompleted,
    remindersThisWeek,
    remindersPrevWeek,
    habitsGraduated: graduated ?? 0,
    topNeedSupport,
  };
}

/**
 * Gets all OPEN repair events for a child — used by child home page.
 */
export async function getOpenRepairItems(childId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("responsibility_events")
    .select("id, event_type, occurred_at, task:tasks(name, name_vi)")
    .eq("child_id", childId)
    .eq("status", "OPEN")
    .order("occurred_at", { ascending: true });

  if (error) {
    console.error("[getOpenRepairItems] query error:", error);
    return [];
  }

  return (data ?? []).map((r: any) => {
    const task = Array.isArray(r.task) ? r.task[0] : r.task;
    return {
      id: r.id as string,
      taskName: task?.name ?? "",
      taskNameVi: task?.name_vi ?? null,
      eventType: r.event_type as string,
      occurredAt: r.occurred_at as string,
    };
  });
}
