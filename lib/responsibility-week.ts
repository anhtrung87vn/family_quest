/**
 * Weekly responsibility stars.
 *
 * Responsibilities never pay coins, and graduated habits stop paying stars,
 * so an increasingly independent child would earn fewer and fewer stars.
 * Doing last week's responsibilities consistently earns a small star award
 * instead — recognition of growth, never payment for chores.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { grantStars } from "@/lib/ledger";
import { addDaysISO, familyDateISO, mondayOfISO } from "@/lib/family-time";

/** Fewer assignments than this in a week is not enough to judge consistency. */
export const MIN_WEEKLY_RESPONSIBILITIES = 5;

/** Stars for a week of responsibilities: ≥90% done → 5, ≥70% → 3. */
export const WEEK_STARS_HIGH = 5;
export const WEEK_STARS_LOW = 3;

export function responsibilityWeekStars(total: number, done: number): number {
  if (total < MIN_WEEKLY_RESPONSIBILITIES) return 0;
  const ratio = done / total;
  if (ratio >= 0.9) return WEEK_STARS_HIGH;
  if (ratio >= 0.7) return WEEK_STARS_LOW;
  return 0;
}

/**
 * Progress shown to the child during the week: stars currently on track for,
 * and how many more responsibilities reach the top tier (0 when already there).
 */
export function responsibilityWeekProgress(total: number, done: number) {
  const stars = responsibilityWeekStars(total, done);
  const neededForTop = total >= MIN_WEEKLY_RESPONSIBILITIES ? Math.max(0, Math.ceil(total * 0.9) - done) : 0;
  return { total, done, stars, neededForTop };
}

/** Monday–Sunday (family calendar) of the week before the one containing `today`. */
export function previousWeekRange(today: Date): { monday: string; sunday: string } {
  const thisMonday = mondayOfISO(familyDateISO(today));
  return { monday: addDaysISO(thisMonday, -7), sunday: addDaysISO(thisMonday, -1) };
}

export const responsibilityWeekLabel = (monday: string) => `Responsibilities, week of ${monday}`;

/**
 * Award last week's responsibility stars to every child. Safe to run daily:
 * each child is awarded at most once per week (unique index + existence check).
 */
export async function awardResponsibilityWeek(today: Date = new Date()) {
  const db = createAdminClient();
  const { monday, sunday } = previousWeekRange(today);
  const label = responsibilityWeekLabel(monday);

  const { data, error } = await db
    .from("task_assignments")
    .select("child_id, status, task:tasks!inner(behavior_type)")
    .eq("task.behavior_type", "responsibility")
    .gte("due_date", monday)
    .lte("due_date", sunday);
  if (error) throw error;

  const perChild = new Map<string, { total: number; done: number }>();
  for (const a of data ?? []) {
    const s = perChild.get(a.child_id) ?? { total: 0, done: 0 };
    s.total++;
    if (a.status === "approved" || a.status === "submitted") s.done++;
    perChild.set(a.child_id, s);
  }

  let awarded = 0;
  for (const [childId, s] of perChild) {
    const stars = responsibilityWeekStars(s.total, s.done);
    if (!stars) continue;
    const { data: existing } = await db
      .from("star_transactions")
      .select("id")
      .eq("child_id", childId)
      .eq("transaction_type", "RESPONSIBILITY_WEEK")
      .eq("description", label)
      .limit(1);
    if (existing?.length) continue;
    try {
      await grantStars({ childId, amount: stars, transaction_type: "RESPONSIBILITY_WEEK", description: label });
      awarded++;
    } catch (err) {
      // A concurrent run already awarded this week — the unique index wins.
      if ((err as { code?: string }).code !== "23505") throw err;
    }
  }
  return { week: monday, awarded };
}
