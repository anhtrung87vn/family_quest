"use server";

import "@/lib/dev-tls-patch";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashPin } from "@/lib/auth/pin";
import { resolveContext } from "@/lib/dev-family";
import { assertAssignmentInFamily, assertChildInFamily } from "@/lib/authz";
import { autoProvisionNewChild, provisionForChild } from "@/lib/age-provisioning";
import { redirect } from "@/lib/i18n/routing";

const createSchema = z.object({
  name: z.string().min(1).max(40),
  grade: z.coerce.number().int().min(1).max(12).optional().nullable(),
  preferred_language: z.enum(["en", "vi"]).default("en"),
  pin: z.string().regex(/^\d{6}$/),
  date_of_birth: z.string().date().optional().nullable(),
});

export async function createChild(formData: FormData) {
  const parsed = createSchema.parse({
    name: formData.get("name"),
    grade: formData.get("grade") || null,
    preferred_language: formData.get("preferred_language") ?? "en",
    pin: formData.get("pin"),
    date_of_birth: formData.get("date_of_birth") || null,
  });
  const { familyId, userId, supabase: db } = await resolveContext();
  const pin_hash = await hashPin(parsed.pin);

  const { data: child, error } = await db.from("children").insert({
    family_id: familyId,
    name: parsed.name,
    grade: parsed.grade,
    preferred_language: parsed.preferred_language,
    pin_hash,
    date_of_birth: parsed.date_of_birth,
  }).select("id").single();
  if (error) throw error;

  // With a birthday we know the age: stock the pool and reward shop with
  // age-matched templates. Non-critical — the child is already created.
  if (parsed.date_of_birth && child) {
    try {
      await autoProvisionNewChild(child.id, familyId, userId);
    } catch (err) {
      console.error("[createChild] auto-provision failed", err);
    }
  }
  revalidatePath("/[locale]/kids", "page");
  revalidatePath("/[locale]/dashboard", "page");
  revalidatePath("/[locale]/(parent)/tasks", "page");
  revalidatePath("/[locale]/(parent)/rewards", "page");
}

export async function sendAgePack(formData: FormData) {
  const schema = z.object({
    locale: z.enum(["en", "vi"]),
    child_id: z.string().uuid(),
    task_template_ids: z.array(z.string().uuid()).max(100),
    reward_template_ids: z.array(z.string().uuid()).max(100),
  });
  const parsed = schema.parse({
    locale: formData.get("locale"),
    child_id: formData.get("child_id"),
    task_template_ids: formData.getAll("task_template_ids"),
    reward_template_ids: formData.getAll("reward_template_ids"),
  });
  const { familyId, userId } = await resolveContext();
  await assertChildInFamily(parsed.child_id, familyId);

  const result = await provisionForChild({
    childId: parsed.child_id,
    familyId,
    userId,
    taskTemplateIds: parsed.task_template_ids,
    rewardTemplateIds: parsed.reward_template_ids,
  });

  revalidatePath("/[locale]/(parent)/kids", "page");
  revalidatePath("/[locale]/(parent)/tasks", "page");
  revalidatePath("/[locale]/(parent)/rewards", "page");
  revalidatePath("/[locale]/child/(app)/home", "page");
  revalidatePath("/[locale]/child/(app)/rewards", "page");
  redirect({
    href: {
      pathname: "/kids",
      query: { sent: `${result.tasksAdded}.${result.assignmentsAdded}.${result.rewardsAdded}` },
    },
    locale: parsed.locale,
  });
}

export async function setPin(formData: FormData) {
  const schema = z.object({
    child_id: z.string().uuid(),
    pin: z.string().regex(/^\d{6}$/),
  });
  const { child_id, pin } = schema.parse({
    child_id: formData.get("child_id"),
    pin: formData.get("pin"),
  });
  const { supabase: db, familyId } = await resolveContext();
  const pin_hash = await hashPin(pin);
  const { error } = await db
    .from("children")
    .update({ pin_hash, updated_at: new Date().toISOString() })
    .eq("id", child_id)
    .eq("family_id", familyId);
  if (error) throw error;
  revalidatePath("/[locale]/kids", "page");
}

export async function revokeAssignment(formData: FormData) {
  const assignment_id = z.string().uuid().parse(formData.get("assignment_id"));
  const { supabase: db, familyId } = await resolveContext();
  // task_assignments has no family_id, so verify ownership via the child first.
  await assertAssignmentInFamily(assignment_id, familyId);
  const { error } = await db
    .from("task_assignments")
    .delete()
    .eq("id", assignment_id)
    .in("status", ["todo", "rejected"]);
  if (error) throw error;
  revalidatePath("/[locale]/(parent)/kids", "page");
}

export async function uploadAvatar(formData: FormData) {
  const child_id = z.string().uuid().parse(formData.get("child_id"));
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) throw new Error("No file");
  if (file.size > 5 * 1024 * 1024) throw new Error("File too large");

  const { familyId } = await resolveContext();
  await assertChildInFamily(child_id, familyId);
  const ext = (file.name.split(".").pop() ?? "png").toLowerCase();
  const path = `${familyId}/${child_id}.${ext}`;

  const admin = createAdminClient();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await admin.storage
    .from("family-avatars")
    .upload(path, bytes, { contentType: file.type || "image/*", upsert: true });
  if (upErr) throw upErr;

  // Store the object path; avatar_url is a stable app route that signs a fresh
  // URL on every view (signed URLs stored here used to expire after 30 days).
  const { supabase: db } = await resolveContext();
  const { error } = await db
    .from("children")
    .update({
      avatar_path: path,
      avatar_url: `/api/avatar/${child_id}?v=${Date.now()}`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", child_id)
    .eq("family_id", familyId);
  if (error) throw error;
  revalidatePath("/[locale]/kids", "page");
  revalidatePath("/[locale]/dashboard", "page");
}

export async function updateChildBirthday(formData: FormData) {
  const schema = z.object({
    child_id: z.string().uuid(),
    date_of_birth: z.string().date().optional().nullable(),
  });
  const { child_id, date_of_birth } = schema.parse({
    child_id: formData.get("child_id"),
    date_of_birth: formData.get("date_of_birth") || null,
  });
  const { supabase: db, familyId } = await resolveContext();
  const { error } = await db
    .from("children")
    .update({ date_of_birth, updated_at: new Date().toISOString() })
    .eq("id", child_id)
    .eq("family_id", familyId);
  if (error) throw error;
  revalidatePath("/[locale]/(parent)/kids", "page");
}
