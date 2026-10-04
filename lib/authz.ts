/**
 * Ownership assertions for family-scoped records.
 *
 * Because server actions run with the service-role client (RLS bypassed), every
 * action that accepts a caller-supplied record ID must prove that record belongs
 * to the caller's family before touching it. Validating the UUID *shape* with zod
 * is not authorization.
 *
 * Usage:
 *   const { familyId } = await resolveContext();
 *   await assertCompletionInFamily(id, familyId);
 */
import { createAdminClient } from "@/lib/supabase/admin";

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

function deny(what: string): never {
  // Deliberately vague: don't leak whether the record exists in another family.
  throw new ForbiddenError(`${what} not found`);
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/** children.family_id */
export async function assertChildInFamily(childId: string, familyId: string) {
  const db = createAdminClient();
  const { data } = await db.from("children").select("family_id").eq("id", childId).maybeSingle();
  if (!data || data.family_id !== familyId) deny("Child");
}

/** tasks.family_id */
export async function assertTaskInFamily(taskId: string, familyId: string) {
  const db = createAdminClient();
  const { data } = await db.from("tasks").select("family_id").eq("id", taskId).maybeSingle();
  if (!data || data.family_id !== familyId) deny("Task");
}

/** rewards.family_id */
export async function assertRewardInFamily(rewardId: string, familyId: string) {
  const db = createAdminClient();
  const { data } = await db.from("rewards").select("family_id").eq("id", rewardId).maybeSingle();
  if (!data || data.family_id !== familyId) deny("Reward");
}

/** task_assignments → child_id → children.family_id */
export async function assertAssignmentInFamily(assignmentId: string, familyId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("task_assignments")
    .select("id, child:children(family_id)")
    .eq("id", assignmentId)
    .maybeSingle();
  const child = one<{ family_id: string }>(data?.child as never);
  if (!child || child.family_id !== familyId) deny("Assignment");
}

/**
 * task_completions → assignment_id → task_assignments → child_id → children.family_id
 * Returns the resolved child_id, which callers almost always need next.
 */
export async function assertCompletionInFamily(
  completionId: string,
  familyId: string,
): Promise<{ childId: string; assignmentId: string }> {
  const db = createAdminClient();
  const { data } = await db
    .from("task_completions")
    .select("id, assignment_id, assignment:task_assignments(child_id, child:children(family_id))")
    .eq("id", completionId)
    .maybeSingle();
  const assignment = one<{ child_id: string; child: unknown }>(data?.assignment as never);
  const child = one<{ family_id: string }>(assignment?.child as never);
  if (!data || !assignment || !child || child.family_id !== familyId) deny("Completion");
  return { childId: assignment!.child_id, assignmentId: data!.assignment_id as string };
}

/** reward_redemptions → child_id → children.family_id */
export async function assertRedemptionInFamily(
  redemptionId: string,
  familyId: string,
): Promise<{ childId: string }> {
  const db = createAdminClient();
  const { data } = await db
    .from("reward_redemptions")
    .select("id, child_id, child:children(family_id)")
    .eq("id", redemptionId)
    .maybeSingle();
  const child = one<{ family_id: string }>(data?.child as never);
  if (!data || !child || child.family_id !== familyId) deny("Redemption");
  return { childId: data!.child_id as string };
}

/** task_evidence.family_id */
export async function assertEvidenceInFamily(evidenceId: string, familyId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("task_evidence")
    .select("family_id")
    .eq("id", evidenceId)
    .maybeSingle();
  if (!data || data.family_id !== familyId) deny("Evidence");
}

/** responsibility_events.family_id */
export async function assertResponsibilityEventInFamily(eventId: string, familyId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("responsibility_events")
    .select("family_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!data || data.family_id !== familyId) deny("Event");
}

/** family_quests.family_id */
export async function assertQuestInFamily(questId: string, familyId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("family_quests")
    .select("family_id")
    .eq("id", questId)
    .maybeSingle();
  if (!data || data.family_id !== familyId) deny("Quest");
}

/** coin_transactions / star_transactions → child_id → children.family_id */
export async function assertTransactionInFamily(
  table: "coin_transactions" | "star_transactions",
  txId: string,
  familyId: string,
) {
  const db = createAdminClient();
  const { data } = await db
    .from(table)
    .select("id, child:children(family_id)")
    .eq("id", txId)
    .maybeSingle();
  const child = one<{ family_id: string }>(data?.child as never);
  if (!child || child.family_id !== familyId) deny("Transaction");
}

/**
 * Storage objects are keyed `<family_id>/<child_id>/<file>`, so a caller-supplied
 * path must be prefixed with the caller's family id. Guards against both
 * cross-tenant reads and `..` traversal out of the family prefix.
 */
export function assertStoragePathInFamily(storagePath: string, familyId: string) {
  if (!storagePath || storagePath.includes("..") || !storagePath.startsWith(`${familyId}/`)) {
    deny("File");
  }
}
