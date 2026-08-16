// Streak tracking (design §46 — grace-day logic)
// A streak increments when the child completes at least one task today.
// If they miss one day, grace_used is set instead of resetting.
// If they miss two consecutive days, the streak resets.

import { createAdminClient } from "@/lib/supabase/admin";
import { todayISO } from "@/lib/recurrence";

export interface StreakInfo {
  current: number;
  longest: number;
  lastDate: string | null;
  graceUsed: boolean;
}

export async function getStreak(childId: string): Promise<StreakInfo> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("child_streaks")
    .select("current_streak, longest_streak, last_completion_date, grace_used")
    .eq("child_id", childId)
    .maybeSingle();

  if (error) {
    console.error("[getStreak]", error.message ?? error);
    return { current: 0, longest: 0, lastDate: null, graceUsed: false };
  }
  if (!data) return { current: 0, longest: 0, lastDate: null, graceUsed: false };
  return {
    current: data.current_streak,
    longest: data.longest_streak,
    lastDate: data.last_completion_date,
    graceUsed: data.grace_used,
  };
}

export async function recordCompletion(childId: string): Promise<StreakInfo> {
  const admin = createAdminClient();
  const today = todayISO();

  // Skip streak if child is on vacation
  const { data: child } = await admin
    .from("children").select("vacation_mode").eq("id", childId).single();
  if (child?.vacation_mode) {
    return getStreak(childId);
  }

  const { data: existing } = await admin
    .from("child_streaks")
    .select("*")
    .eq("child_id", childId)
    .maybeSingle();

  if (!existing) {
    // First ever completion
    await admin.from("child_streaks").insert({
      child_id: childId,
      current_streak: 1,
      longest_streak: 1,
      last_completion_date: today,
      grace_used: false,
    });
    return { current: 1, longest: 1, lastDate: today, graceUsed: false };
  }

  // Already counted today
  if (existing.last_completion_date === today) {
    return {
      current: existing.current_streak,
      longest: existing.longest_streak,
      lastDate: today,
      graceUsed: existing.grace_used,
    };
  }

  const lastDate = existing.last_completion_date
    ? new Date(existing.last_completion_date)
    : null;
  const todayDate = new Date(today);
  const diffDays = lastDate
    ? Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  let newStreak: number;
  let graceUsed: boolean;

  if (diffDays === 1) {
    // Consecutive day
    newStreak = existing.current_streak + 1;
    graceUsed = false;
  } else if (diffDays === 2 && !existing.grace_used) {
    // Grace day: missed one day but grace not yet used
    newStreak = existing.current_streak + 1;
    graceUsed = true;
  } else {
    // Streak broken
    newStreak = 1;
    graceUsed = false;
  }

  const longest = Math.max(existing.longest_streak, newStreak);

  await admin.from("child_streaks").update({
    current_streak: newStreak,
    longest_streak: longest,
    last_completion_date: today,
    grace_used: graceUsed,
    updated_at: new Date().toISOString(),
  }).eq("child_id", childId);

  return { current: newStreak, longest, lastDate: today, graceUsed };
}
