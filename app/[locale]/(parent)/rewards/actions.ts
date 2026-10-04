"use server";

import "@/lib/dev-tls-patch";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { REWARD_TEMPLATE_COLUMNS, toFamilyReward } from "@/lib/age-provisioning";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveContext } from "@/lib/dev-family";

const requireFamily = resolveContext;

const schema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional().nullable(),
  category: z.enum(["small", "medium", "large", "experience", "dream"]).optional().nullable(),
  coin_cost: z.coerce.number().int().min(1).max(100000),
  requires_approval: z.coerce.boolean().default(true),
  dream_eligible: z.coerce.boolean().default(false),
  stock: z.coerce.number().int().min(0).optional().nullable(),
  image_url: z.string().url().max(2000).optional().nullable(),
  link_url: z.string().url().max(2000).optional().nullable(),
});

export async function createReward(formData: FormData) {
  const parsed = schema.parse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    category: formData.get("category") || null,
    coin_cost: formData.get("coin_cost"),
    requires_approval: formData.get("requires_approval") === "on",
    dream_eligible: formData.get("dream_eligible") === "on",
    stock: formData.get("stock") ? Number(formData.get("stock")) : null,
    image_url: (formData.get("image_url") as string)?.trim() || null,
    link_url: (formData.get("link_url") as string)?.trim() || null,
  });
  const { supabase, familyId } = await requireFamily();
  const { error } = await supabase.from("rewards").insert({
    family_id: familyId,
    name: parsed.name,
    description: parsed.description,
    category: parsed.category,
    coin_cost: parsed.coin_cost,
    requires_approval: parsed.requires_approval,
    dream_eligible: parsed.dream_eligible,
    stock: parsed.stock,
    image_url: parsed.image_url,
    link_url: parsed.link_url,
  });
  if (error) throw error;
  revalidatePath("/[locale]/rewards", "page");
}

export async function updateReward(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const parsed = schema.parse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    category: formData.get("category") || null,
    coin_cost: formData.get("coin_cost"),
    requires_approval: formData.get("requires_approval") === "on",
    dream_eligible: formData.get("dream_eligible") === "on",
    stock: formData.get("stock") ? Number(formData.get("stock")) : null,
    image_url: (formData.get("image_url") as string)?.trim() || null,
    link_url: (formData.get("link_url") as string)?.trim() || null,
  });
  const { supabase, familyId } = await requireFamily();
  const { error } = await supabase.from("rewards").update({
    name: parsed.name,
    description: parsed.description,
    category: parsed.category,
    coin_cost: parsed.coin_cost,
    requires_approval: parsed.requires_approval,
    dream_eligible: parsed.dream_eligible,
    stock: parsed.stock,
    image_url: parsed.image_url,
    link_url: parsed.link_url,
  }).eq("id", id).eq("family_id", familyId);
  if (error) throw error;
  revalidatePath("/[locale]/rewards", "page");
}

export async function deleteReward(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const { supabase, familyId } = await requireFamily();
  const { error } = await supabase.from("rewards").delete().eq("id", id).eq("family_id", familyId);
  if (error) throw error;
  revalidatePath("/[locale]/rewards", "page");
}

export async function uploadRewardImage(
  formData: FormData,
): Promise<{ url: string } | { error: string }> {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "No file" };
  if (file.size > 5 * 1024 * 1024) return { error: "File too large (max 5 MB)" };
  if (!file.type.startsWith("image/")) return { error: "Not an image" };

  const { familyId } = await requireFamily();
  const admin = createAdminClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${familyId}/${Date.now()}.${ext}`;

  const bytes = await file.arrayBuffer();
  const { error } = await admin.storage
    .from("reward-images")
    .upload(path, bytes, { contentType: file.type, upsert: true });
  if (error) return { error: error.message };

  const { data } = admin.storage.from("reward-images").getPublicUrl(path);
  return { url: data.publicUrl };
}

export async function toggleRewardActive(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const active = formData.get("active") === "true";
  const { supabase, familyId } = await requireFamily();
  const { error } = await supabase
    .from("rewards")
    .update({ active: !active })
    .eq("id", id)
    .eq("family_id", familyId);
  if (error) throw error;
  revalidatePath("/[locale]/rewards", "page");
}

export async function cloneRewardTemplates() {
  const { supabase, familyId } = await requireFamily();

  // Use admin client to bypass RLS when reading system templates
  const admin = createAdminClient();
  const { data: templates, error: fetchErr } = await admin
    .from("rewards")
    .select(REWARD_TEMPLATE_COLUMNS)
    .eq("family_id", "00000000-0000-0000-0000-000000000000")
    .eq("is_system_template", true)
    .eq("active", true);
  if (fetchErr) throw fetchErr;
  if (!templates?.length) return;

  // Fetch names already in this family to avoid duplicates
  const { data: existing } = await supabase
    .from("rewards")
    .select("name")
    .eq("family_id", familyId);
  const existingNames = new Set((existing ?? []).map((r) => r.name));

  const toInsert = templates
    .filter((t) => !existingNames.has(t.name))
    .map((t) => toFamilyReward(t, familyId));

  if (toInsert.length > 0) {
    const { error: insertErr } = await supabase.from("rewards").insert(toInsert);
    if (insertErr) throw insertErr;
  }

  revalidatePath("/[locale]/rewards", "page");
}

export async function resetAndRecloneRewards() {
  const { supabase, familyId } = await requireFamily();
  const admin = createAdminClient();

  // Hard-delete ALL non-system family rewards (active + inactive) to avoid
  // duplicate accumulation from repeated resets (soft-deleted rows were
  // not excluded from the dedup check, causing duplicates on each run).
  const { error: delErr } = await admin
    .from("rewards")
    .delete()
    .eq("family_id", familyId)
    .eq("is_system_template", false);
  if (delErr) throw delErr;

  // Fetch all system templates including name_vi / description_vi
  const { data: templates, error: fetchErr } = await admin
    .from("rewards")
    .select(REWARD_TEMPLATE_COLUMNS)
    .eq("family_id", "00000000-0000-0000-0000-000000000000")
    .eq("is_system_template", true)
    .eq("active", true);
  if (fetchErr) throw fetchErr;
  if (!templates?.length) return;

  const rows = templates.map((t) => toFamilyReward(t, familyId));
  const { error: insertErr } = await supabase.from("rewards").insert(rows);
  if (insertErr) throw insertErr;

  revalidatePath("/[locale]/(parent)/rewards", "page");
}
