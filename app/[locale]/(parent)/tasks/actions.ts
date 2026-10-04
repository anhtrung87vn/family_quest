"use server";

import "@/lib/dev-tls-patch";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayISO } from "@/lib/recurrence";
import { resolveContext } from "@/lib/dev-family";
import { assertChildInFamily, assertTaskInFamily } from "@/lib/authz";
import { REWARD_TEMPLATE_COLUMNS, toFamilyReward } from "@/lib/age-provisioning";
import { ageFromDob } from "@/lib/age";
import { tasksFittingNoChild } from "@/lib/task-age-fit";

const requireFamily = resolveContext;

const createTaskSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional().nullable(),
  category: z.enum(["learning", "responsibility", "family", "health", "creativity"]).optional().nullable(),
  coin_reward: z.coerce.number().int().min(0).max(500),
  star_reward: z.coerce.number().int().min(0).max(50),
  difficulty: z.coerce.number().int().min(1).max(10).optional().nullable(),
  requires_approval: z.coerce.boolean().default(true),
  recurrence: z.enum(["none", "daily", "weekdays"]).default("none"),
  behavior_type: z.enum(["responsibility", "habit_building", "challenge", "character", "family"]).default("challenge"),
  responsibility_policy: z.enum(["NONE", "REPAIR_REQUIRED", "COMPLETE_BEFORE_PRIVILEGE", "PARENT_DECIDES"]).default("NONE"),
  availability_type: z.enum(["assigned_only", "choice_pool", "both"]).default("assigned_only"),
  evidence_type: z.enum(["none", "photo", "audio", "text", "choice", "parent_observation"]).default("none"),
  evidence_required: z.coerce.boolean().default(false),
  max_audio_seconds: z.coerce.number().int().min(5).max(60).default(30),
  // Curriculum fields (all optional — family-created tasks may not set them)
  skill_domain: z.enum(["LEARNING", "SELF_MANAGEMENT", "LIFE_HOME", "MONEY", "COMMUNICATION", "CHARACTER_FAMILY", "HEALTH", "DIGITAL", "WORLD_INDEPENDENCE"]).optional().nullable(),
  min_age: z.coerce.number().int().min(4).max(21).optional().nullable(),
  recommended_age: z.coerce.number().int().min(4).max(21).optional().nullable(),
  max_age: z.coerce.number().int().min(4).max(21).optional().nullable(),
  independence_level: z.enum(["GUIDED", "SUPPORTED", "INDEPENDENT"]).optional().nullable(),
  estimated_minutes: z.coerce.number().int().min(1).max(480).optional().nullable(),
  development_goal: z.string().max(500).optional().nullable(),
  parent_tip: z.string().max(500).optional().nullable(),
  requires_supervision: z.coerce.boolean().default(false),
});

export async function createTask(formData: FormData) {
  const parsed = createTaskSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    category: formData.get("category") || null,
    coin_reward: formData.get("coin_reward") || 0,
    star_reward: formData.get("star_reward") || 0,
    difficulty: formData.get("difficulty") || null,
    requires_approval: formData.get("requires_approval") === "on" || formData.get("requires_approval") === "true",
    recurrence: (formData.get("recurrence") as string) || "none",
    behavior_type: (formData.get("behavior_type") as string) || "challenge",
    responsibility_policy: (formData.get("responsibility_policy") as string) || "NONE",
    availability_type: (formData.get("availability_type") as string) || "assigned_only",
    evidence_type: (formData.get("evidence_type") as string) || "none",
    evidence_required: formData.get("evidence_required") === "on" || formData.get("evidence_required") === "true",
    max_audio_seconds: formData.get("max_audio_seconds") || 30,
  });
  // Derive in_pool from availability_type for backward compatibility
  const in_pool = parsed.availability_type === "choice_pool" || parsed.availability_type === "both";
  const pool_max_per_day_raw = formData.get("pool_max_per_day");
  const pool_max_per_day = pool_max_per_day_raw ? parseInt(String(pool_max_per_day_raw), 10) || 1 : 1;

  const { supabase, userId, familyId } = await requireFamily();

  const is_recurring = parsed.recurrence !== "none";
  const recurrence_rule = is_recurring ? JSON.stringify({ freq: parsed.recurrence }) : null;

  const { error } = await supabase.from("tasks").insert({
    family_id: familyId,
    name: parsed.name,
    description: parsed.description,
    category: parsed.category,
    coin_reward: parsed.coin_reward,
    star_reward: parsed.star_reward,
    difficulty: parsed.difficulty,
    requires_approval: parsed.requires_approval,
    is_recurring,
    recurrence_rule,
    in_pool,
    pool_max_per_day: in_pool ? pool_max_per_day : null,
    behavior_type: parsed.behavior_type,
    responsibility_policy: parsed.responsibility_policy,
    availability_type: parsed.availability_type,
    evidence_type: parsed.evidence_type,
    evidence_required: parsed.evidence_required,
    max_audio_seconds: parsed.max_audio_seconds,
    created_by: userId,
  });
  if (error) throw error;
  revalidatePath("/[locale]/(parent)/tasks", "page");
}

export async function toggleTaskActive(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const active = formData.get("active") === "true";
  const { supabase, familyId } = await requireFamily();
  const { error } = await supabase
    .from("tasks")
    .update({ active: !active })
    .eq("id", id)
    .eq("family_id", familyId);
  if (error) throw error;
  revalidatePath("/[locale]/(parent)/tasks", "page");
}

export async function toggleTaskPool(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const in_pool = formData.get("in_pool") === "true";
  const { supabase, familyId } = await requireFamily();
  const { error } = await supabase
    .from("tasks")
    .update({ in_pool: !in_pool })
    .eq("id", id)
    .eq("family_id", familyId);
  if (error) throw error;
  revalidatePath("/[locale]/(parent)/tasks", "page");
}

export async function deleteTask(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const { supabase, familyId } = await requireFamily();
  // Soft-delete: deactivate instead of hard delete to preserve history
  const { error } = await supabase
    .from("tasks")
    .update({ active: false })
    .eq("id", id)
    .eq("family_id", familyId);
  if (error) throw error;
  revalidatePath("/[locale]/(parent)/tasks", "page");
}

const updateTaskSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional().nullable(),
  coin_reward: z.coerce.number().int().min(0).max(500),
  star_reward: z.coerce.number().int().min(0).max(50),
  evidence_type: z.enum(["none", "photo", "audio", "text", "choice", "parent_observation"]).default("none"),
  evidence_required: z.coerce.boolean().default(false),
  max_audio_seconds: z.coerce.number().int().min(5).max(60).default(30),
  requires_approval: z.coerce.boolean().default(true),
  responsibility_policy: z.enum(["NONE", "REPAIR_REQUIRED", "COMPLETE_BEFORE_PRIVILEGE", "PARENT_DECIDES"]).default("NONE"),
});

export async function updateTask(formData: FormData) {
  // The form edits the Vietnamese text (name_vi/description_vi) when the parent
  // works in Vietnamese on a bilingual task; otherwise the base columns.
  const editVi = formData.has("name_vi");
  const parsed = updateTaskSchema.parse({
    id: formData.get("id"),
    name: formData.get(editVi ? "name_vi" : "name"),
    description: formData.get(editVi ? "description_vi" : "description") || null,
    coin_reward: formData.get("coin_reward") || 0,
    star_reward: formData.get("star_reward") || 0,
    evidence_type: formData.get("evidence_type") || "none",
    evidence_required: formData.get("evidence_required") === "on" || formData.get("evidence_required") === "true",
    max_audio_seconds: formData.get("max_audio_seconds") || 30,
    requires_approval: formData.get("requires_approval") === "on" || formData.get("requires_approval") === "true",
    responsibility_policy: (formData.get("responsibility_policy") as string) || "NONE",
  });
  const { supabase, familyId } = await requireFamily();
  const { error } = await supabase
    .from("tasks")
    .update({
      ...(editVi
        ? { name_vi: parsed.name, description_vi: parsed.description }
        : { name: parsed.name, description: parsed.description }),
      coin_reward: parsed.coin_reward,
      star_reward: parsed.star_reward,
      evidence_type: parsed.evidence_type,
      evidence_required: parsed.evidence_required,
      max_audio_seconds: parsed.max_audio_seconds,
      requires_approval: parsed.requires_approval,
      responsibility_policy: parsed.responsibility_policy,
    })
    .eq("id", parsed.id)
    .eq("family_id", familyId);
  if (error) throw error;
  revalidatePath("/[locale]/(parent)/tasks", "page");
}

export async function cloneSystemTemplates() {
  const { supabase, userId, familyId } = await requireFamily();

  // Use admin client to bypass RLS when reading system templates (family_id = nil UUID)
  const admin = createAdminClient();

  // Clone system task templates
  const { data: tplTasks } = await admin
    .from("tasks")
    .select("name, name_vi, description, description_vi, category, coin_reward, star_reward, difficulty, requires_approval, is_recurring, recurrence_rule, in_pool, pool_max_per_day, behavior_type, responsibility_policy, availability_type, evidence_type, evidence_required, max_audio_seconds, skill_domain, skill_subdomain, min_age, recommended_age, max_age, independence_level, estimated_minutes, recommended_frequency, requires_supervision, development_goal, development_goal_vi, parent_tip, parent_tip_vi, template_key, skill_ladder_key, skill_ladder_level")
    .eq("is_system_template", true)
    .eq("active", true);
  if (tplTasks?.length) {
    // Skip names that already exist as active tasks; allow re-cloning soft-deleted ones
    const { data: existingTasks } = await supabase.from("tasks").select("name").eq("family_id", familyId).eq("active", true);
    const existingTaskNames = new Set((existingTasks ?? []).map((t) => t.name));
    const rows = tplTasks
      .filter((t) => !existingTaskNames.has(t.name))
      .map((t) => ({
        ...t,
        family_id: familyId,
        is_system_template: false,
        created_by: userId,
        source_template_key: t.template_key,
        template_key: undefined, // Don't copy the system template_key to family copies
      }));
    if (rows.length) await supabase.from("tasks").insert(rows);
  }

  // Clone system reward templates
  const { data: tplRewards } = await admin
    .from("rewards")
    .select(REWARD_TEMPLATE_COLUMNS)
    .eq("is_system_template", true)
    .eq("active", true);
  if (tplRewards?.length) {
    // Only skip templates whose name already exists as an ACTIVE reward (soft-deleted rows don't count)
    const { data: existingRewards } = await supabase.from("rewards").select("name").eq("family_id", familyId).eq("active", true);
    const existingRewardNames = new Set((existingRewards ?? []).map((r) => r.name));
    const rows = tplRewards
      .filter((r) => !existingRewardNames.has(r.name))
      .map((r) => toFamilyReward(r, familyId));
    if (rows.length) await supabase.from("rewards").insert(rows);
  }

  revalidatePath("/[locale]/(parent)/tasks", "page");
  revalidatePath("/[locale]/(parent)/rewards", "page");
}

export async function updateBehaviorType(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const behavior_type = z.enum(["responsibility", "habit_building", "challenge", "character", "family"]).parse(formData.get("behavior_type"));
  const { supabase, familyId } = await requireFamily();
  const { error } = await supabase
    .from("tasks")
    .update({ behavior_type })
    .eq("id", id)
    .eq("family_id", familyId);
  if (error) throw error;
  revalidatePath("/[locale]/(parent)/tasks", "page");
}

/**
 * A responsibility the child won't do yet becomes a temporary habit: it pays a
 * small reward that fades (full → reduced → stars only → graduated), after
 * which it can return to being a plain responsibility.
 */
export async function convertResponsibilityToHabit(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const { supabase, familyId } = await requireFamily();
  await assertTaskInFamily(id, familyId);
  const { error } = await supabase
    .from("tasks")
    .update({ behavior_type: "habit_building", coin_reward: 5, star_reward: 1 })
    .eq("id", id)
    .eq("family_id", familyId)
    .eq("behavior_type", "responsibility");
  if (error) throw error;
  // Start the fading ladder from the top for every child.
  const { error: progErr } = await supabase
    .from("child_task_reward_progress")
    .update({ reward_stage: "full_reward", completions: 0 })
    .eq("task_id", id);
  if (progErr) throw progErr;
  revalidatePath("/[locale]/(parent)/tasks", "page");
  revalidatePath("/[locale]/child/(app)/home", "page");
}

export async function updateRewardStage(formData: FormData) {
  const child_id = z.string().uuid().parse(formData.get("child_id"));
  const task_id = z.string().uuid().parse(formData.get("task_id"));
  const reward_stage = z.enum(["full_reward", "reduced_reward", "stars_only", "graduated"]).parse(formData.get("reward_stage"));
  const { familyId } = await requireFamily();

  // Both records must belong to the CALLER's family — checking only that the task
  // and child match each other would still allow editing another family's data.
  await Promise.all([
    assertChildInFamily(child_id, familyId),
    assertTaskInFamily(task_id, familyId),
  ]);

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const graduated_at = reward_stage === "graduated" ? now : null;

  await admin.from("child_task_reward_progress").upsert({
    child_id,
    task_id,
    reward_stage,
    stage_changed_at: now,
    graduated_at,
    updated_at: now,
  }, { onConflict: "child_id,task_id" });

  revalidatePath("/[locale]/(parent)/tasks", "page");
  revalidatePath("/[locale]/child/(app)/home", "page");
}

export async function deleteAllTasks() {
  const { supabase, familyId } = await requireFamily();
  const { error } = await supabase
    .from("tasks")
    .update({ active: false })
    .eq("family_id", familyId)
    .eq("active", true)
    .eq("is_system_template", false);
  if (error) throw error;
  revalidatePath("/[locale]/(parent)/tasks", "page");
}

export async function resetAndRecloneTasks() {
  const { supabase, userId, familyId } = await requireFamily();
  const admin = createAdminClient();

  // Soft-delete all active family tasks
  const { error: delErr } = await supabase
    .from("tasks")
    .update({ active: false })
    .eq("family_id", familyId)
    .eq("active", true)
    .eq("is_system_template", false);
  if (delErr) throw delErr;

  // Fetch all system templates (including name_vi / description_vi + curriculum fields)
  const { data: tplTasks, error: fetchErr } = await admin
    .from("tasks")
    .select("name, name_vi, description, description_vi, category, coin_reward, star_reward, difficulty, requires_approval, is_recurring, recurrence_rule, in_pool, pool_max_per_day, behavior_type, availability_type, evidence_type, evidence_required, max_audio_seconds, skill_domain, skill_subdomain, min_age, recommended_age, max_age, independence_level, estimated_minutes, recommended_frequency, requires_supervision, development_goal, development_goal_vi, parent_tip, parent_tip_vi, template_key, skill_ladder_key, skill_ladder_level")
    .eq("is_system_template", true)
    .eq("active", true);
  if (fetchErr) throw fetchErr;
  if (!tplTasks?.length) return;

  const rows = tplTasks.map((t) => ({
    ...t,
    family_id: familyId,
    is_system_template: false,
    active: true,
    created_by: userId,
    source_template_key: t.template_key,
    template_key: undefined,
  }));
  const { error: insertErr } = await supabase.from("tasks").insert(rows);
  if (insertErr) throw insertErr;

  revalidatePath("/[locale]/(parent)/tasks", "page");
  revalidatePath("/[locale]/(parent)/rewards", "page");
}

export async function assignTask(formData: FormData) {
  const schema = z.object({
    task_id: z.string().uuid(),
    child_ids: z.array(z.string().uuid()).min(1),
    due_date: z.string().optional().nullable(),
  });
  const child_ids = formData.getAll("child_ids").map(String);
  const parsed = schema.parse({
    task_id: formData.get("task_id"),
    child_ids,
    due_date: (formData.get("due_date") as string) || todayISO(),
  });
  const { supabase, familyId } = await requireFamily();

  // The task and every target child must belong to the caller's family.
  await Promise.all([
    assertTaskInFamily(parsed.task_id, familyId),
    ...parsed.child_ids.map((cid) => assertChildInFamily(cid, familyId)),
  ]);

  const rows = parsed.child_ids.map((cid) => ({
    task_id: parsed.task_id,
    child_id: cid,
    due_date: parsed.due_date,
    status: "todo" as const,
  }));
  const { error } = await supabase.from("task_assignments").insert(rows);
  if (error) throw error;

  // For habit_building tasks, auto-create reward progress entries so the
  // fading system is ready from day one.  Without this, habit coins pay
  // indefinitely until the parent manually clicks "Start Habit Support".
  const { data: task } = await supabase
    .from("tasks")
    .select("behavior_type")
    .eq("id", parsed.task_id)
    .single();
  if (task?.behavior_type === "habit_building") {
    const admin = createAdminClient();
    const progressRows = parsed.child_ids.map((cid) => ({
      child_id: cid,
      task_id: parsed.task_id,
      reward_stage: "full_reward" as const,
      completions: 0,
    }));
    await admin
      .from("child_task_reward_progress")
      .upsert(progressRows, { onConflict: "child_id,task_id" });
  }

  revalidatePath("/[locale]/(parent)/tasks", "page");
  revalidatePath("/[locale]/(parent)/dashboard", "page");
}

/**
 * Soft-delete (active=false) every active family task whose age range fits none
 * of the family's children. Re-computed here rather than trusting the client.
 * Does nothing when the family has no children or any child has no birthday,
 * because then "fits no child" cannot be known.
 */
export async function disableOutOfAgeTasks(): Promise<{ disabled: number }> {
  const { supabase, familyId } = await requireFamily();

  const [{ data: children, error: childErr }, { data: tasks, error: taskErr }] = await Promise.all([
    supabase.from("children").select("date_of_birth").eq("family_id", familyId),
    supabase
      .from("tasks")
      .select("id, min_age, max_age")
      .eq("family_id", familyId)
      .eq("active", true)
      .eq("is_system_template", false),
  ]);
  if (childErr) throw childErr;
  if (taskErr) throw taskErr;

  const ages = (children ?? []).map((c) => ageFromDob(c.date_of_birth as string | null));
  const ids = tasksFittingNoChild(tasks ?? [], ages).map((t) => t.id as string);
  if (!ids.length) return { disabled: 0 };

  const { error } = await supabase
    .from("tasks")
    .update({ active: false })
    .eq("family_id", familyId)
    .eq("active", true)
    .in("id", ids);
  if (error) throw error;

  revalidatePath("/[locale]/(parent)/tasks", "page");
  return { disabled: ids.length };
}
