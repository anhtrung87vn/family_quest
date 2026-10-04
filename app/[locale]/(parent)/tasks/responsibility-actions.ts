"use server";

import "@/lib/dev-tls-patch";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { resolveContext } from "@/lib/dev-family";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayISO } from "@/lib/recurrence";
import { assertChildInFamily } from "@/lib/authz";

// Schema for handling a missed responsibility
const handleMissedSchema = z.object({
  task_id: z.string().uuid(),
  child_id: z.string().uuid(),
  task_assignment_id: z.string().uuid().optional().nullable(),
  reason: z.enum(["forgot", "needed_help", "excused", "refused", "skip"]),
  parent_note: z.string().max(500).optional().nullable(),
});

/**
 * Parent classifies why a responsibility was missed.
 * Creates a responsibility_event — NEVER creates coin or star transactions.
 */
export async function handleMissedResponsibility(formData: FormData) {
  const parsed = handleMissedSchema.parse({
    task_id: formData.get("task_id"),
    child_id: formData.get("child_id"),
    task_assignment_id: formData.get("task_assignment_id") || null,
    reason: formData.get("reason"),
    parent_note: (formData.get("parent_note") as string) || null,
  });

  const { familyId, userId } = await resolveContext();
  const admin = createAdminClient();

  // Verify task belongs to family and is responsibility or habit_building type
  const { data: task, error: taskErr } = await admin
    .from("tasks")
    .select("id, behavior_type, responsibility_policy, family_id")
    .eq("id", parsed.task_id)
    .single();
  if (taskErr || !task) throw new Error("Task not found");
  if (task.family_id !== familyId) throw new Error("Task does not belong to your family");
  if (!["responsibility", "habit_building"].includes(task.behavior_type ?? "")) {
    throw new Error("Only responsibility or habit-building tasks can be classified as missed");
  }

  // Verify child belongs to family
  const { data: child, error: childErr } = await admin
    .from("children")
    .select("id, family_id")
    .eq("id", parsed.child_id)
    .single();
  if (childErr || !child) throw new Error("Child not found");
  if (child.family_id !== familyId) throw new Error("Child does not belong to your family");

  // Skip: no event created
  if (parsed.reason === "skip") {
    revalidatePath("/[locale]/(parent)/approvals", "page");
    return;
  }

  // Map reason to event_type and status
  const reasonMap: Record<string, { event_type: string; status: string }> = {
    forgot: { event_type: "FORGOTTEN", status: "OPEN" },
    needed_help: { event_type: "NEEDED_HELP", status: "OPEN" },
    excused: { event_type: "EXCUSED", status: "RESOLVED" },
    refused: { event_type: "REFUSED", status: "OPEN" },
  };
  const { event_type, status } = reasonMap[parsed.reason];

  // Dedup check: prevent duplicate events for same child+task+date+event_type
  const today = todayISO();
  const { data: existing } = await admin
    .from("responsibility_events")
    .select("id")
    .eq("child_id", parsed.child_id)
    .eq("task_id", parsed.task_id)
    .eq("event_type", event_type)
    .gte("occurred_at", today + "T00:00:00Z")
    .lte("occurred_at", today + "T23:59:59Z")
    .maybeSingle();

  if (existing) {
    // Update existing event instead of duplicating
    await admin
      .from("responsibility_events")
      .update({
        parent_note: parsed.parent_note,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    // Insert new event
    await admin.from("responsibility_events").insert({
      family_id: familyId,
      child_id: parsed.child_id,
      task_id: parsed.task_id,
      task_assignment_id: parsed.task_assignment_id,
      event_type,
      status,
      occurred_at: new Date().toISOString(),
      resolved_at: status === "RESOLVED" ? new Date().toISOString() : null,
      created_by: userId,
      parent_note: parsed.parent_note,
    });
  }

  // NEVER create coin_transactions or star_transactions here

  revalidatePath("/[locale]/(parent)/approvals", "page");
  revalidatePath("/[locale]/(parent)/dashboard", "page");
  revalidatePath("/[locale]/child/(app)/home", "page");
}

/**
 * Transition a responsibility task to habit_building mode.
 * Creates a child_task_reward_progress entry at full_reward stage.
 * WARNING: behavior_type is per-task, so changing it affects ALL assigned children.
 */
export async function startHabitSupport(formData: FormData) {
  const task_id = z.string().uuid().parse(formData.get("task_id"));
  const child_id = z.string().uuid().parse(formData.get("child_id"));

  const { familyId } = await resolveContext();
  const admin = createAdminClient();

  await assertChildInFamily(child_id, familyId);

  // Verify task belongs to family and is currently responsibility type
  const { data: task, error: taskErr } = await admin
    .from("tasks")
    .select("id, family_id, behavior_type, coin_reward, star_reward")
    .eq("id", task_id)
    .single();
  if (taskErr || !task) throw new Error("Task not found");
  if (task.family_id !== familyId) throw new Error("Task does not belong to your family");
  if (task.behavior_type !== "responsibility") throw new Error("Task is not a responsibility");

  // Transition to habit_building
  const updates: Record<string, unknown> = { behavior_type: "habit_building" };
  // If rewards are 0, set reasonable defaults so habit fading stages are meaningful
  if ((task.coin_reward ?? 0) === 0) updates.coin_reward = 5;
  if ((task.star_reward ?? 0) === 0) updates.star_reward = 1;

  await admin.from("tasks").update(updates).eq("id", task_id);

  // Create or upsert child_task_reward_progress at full_reward stage
  await admin
    .from("child_task_reward_progress")
    .upsert(
      { child_id, task_id, reward_stage: "full_reward", completions: 0 },
      { onConflict: "child_id,task_id" },
    );

  revalidatePath("/[locale]/(parent)/approvals", "page");
  revalidatePath("/[locale]/(parent)/dashboard", "page");
  revalidatePath("/[locale]/(parent)/tasks", "page");
  revalidatePath("/[locale]/child/(app)/home", "page");
}

/**
 * Transition a graduated habit_building task back to responsibility.
 * Sets responsibility_policy to REPAIR_REQUIRED.
 */
export async function makeResponsibility(formData: FormData) {
  const task_id = z.string().uuid().parse(formData.get("task_id"));

  const { familyId } = await resolveContext();
  const admin = createAdminClient();

  // Verify task belongs to family
  const { data: task, error: taskErr } = await admin
    .from("tasks")
    .select("id, family_id, behavior_type")
    .eq("id", task_id)
    .single();
  if (taskErr || !task) throw new Error("Task not found");
  if (task.family_id !== familyId) throw new Error("Task does not belong to your family");

  await admin
    .from("tasks")
    .update({
      behavior_type: "responsibility",
      responsibility_policy: "REPAIR_REQUIRED",
    })
    .eq("id", task_id);

  revalidatePath("/[locale]/(parent)/approvals", "page");
  revalidatePath("/[locale]/(parent)/dashboard", "page");
  revalidatePath("/[locale]/(parent)/tasks", "page");
  revalidatePath("/[locale]/child/(app)/home", "page");
}
