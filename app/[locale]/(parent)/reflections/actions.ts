"use server";

import "@/lib/dev-tls-patch";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveContext } from "@/lib/dev-family";
import { assertChildInFamily } from "@/lib/authz";
import { addDaysISO, familyDayStart } from "@/lib/family-time";

const requireFamily = resolveContext;

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
  // The stats queries below are keyed only by child_id, so without this the
  // reflection would aggregate another family's child.
  await assertChildInFamily(parsed.child_id, familyId);

  // Compute weekly stats
  // The week is Monday 00:00 → next Monday 00:00 on the family calendar.
  const weekFrom = familyDayStart(parsed.week_start).toISOString();
  const weekTo = familyDayStart(addDaysISO(parsed.week_start, 7)).toISOString();

  const [tasksResult, coinsResult, starsResult] = await Promise.all([
    supabase.from("task_assignments")
      .select("id", { count: "exact", head: true })
      .eq("child_id", parsed.child_id)
      .eq("status", "approved")
      .gte("created_at", weekFrom)
      .lt("created_at", weekTo),
    supabase.from("coin_transactions")
      .select("amount")
      .eq("child_id", parsed.child_id)
      .gt("amount", 0)
      .gte("created_at", weekFrom)
      .lt("created_at", weekTo),
    supabase.from("star_transactions")
      .select("amount")
      .eq("child_id", parsed.child_id)
      .gt("amount", 0)
      .gte("created_at", weekFrom)
      .lt("created_at", weekTo),
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
