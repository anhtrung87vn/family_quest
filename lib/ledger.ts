// Ledger helpers: thin wrappers around Postgres SECURITY DEFINER functions.
// In dev bypass mode, the RPCs (which depend on auth.uid()) are replaced by
// direct admin-client queries that replicate the same transactional logic.

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEV_BYPASS, DEV_USER_ID } from "@/lib/dev-family";

async function parentClient() {
  if (DEV_BYPASS) return createAdminClient();
  return createClient();
}

export async function awardTask(completionId: string, note?: string) {
  if (DEV_BYPASS) {
    const db = createAdminClient();
    const { data: tc } = await db
      .from("task_completions")
      .select("id, assignment_id, status")
      .eq("id", completionId)
      .single();
    if (!tc) throw new Error("completion not found");
    const { data: a } = await db
      .from("task_assignments")
      .select("id, child_id, task_id")
      .eq("id", tc.assignment_id)
      .single();
    if (!a) throw new Error("assignment not found");
    const { data: t } = await db.from("tasks").select("coin_reward, star_reward, behavior_type").eq("id", a.task_id).single();

    // Compute effective rewards based on behavior_type + reward_stage
    let effCoin = t?.coin_reward ?? 0;
    let effStar = t?.star_reward ?? 0;
    const behavior = (t as any)?.behavior_type ?? "challenge";
    if (behavior === "habit_building" || behavior === "responsibility") {
      const { data: progress } = await db
        .from("child_task_reward_progress")
        .select("reward_stage")
        .eq("child_id", a.child_id)
        .eq("task_id", a.task_id)
        .maybeSingle();
      const stage = progress?.reward_stage ?? (behavior === "responsibility" ? "graduated" : "full_reward");
      if (stage === "reduced_reward") { effCoin = Math.max(Math.floor(effCoin * 0.4), 0); }
      else if (stage === "stars_only") { effCoin = 0; effStar = effStar > 0 ? Math.max(Math.floor(effStar * 0.5), 1) : 0; }
      else if (stage === "graduated") { effCoin = 0; effStar = 0; }
    }

    await db.from("task_completions").update({ status: "approved", approved_at: new Date().toISOString(), approved_by: DEV_USER_ID, parent_note: note ?? null }).eq("id", completionId);
    await db.from("task_assignments").update({ status: "approved" }).eq("id", a.id);
    if (effCoin > 0)
      await db.from("coin_transactions").insert({ child_id: a.child_id, amount: effCoin, transaction_type: "TASK_REWARD", reference_id: completionId, description: "Task approved", created_by: DEV_USER_ID });
    if (effStar > 0) {
      await db.from("star_transactions").insert({ child_id: a.child_id, amount: effStar, transaction_type: "TASK_STAR_REWARD", reference_id: completionId, description: "Task approved", created_by: DEV_USER_ID });
      const { data: child } = await db.from("children").select("lifetime_stars").eq("id", a.child_id).single();
      await db.from("children").update({ lifetime_stars: (child?.lifetime_stars ?? 0) + effStar }).eq("id", a.child_id);
    }
    // Increment completion counter for habit tracking
    const { data: existing } = await db
      .from("child_task_reward_progress")
      .select("id, completions")
      .eq("child_id", a.child_id)
      .eq("task_id", a.task_id)
      .maybeSingle();
    if (existing) {
      await db.from("child_task_reward_progress")
        .update({ completions: (existing.completions ?? 0) + 1, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await db.from("child_task_reward_progress")
        .insert({ child_id: a.child_id, task_id: a.task_id, completions: 1 });
    }
    return;
  }
  const supabase = await parentClient();
  const { error } = await supabase.rpc("award_task", {
    p_completion_id: completionId,
    p_note: note ?? null,
  });
  if (error) throw error;
}

export async function rejectTask(completionId: string, note?: string) {
  if (DEV_BYPASS) {
    const db = createAdminClient();
    const { data: tc } = await db.from("task_completions").select("assignment_id").eq("id", completionId).single();
    if (!tc) throw new Error("completion not found");
    await db.from("task_completions").update({ status: "rejected", parent_note: note ?? null, approved_by: DEV_USER_ID, approved_at: new Date().toISOString() }).eq("id", completionId);
    await db.from("task_assignments").update({ status: "rejected" }).eq("id", tc.assignment_id);
    return;
  }
  const supabase = await parentClient();
  const { error } = await supabase.rpc("reject_task", {
    p_completion_id: completionId,
    p_note: note ?? null,
  });
  if (error) throw error;
}

export async function approveRedemption(redemptionId: string) {
  if (DEV_BYPASS) {
    const db = createAdminClient();
    const { data: r } = await db.from("reward_redemptions").select("child_id, coin_cost, status").eq("id", redemptionId).single();
    if (!r) throw new Error("redemption not found");
    if (r.status !== "requested") return; // already approved/rejected/cancelled — no-op
    // Coins were already deducted at request time — just flip status.
    await db.from("reward_redemptions").update({ status: "approved", approved_at: new Date().toISOString(), approved_by: DEV_USER_ID }).eq("id", redemptionId);
    return;
  }
  const supabase = await parentClient();
  const { error } = await supabase.rpc("redeem_reward", {
    p_redemption_id: redemptionId,
  });
  if (error) throw error;
}

export async function rejectRedemption(redemptionId: string, note?: string) {
  if (DEV_BYPASS) {
    const db = createAdminClient();
    const { data: r } = await db.from("reward_redemptions").select("child_id, coin_cost, status").eq("id", redemptionId).single();
    if (!r) throw new Error("redemption not found");
    if (r.status !== "requested") return; // already processed — no-op
    await db.from("reward_redemptions").update({ status: "rejected", approved_by: DEV_USER_ID, approved_at: new Date().toISOString() }).eq("id", redemptionId);
    // Refund coins — they were deducted at request time
    await db.from("coin_transactions").insert({ child_id: r.child_id, amount: r.coin_cost, transaction_type: "MANUAL_ADJUSTMENT", reference_id: redemptionId, description: "Reward request rejected — refund", created_by: DEV_USER_ID });
    return;
  }
  const supabase = await parentClient();
  const { error } = await supabase.rpc("reject_redemption", {
    p_redemption_id: redemptionId,
    p_note: note ?? null,
  });
  if (error) throw error;
}

export async function manualAdjustCoins(childId: string, amount: number, reason: string) {
  if (DEV_BYPASS) {
    const db = createAdminClient();
    await db.from("coin_transactions").insert({ child_id: childId, amount, transaction_type: "MANUAL_ADJUSTMENT", description: reason, created_by: DEV_USER_ID });
    return;
  }
  const supabase = await parentClient();
  const { error } = await supabase.rpc("manual_adjust_coins", {
    p_child_id: childId,
    p_amount: amount,
    p_reason: reason,
  });
  if (error) throw error;
}

// Child-side operations run via service-role (child is not an auth.user).
export async function submitTaskAsChild(assignmentId: string, childId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("submit_task", {
    p_assignment_id: assignmentId,
    p_child_id: childId,
  });
  if (error) throw error;
  return data as string;
}

export async function requestRedemptionAsChild(rewardId: string, childId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("request_redemption", {
    p_reward_id: rewardId,
    p_child_id: childId,
  });
  if (error) throw error;
  return data as string;
}

export async function getChildBalance(childId: string): Promise<{ coin: number; star: number }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("child_balances")
    .select("coin_balance, star_balance")
    .eq("child_id", childId)
    .single();
  if (error) {
    // Log but don't crash on transient network errors (ECONNRESET, etc.)
    console.error("[getChildBalance]", error.message ?? error);
    return { coin: 0, star: 0 };
  }
  return { coin: data?.coin_balance ?? 0, star: data?.star_balance ?? 0 };
}
