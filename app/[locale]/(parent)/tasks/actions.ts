"use server";

import "@/lib/dev-tls-patch";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayISO } from "@/lib/recurrence";
import { DEV_BYPASS, DEV_FAMILY_ID, DEV_USER_ID } from "@/lib/dev-family";

async function requireFamily() {
  if (DEV_BYPASS) {
    return { supabase: createAdminClient(), userId: DEV_USER_ID, familyId: DEV_FAMILY_ID };
  }
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Unauthorized");
  const { data: me } = await supabase
    .from("users")
    .select("family_id")
    .eq("id", auth.user.id)
    .single();
  if (!me?.family_id) throw new Error("No family");
  return { supabase, userId: auth.user.id, familyId: me.family_id as string };
}

const createTaskSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional().nullable(),
  category: z.enum(["learning", "responsibility", "family", "health", "creativity"]).optional().nullable(),
  coin_reward: z.coerce.number().int().min(0).max(500),
  star_reward: z.coerce.number().int().min(0).max(50),
  difficulty: z.coerce.number().int().min(1).max(3).optional().nullable(),
  requires_approval: z.coerce.boolean().default(true),
  recurrence: z.enum(["none", "daily", "weekdays"]).default("none"),
  behavior_type: z.enum(["responsibility", "habit_building", "challenge", "character", "family"]).default("challenge"),
  availability_type: z.enum(["assigned_only", "choice_pool", "both"]).default("assigned_only"),
  evidence_type: z.enum(["none", "photo", "audio", "text", "choice", "parent_observation"]).default("none"),
  evidence_required: z.coerce.boolean().default(false),
  max_audio_seconds: z.coerce.number().int().min(5).max(60).default(30),
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
  const { supabase } = await requireFamily();
  const { error } = await supabase.from("tasks").update({ active: !active }).eq("id", id);
  if (error) throw error;
  revalidatePath("/[locale]/(parent)/tasks", "page");
}

export async function toggleTaskPool(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const in_pool = formData.get("in_pool") === "true";
  const { supabase } = await requireFamily();
  const { error } = await supabase.from("tasks").update({ in_pool: !in_pool }).eq("id", id);
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
});

export async function updateTask(formData: FormData) {
  const parsed = updateTaskSchema.parse({
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description") || null,
    coin_reward: formData.get("coin_reward") || 0,
    star_reward: formData.get("star_reward") || 0,
    evidence_type: formData.get("evidence_type") || "none",
    evidence_required: formData.get("evidence_required") === "on" || formData.get("evidence_required") === "true",
    max_audio_seconds: formData.get("max_audio_seconds") || 30,
    requires_approval: formData.get("requires_approval") === "on" || formData.get("requires_approval") === "true",
  });
  const { supabase, familyId } = await requireFamily();
  const { error } = await supabase
    .from("tasks")
    .update({
      name: parsed.name,
      description: parsed.description,
      coin_reward: parsed.coin_reward,
      star_reward: parsed.star_reward,
      evidence_type: parsed.evidence_type,
      evidence_required: parsed.evidence_required,
      max_audio_seconds: parsed.max_audio_seconds,
      requires_approval: parsed.requires_approval,
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
    .select("name, description, category, coin_reward, star_reward, difficulty, requires_approval, is_recurring, recurrence_rule, in_pool, pool_max_per_day, behavior_type, availability_type, evidence_type, evidence_required, max_audio_seconds")
    .eq("is_system_template", true);
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
      }));
    if (rows.length) await supabase.from("tasks").insert(rows);
  }

  // Clone system reward templates
  const { data: tplRewards } = await admin
    .from("rewards")
    .select("name, description, category, coin_cost, requires_approval, dream_eligible, stock")
    .eq("is_system_template", true);
  if (tplRewards?.length) {
    const { data: existingRewards } = await supabase.from("rewards").select("name").eq("family_id", familyId);
    const existingRewardNames = new Set((existingRewards ?? []).map((r) => r.name));
    const rows = tplRewards
      .filter((r) => !existingRewardNames.has(r.name))
      .map((r) => ({
        ...r,
        family_id: familyId,
        is_system_template: false,
      }));
    if (rows.length) await supabase.from("rewards").insert(rows);
  }

  revalidatePath("/[locale]/(parent)/tasks", "page");
  revalidatePath("/[locale]/(parent)/rewards", "page");
}

export async function updateBehaviorType(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const behavior_type = z.enum(["responsibility", "habit_building", "challenge", "character", "family"]).parse(formData.get("behavior_type"));
  const { supabase } = await requireFamily();
  const { error } = await supabase.from("tasks").update({ behavior_type }).eq("id", id);
  if (error) throw error;
  revalidatePath("/[locale]/(parent)/tasks", "page");
}

export async function updateRewardStage(formData: FormData) {
  const child_id = z.string().uuid().parse(formData.get("child_id"));
  const task_id = z.string().uuid().parse(formData.get("task_id"));
  const reward_stage = z.enum(["full_reward", "reduced_reward", "stars_only", "graduated"]).parse(formData.get("reward_stage"));
  const { supabase } = await requireFamily();

  // Verify family scope
  const admin = createAdminClient();
  const { data: child } = await admin.from("children").select("family_id").eq("id", child_id).single();
  if (!child) throw new Error("Child not found");
  const { data: task } = await admin.from("tasks").select("family_id").eq("id", task_id).single();
  if (!task || task.family_id !== child.family_id) throw new Error("Task not in family");

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
  const { supabase } = await requireFamily();
  const rows = parsed.child_ids.map((cid) => ({
    task_id: parsed.task_id,
    child_id: cid,
    due_date: parsed.due_date,
    status: "todo" as const,
  }));
  const { error } = await supabase.from("task_assignments").insert(rows);
  if (error) throw error;
  revalidatePath("/[locale]/(parent)/tasks", "page");
  revalidatePath("/[locale]/(parent)/dashboard", "page");
}
