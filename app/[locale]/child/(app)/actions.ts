"use server";

import "@/lib/dev-tls-patch";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "@/lib/i18n/routing";
import { cookies, headers } from "next/headers";
import { getChildSession, clearChildSession } from "@/lib/auth/child-session";
import { submitTaskAsChild, requestRedemptionAsChild } from "@/lib/ledger";
import { recordCompletion } from "@/lib/streaks";
import { checkAndAwardBadges } from "@/lib/badges";

async function localeFrom() {
  const h = await headers();
  const url = h.get("referer") ?? "";
  const m = url.match(/\/(en|vi)(\/|$)/);
  return (m?.[1] as "en" | "vi") ?? "en";
}

export async function signOutChild() {
  await clearChildSession();
  redirect({ href: "/child/select", locale: await localeFrom() });
}

export async function submitTaskAction(formData: FormData) {
  const assignment_id = z.string().uuid().parse(formData.get("assignment_id"));
  const session = await getChildSession();
  if (!session) throw new Error("No child session");

  // Critical path: submit the task — must succeed
  const completionId = await submitTaskAsChild(assignment_id, session.childId);

  // Handle evidence if present (non-critical — log errors but don't block submission)
  try {
    const evidenceType = formData.get("evidence_type") as string | null;
    if (evidenceType && evidenceType !== "none" && evidenceType !== "parent_observation") {
      await saveEvidence(completionId, session.childId, formData, evidenceType);
    }
  } catch (e) {
    console.error("[submitTaskAction] saveEvidence failed:", e);
  }

  // Non-critical: streak + badge updates — log errors but don't crash the action
  try {
    await recordCompletion(session.childId);
  } catch (e) {
    console.error("[submitTaskAction] recordCompletion failed:", e);
  }
  try {
    await checkAndAwardBadges(session.childId);
  } catch (e) {
    console.error("[submitTaskAction] checkAndAwardBadges failed:", e);
  }

  (await cookies()).set("confetti", "1", { path: "/", maxAge: 10, httpOnly: false });
  revalidatePath("/[locale]/child/quests", "page");
  revalidatePath("/[locale]/child/home", "page");
  revalidatePath("/[locale]/child/me", "page");
}

const ALLOWED_PHOTO_PREFIXES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_AUDIO_PREFIXES = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/x-m4a"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const EVIDENCE_EXPIRY_DAYS = 7;

async function saveEvidence(
  completionId: string,
  childId: string,
  formData: FormData,
  evidenceType: string,
) {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { data: child } = await admin
    .from("children")
    .select("family_id")
    .eq("id", childId)
    .single();
  if (!child?.family_id) return;
  const familyId = child.family_id as string;

  if (evidenceType === "photo" || evidenceType === "audio") {
    const file = formData.get("evidence_file") as File | null;
    if (!file || file.size === 0) return;

    const allowedPrefixes = evidenceType === "photo" ? ALLOWED_PHOTO_PREFIXES : ALLOWED_AUDIO_PREFIXES;
    if (!allowedPrefixes.some((p) => file.type === p || file.type.startsWith(p + ";"))) {
      console.error("[saveEvidence] invalid file type:", file.type);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      console.error("[saveEvidence] file too large:", file.size);
      return;
    }

    const ext = file.name.split(".").pop() || (evidenceType === "photo" ? "jpg" : "webm");
    const storagePath = `${familyId}/${childId}/${completionId}.${ext}`;

    const fileBuffer = await file.arrayBuffer();
    const { error: uploadErr } = await admin.storage
      .from("family-evidence")
      .upload(storagePath, fileBuffer, { contentType: file.type, upsert: false });
    if (uploadErr) throw uploadErr;

    const expiresAt = new Date(Date.now() + EVIDENCE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const audioDuration = evidenceType === "audio"
      ? parseInt(formData.get("audio_duration") as string) || null
      : null;

    await admin.from("task_evidence").insert({
      task_completion_id: completionId,
      child_id: childId,
      family_id: familyId,
      evidence_type: evidenceType,
      storage_path: storagePath,
      file_size: file.size,
      mime_type: file.type,
      audio_duration: audioDuration,
      status: "active",
      expires_at: expiresAt,
    });
  } else if (evidenceType === "text") {
    const text = ((formData.get("evidence_text") as string) || "").trim();
    if (!text) return;

    await admin.from("task_evidence").insert({
      task_completion_id: completionId,
      child_id: childId,
      family_id: familyId,
      evidence_type: "text",
      text_content: text.slice(0, 500),
      status: "active",
    });
  } else if (evidenceType === "choice") {
    const choice = formData.get("evidence_choice") as string;
    if (!choice) return;

    await admin.from("task_evidence").insert({
      task_completion_id: completionId,
      child_id: childId,
      family_id: familyId,
      evidence_type: "choice",
      choice_value: choice,
      status: "active",
    });
  }
}

export async function setDreamRewardAction(formData: FormData) {
  const reward_id = z.string().uuid().parse(formData.get("reward_id"));
  const session = await getChildSession();
  if (!session) throw new Error("No child session");
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  await admin.from("children").update({ current_dream_reward_id: reward_id }).eq("id", session.childId);
  (await cookies()).set("dream_set", "1", { path: "/", maxAge: 10, httpOnly: false });
  revalidatePath("/[locale]/child/home", "page");
  revalidatePath("/[locale]/child/rewards", "page");
}

export async function requestRewardAction(
  _prev: { ok: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; error?: string; needsApproval?: boolean; redemptionId?: string }> {
  try {
    const reward_id = z.string().uuid().parse(formData.get("reward_id"));
    const session = await getChildSession();
    if (!session) return { ok: false, error: "No child session" };

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();

    console.log("[requestRewardAction] start reward_id=", reward_id, "child=", session.childId);

    // Fetch reward details
    const { data: reward, error: rewardErr } = await admin
      .from("rewards")
      .select("id, family_id, coin_cost, requires_approval, active, stock")
      .eq("id", reward_id)
      .single();
    if (rewardErr || !reward) { console.error("[requestRewardAction] reward fetch error:", rewardErr); return { ok: false, error: "Reward not found" }; }
    if (!reward.active) return { ok: false, error: "Reward inactive" };
    if (reward.stock !== null && reward.stock <= 0) return { ok: false, error: "Out of stock" };

    // Check child belongs to same family
    const { data: child } = await admin.from("children").select("family_id").eq("id", session.childId).single();
    if (!child || child.family_id !== reward.family_id) return { ok: false, error: "Family mismatch" };

    // Check balance
    const { coin } = await (await import("@/lib/ledger")).getChildBalance(session.childId);
    console.log("[requestRewardAction] balance check: coin=", coin, "cost=", reward.coin_cost);
    if (coin < reward.coin_cost) return { ok: false, error: `Not enough coins (have ${coin}, need ${reward.coin_cost})` };

    const status = reward.requires_approval ? "requested" : "approved";

    const { data: redemption, error: insertErr } = await admin
      .from("reward_redemptions")
      .insert({ reward_id, child_id: session.childId, coin_cost: reward.coin_cost, status })
      .select("id")
      .single();
    if (insertErr) { console.error("[requestRewardAction] insert error:", insertErr); return { ok: false, error: insertErr.message }; }

    console.log("[requestRewardAction] redemption inserted id=", redemption?.id, "status=", status);

    // Decrement stock if applicable
    if (reward.stock !== null) {
      await admin.from("rewards").update({ stock: reward.stock - 1 }).eq("id", reward_id);
    }

    // Always deduct coins immediately (hold). If parent rejects, coins are refunded.
    if (redemption) {
      await admin.from("coin_transactions").insert({
        child_id: session.childId,
        amount: -reward.coin_cost,
        transaction_type: "REWARD_REDEMPTION",
        reference_id: redemption.id,
        description: reward.requires_approval ? "Reward requested (held)" : "Auto-approved redemption",
      });
      if (!reward.requires_approval) {
        await admin.from("reward_redemptions").update({ approved_at: new Date().toISOString() }).eq("id", redemption.id);
      }
    }

    revalidatePath("/[locale]/child/(app)/rewards", "page");
    revalidatePath("/[locale]/child/(app)/home", "page");
    return { ok: true, needsApproval: reward.requires_approval, redemptionId: redemption?.id };
  } catch (err: any) {
    console.error("[requestRewardAction] unexpected error:", err?.message ?? err);
    return { ok: false, error: err?.message ?? "Unknown error" };
  }
}

export async function cancelRedemptionAction(
  _prev: { ok: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const redemption_id = z.string().uuid().parse(formData.get("redemption_id"));
    const session = await getChildSession();
    if (!session) return { ok: false, error: "No child session" };

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();

    const { data: r } = await admin
      .from("reward_redemptions")
      .select("child_id, coin_cost, status")
      .eq("id", redemption_id)
      .single();
    if (!r) return { ok: false, error: "Not found" };
    if (r.child_id !== session.childId) return { ok: false, error: "Not your request" };
    if (r.status !== "requested") return { ok: false, error: "Already processed" };

    await admin.from("reward_redemptions")
      .update({ status: "cancelled", approved_at: new Date().toISOString() })
      .eq("id", redemption_id);

    // Refund coins
    await admin.from("coin_transactions").insert({
      child_id: session.childId,
      amount: r.coin_cost,
      transaction_type: "MANUAL_ADJUSTMENT",
      reference_id: redemption_id,
      description: "Reward request cancelled — refund",
    });

    revalidatePath("/[locale]/child/(app)/rewards", "page");
    revalidatePath("/[locale]/child/(app)/home", "page");
    return { ok: true };
  } catch (err: any) {
    console.error("[cancelRedemptionAction] error:", err?.message ?? err);
    return { ok: false, error: err?.message ?? "Unknown error" };
  }
}

export async function claimChoiceQuestAction(formData: FormData) {
  const task_id = z.string().uuid().parse(formData.get("task_id"));
  const session = await getChildSession();
  if (!session) throw new Error("No child session");

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { todayISO } = await import("@/lib/recurrence");
  const admin = createAdminClient();
  const today = todayISO();

  // 1. Verify task exists, is active, and is in pool for this family
  const { data: task } = await admin
    .from("tasks")
    .select("id, family_id, name, in_pool, pool_max_per_day, requires_approval, active, coin_reward, star_reward")
    .eq("id", task_id)
    .eq("in_pool", true)
    .eq("active", true)
    .single();
  if (!task) throw new Error("Task not available in pool");

  // Verify task belongs to child's family
  const { data: child } = await admin.from("children").select("family_id").eq("id", session.childId).single();
  if (!child || child.family_id !== task.family_id) throw new Error("Not in same family");

  // 2. Check per-child daily claim limit from child_pool_config
  const { data: cfg } = await admin
    .from("child_pool_config")
    .select("max_claims_per_day")
    .eq("child_id", session.childId)
    .single();
  const maxPerDay = cfg?.max_claims_per_day ?? 1;

  const { count: claimsToday } = await admin
    .from("pool_claims")
    .select("id", { count: "exact", head: true })
    .eq("child_id", session.childId)
    .eq("claimed_date", today);
  if ((claimsToday ?? 0) >= maxPerDay) throw new Error("Daily claim limit reached");

  // 3. Check per-task daily limit (pool_max_per_day)
  if (task.pool_max_per_day != null) {
    const { count: taskClaimsToday } = await admin
      .from("pool_claims")
      .select("id", { count: "exact", head: true })
      .eq("task_id", task_id)
      .eq("child_id", session.childId)
      .eq("claimed_date", today);
    if ((taskClaimsToday ?? 0) >= task.pool_max_per_day) throw new Error("Task daily limit reached");
  }

  // 4. Check this child hasn't already claimed this exact task today
  const { count: dupCheck } = await admin
    .from("pool_claims")
    .select("id", { count: "exact", head: true })
    .eq("child_id", session.childId)
    .eq("task_id", task_id)
    .eq("claimed_date", today);
  if ((dupCheck ?? 0) > 0) throw new Error("Already claimed today");

  // 5. Create task_assignment (same flow as parent-assigned tasks)
  const { data: assignment, error: assignErr } = await admin
    .from("task_assignments")
    .insert({
      task_id,
      child_id: session.childId,
      due_date: today,
      status: "todo",
    })
    .select("id")
    .single();
  if (assignErr || !assignment) throw new Error("Failed to create assignment");

  // 6. Record pool claim
  await admin.from("pool_claims").insert({
    child_id: session.childId,
    task_id,
    assignment_id: assignment.id,
    claimed_date: today,
  });

  revalidatePath("/[locale]/child/home", "page");
  revalidatePath("/[locale]/child/quests", "page");
}

export async function markMessagesReadAction(formData: FormData) {
  const ids_raw = formData.get("ids") as string;
  const ids = ids_raw ? ids_raw.split(",").filter(Boolean) : [];
  if (!ids.length) return;
  const session = await getChildSession();
  if (!session) throw new Error("No child session");
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  await admin
    .from("parent_messages")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids)
    .eq("child_id", session.childId)
    .is("read_at", null);
  revalidatePath("/[locale]/child/home", "page");
  revalidatePath("/[locale]/child/me", "page");
}

export async function reactToMessageAction(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const reaction = formData.get("reaction") as string;
  if (!["❤️", "😊", "🌟"].includes(reaction)) throw new Error("Invalid reaction");
  const session = await getChildSession();
  if (!session) throw new Error("No child session");
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  await admin
    .from("parent_messages")
    .update({ reaction, read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("child_id", session.childId);
  revalidatePath("/[locale]/child/home", "page");
  revalidatePath("/[locale]/child/me", "page");
}

export async function markWeeklyReflectionReadAction(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const session = await getChildSession();
  if (!session) throw new Error("No child session");
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  await admin
    .from("weekly_reflections")
    .update({ child_read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("child_id", session.childId);
  revalidatePath("/[locale]/child/me", "page");
}

export async function clearAllMessagesAction() {
  const session = await getChildSession();
  if (!session) throw new Error("No child session");

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  await admin.from("parent_messages").delete().eq("child_id", session.childId);
  revalidatePath("/[locale]/child/(app)/home", "page");
  revalidatePath("/[locale]/child/(app)/me", "page");
}

export async function revokeAssignmentAction(formData: FormData) {
  const assignment_id = z.string().uuid().parse(formData.get("assignment_id"));
  const session = await getChildSession();
  if (!session) throw new Error("No child session");

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  // Only allow revoking todo or rejected assignments (not submitted/approved)
  const { error } = await admin
    .from("task_assignments")
    .delete()
    .eq("id", assignment_id)
    .eq("child_id", session.childId)
    .in("status", ["todo", "rejected"]);
  if (error) throw error;
  revalidatePath("/[locale]/child/(app)/home", "page");
}

export async function deleteJourneyEntryAction(formData: FormData) {
  const tx_id = z.string().uuid().parse(formData.get("tx_id"));
  const session = await getChildSession();
  if (!session) throw new Error("No child session");

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  await admin.from("coin_transactions").delete().eq("id", tx_id).eq("child_id", session.childId);
  revalidatePath("/[locale]/child/(app)/me", "page");
}

export async function refreshPoolAction(formData: FormData) {
  const session = await getChildSession();
  if (!session) throw new Error("No child session");

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { todayISO } = await import("@/lib/recurrence");
  const admin = createAdminClient();
  const today = todayISO();

  // Check 1 refresh/day limit
  const { error } = await admin.from("pool_refresh_log").insert({
    child_id: session.childId,
    refresh_date: today,
  });
  if (error) throw new Error("Already refreshed today");

  revalidatePath("/[locale]/child/home", "page");
}
