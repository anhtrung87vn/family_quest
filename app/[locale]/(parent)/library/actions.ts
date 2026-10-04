"use server";

import "@/lib/dev-tls-patch";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { resolveContext } from "@/lib/dev-family";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertChildInFamily } from "@/lib/authz";

/**
 * Copy a system template into a family's task list.
 * Sets family_id, is_system_template = false, and source_template_key.
 * Does NOT duplicate if the family already has an active task with the same name.
 */
export async function copyTemplateToFamily(formData: FormData) {
  const schema = z.object({
    template_id: z.string().uuid(),
    child_id: z.string().uuid().optional().nullable(),
  });
  const { template_id, child_id } = schema.parse({
    template_id: formData.get("template_id"),
    child_id: formData.get("child_id") || null,
  });

  const { supabase, familyId, userId } = await resolveContext();
  if (child_id) await assertChildInFamily(child_id, familyId);

  // Fetch the template — system templates have family_id = nil UUID, so RLS on
  // the user-scoped client would block the read.  Use admin for this lookup.
  const admin = createAdminClient();
  const { data: tpl, error: fetchErr } = await admin
    .from("tasks")
    .select("*")
    .eq("id", template_id)
    .eq("is_system_template", true)
    .single();
  if (fetchErr || !tpl) throw new Error("Template not found");

  // Check if family already has an active task with this name
  const { data: existing } = await supabase
    .from("tasks")
    .select("id")
    .eq("family_id", familyId)
    .eq("name", tpl.name)
    .eq("active", true)
    .limit(1);
  if (existing && existing.length > 0) {
    throw new Error("A task with this name already exists in your family");
  }

  // Build the family copy
  const {
    id: _id,
    created_at: _ca,
    updated_at: _ua,
    ...rest
  } = tpl;

  const { data: newTask, error: insertErr } = await supabase
    .from("tasks")
    .insert({
      ...rest,
      family_id: familyId,
      is_system_template: false,
      created_by: userId,
      source_template_key: tpl.template_key,
      template_key: null,
      active: true,
    })
    .select("id")
    .single();
  if (insertErr) throw insertErr;

  // If child_id provided, create an assignment
  if (child_id && newTask) {
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from("task_assignments").insert({
      task_id: newTask.id,
      child_id,
      due_date: today,
      status: "pending",
    });

    // For habit_building tasks, auto-create the reward progress entry so the
    // fading system is ready from day one.  Without this, habit coins pay
    // indefinitely until the parent manually clicks "Start Habit Support".
    if (tpl.behavior_type === "habit_building") {
      await admin
        .from("child_task_reward_progress")
        .upsert(
          { child_id, task_id: newTask.id, reward_stage: "full_reward", completions: 0 },
          { onConflict: "child_id,task_id" },
        );
    }
  }

  revalidatePath("/[locale]/(parent)/library", "page");
  revalidatePath("/[locale]/(parent)/tasks", "page");
}
