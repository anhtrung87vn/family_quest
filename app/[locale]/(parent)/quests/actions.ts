"use server";

import "@/lib/dev-tls-patch";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEV_BYPASS, DEV_FAMILY_ID, DEV_USER_ID } from "@/lib/dev-family";

async function requireFamily() {
  if (DEV_BYPASS) {
    return { supabase: createAdminClient(), userId: DEV_USER_ID, familyId: DEV_FAMILY_ID };
  }
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Unauthorized");
  const { data: me } = await supabase
    .from("users").select("family_id").eq("id", auth.user.id).single();
  if (!me?.family_id) throw new Error("No family");
  return { supabase, userId: auth.user.id, familyId: me.family_id as string };
}

const questSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  target_count: z.coerce.number().int().min(1).max(1000),
  coin_reward: z.coerce.number().int().min(0).max(1000),
  star_reward: z.coerce.number().int().min(0).max(100),
  end_date: z.string().optional().nullable(),
});

export async function createFamilyQuest(formData: FormData) {
  const parsed = questSchema.parse({
    title: formData.get("title"),
    description: formData.get("description") || null,
    target_count: formData.get("target_count") || 1,
    coin_reward: formData.get("coin_reward") || 0,
    star_reward: formData.get("star_reward") || 0,
    end_date: formData.get("end_date") || null,
  });
  const { supabase, userId, familyId } = await requireFamily();
  await supabase.from("family_quests").insert({
    family_id: familyId,
    ...parsed,
    created_by: userId,
  });
  revalidatePath("/[locale]/quests", "page");
}

export async function contributeToQuest(formData: FormData) {
  const quest_id = z.string().uuid().parse(formData.get("quest_id"));
  const child_id = z.string().uuid().parse(formData.get("child_id"));
  const { supabase } = await requireFamily();

  // Upsert member contribution
  const { data: existing } = await supabase
    .from("family_quest_members")
    .select("id, contributions")
    .eq("quest_id", quest_id)
    .eq("child_id", child_id)
    .maybeSingle();

  if (existing) {
    await supabase.from("family_quest_members")
      .update({ contributions: existing.contributions + 1 })
      .eq("id", existing.id);
  } else {
    await supabase.from("family_quest_members").insert({
      quest_id, child_id, contributions: 1,
    });
  }

  // Update quest counter
  const { data: quest } = await supabase
    .from("family_quests").select("current_count, target_count").eq("id", quest_id).single();
  if (quest) {
    const newCount = quest.current_count + 1;
    const updates: Record<string, unknown> = { current_count: newCount };
    if (newCount >= quest.target_count) {
      updates.status = "completed";
      updates.completed_at = new Date().toISOString();
    }
    await supabase.from("family_quests").update(updates).eq("id", quest_id);
  }

  revalidatePath("/[locale]/quests", "page");
  revalidatePath("/[locale]/dashboard", "page");
}

export async function cancelQuest(formData: FormData) {
  const quest_id = z.string().uuid().parse(formData.get("quest_id"));
  const { supabase } = await requireFamily();
  await supabase.from("family_quests").update({ status: "cancelled" }).eq("id", quest_id);
  revalidatePath("/[locale]/quests", "page");
}

export async function cloneQuestTemplates() {
  const { supabase, userId, familyId } = await requireFamily();

  // Use admin client to bypass RLS when reading system templates
  const admin = createAdminClient();
  const { data: templates, error: fetchErr } = await admin
    .from("family_quests")
    .select("title, description, target_count, coin_reward, star_reward")
    .eq("family_id", "00000000-0000-0000-0000-000000000000")
    .eq("is_system_template", true);
  if (fetchErr) throw fetchErr;
  if (!templates?.length) return;

  // Skip titles already in this family
  const { data: existing } = await supabase
    .from("family_quests")
    .select("title")
    .eq("family_id", familyId);
  const existingTitles = new Set((existing ?? []).map((q) => q.title));

  const toInsert = templates
    .filter((t) => !existingTitles.has(t.title))
    .map((t) => ({
      ...t,
      family_id: familyId,
      is_system_template: false,
      created_by: userId,
      status: "active",
    }));

  if (toInsert.length > 0) {
    const { error } = await supabase.from("family_quests").insert(toInsert);
    if (error) throw error;
  }

  revalidatePath("/[locale]/quests", "page");
}
