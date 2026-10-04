"use server";

import "@/lib/dev-tls-patch";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashPin } from "@/lib/auth/pin";
import { resolveContext } from "@/lib/dev-family";
import { assertAssignmentInFamily, assertChildInFamily } from "@/lib/authz";

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
  const { familyId, supabase: db } = await resolveContext();
  const pin_hash = await hashPin(parsed.pin);

  const { error } = await db.from("children").insert({
    family_id: familyId,
    name: parsed.name,
    grade: parsed.grade,
    preferred_language: parsed.preferred_language,
    pin_hash,
    date_of_birth: parsed.date_of_birth,
  });
  if (error) throw error;
  revalidatePath("/[locale]/kids", "page");
  revalidatePath("/[locale]/dashboard", "page");
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

  const { data: signed, error: signErr } = await admin.storage
    .from("family-avatars")
    .createSignedUrl(path, 60 * 60 * 24 * 30); // 30 days
  if (signErr) throw signErr;

  const { supabase: db } = await resolveContext();
  const { error } = await db
    .from("children")
    .update({ avatar_url: signed.signedUrl, updated_at: new Date().toISOString() })
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
