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

const reflectionSchema = z.object({
  child_id: z.string().uuid(),
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  highlights: z.string().max(1000).optional().nullable(),
  growth_note: z.string().max(1000).optional().nullable(),
  parent_message: z.string().max(500).optional().nullable(),
});

export async function saveReflection(formData: FormData) {
  const parsed = reflectionSchema.parse({
    child_id: formData.get("child_id"),
    week_start: formData.get("week_start"),
    highlights: formData.get("highlights") || null,
    growth_note: formData.get("growth_note") || null,
    parent_message: formData.get("parent_message") || null,
  });
  const { supabase, userId, familyId } = await requireFamily();

  // Compute weekly stats
  const weekEnd = new Date(parsed.week_start);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const endStr = weekEnd.toISOString().slice(0, 10);

  const [tasksResult, coinsResult, starsResult] = await Promise.all([
    supabase.from("task_assignments")
      .select("id", { count: "exact", head: true })
      .eq("child_id", parsed.child_id)
      .eq("status", "approved")
      .gte("created_at", parsed.week_start)
      .lte("created_at", endStr + "T23:59:59Z"),
    supabase.from("coin_transactions")
      .select("amount")
      .eq("child_id", parsed.child_id)
      .gt("amount", 0)
      .gte("created_at", parsed.week_start)
      .lte("created_at", endStr + "T23:59:59Z"),
    supabase.from("star_transactions")
      .select("amount")
      .eq("child_id", parsed.child_id)
      .gt("amount", 0)
      .gte("created_at", parsed.week_start)
      .lte("created_at", endStr + "T23:59:59Z"),
  ]);

  const { data: upserted } = await supabase.from("weekly_reflections").upsert({
    family_id: familyId,
    child_id: parsed.child_id,
    week_start: parsed.week_start,
    highlights: parsed.highlights,
    growth_note: parsed.growth_note,
    parent_message: parsed.parent_message,
    tasks_completed: tasksResult.count ?? 0,
    coins_earned: (coinsResult.data ?? []).reduce((s, r) => s + r.amount, 0),
    stars_earned: (starsResult.data ?? []).reduce((s, r) => s + r.amount, 0),
    created_by: userId,
  }, { onConflict: "child_id,week_start" }).select("id").single();

  // If a parent_message was written, also create a WEEKLY_JOURNAL parent_message row
  if (parsed.parent_message && upserted?.id) {
    const admin = createAdminClient();
    await admin.from("parent_messages").insert({
      family_id: familyId,
      child_id: parsed.child_id,
      parent_user_id: userId,
      message_type: "WEEKLY_JOURNAL",
      message: parsed.parent_message,
      reference_id: upserted.id,
    });
  }

  revalidatePath("/[locale]/reflections", "page");
}
