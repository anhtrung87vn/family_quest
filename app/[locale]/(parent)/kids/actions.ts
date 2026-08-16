"use server";

import "@/lib/dev-tls-patch";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashPin } from "@/lib/auth/pin";
import { DEV_BYPASS, DEV_FAMILY_ID, DEV_USER_ID } from "@/lib/dev-family";

const createSchema = z.object({
  name: z.string().min(1).max(40),
  grade: z.coerce.number().int().min(1).max(12).optional().nullable(),
  preferred_language: z.enum(["en", "vi"]).default("en"),
  pin: z.string().regex(/^\d{6}$/),
});

async function requireFamilyId() {
  if (DEV_BYPASS) return { userId: DEV_USER_ID, familyId: DEV_FAMILY_ID };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Unauthorized");
  const { data: me } = await supabase
    .from("users")
    .select("family_id")
    .eq("id", auth.user.id)
    .single();
  if (!me?.family_id) throw new Error("No family");
  return { userId: auth.user.id, familyId: me.family_id as string };
}

export async function createChild(formData: FormData) {
  const parsed = createSchema.parse({
    name: formData.get("name"),
    grade: formData.get("grade") || null,
    preferred_language: formData.get("preferred_language") ?? "en",
    pin: formData.get("pin"),
  });
  const { familyId } = await requireFamilyId();
  const pin_hash = await hashPin(parsed.pin);

  const db = DEV_BYPASS ? createAdminClient() : await createClient();
  const { error } = await db.from("children").insert({
    family_id: familyId,
    name: parsed.name,
    grade: parsed.grade,
    preferred_language: parsed.preferred_language,
    pin_hash,
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
  await requireFamilyId();
  const db = DEV_BYPASS ? createAdminClient() : await createClient();
  const pin_hash = await hashPin(pin);
  const { error } = await db
    .from("children")
    .update({ pin_hash, updated_at: new Date().toISOString() })
    .eq("id", child_id);
  if (error) throw error;
  revalidatePath("/[locale]/kids", "page");
}

export async function revokeAssignment(formData: FormData) {
  const assignment_id = z.string().uuid().parse(formData.get("assignment_id"));
  await requireFamilyId();
  const db = DEV_BYPASS ? createAdminClient() : await createClient();
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

  const { familyId } = await requireFamilyId();
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

  const db2 = DEV_BYPASS ? createAdminClient() : await createClient();
  const { error } = await db2
    .from("children")
    .update({ avatar_url: signed.signedUrl, updated_at: new Date().toISOString() })
    .eq("id", child_id);
  if (error) throw error;
  revalidatePath("/[locale]/kids", "page");
  revalidatePath("/[locale]/dashboard", "page");
}
