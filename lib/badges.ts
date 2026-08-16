// Badge checker — called after task approval to award any newly earned badges.

import { createAdminClient } from "@/lib/supabase/admin";

export async function checkAndAwardBadges(childId: string): Promise<string[]> {
  const admin = createAdminClient();
  const newBadges: string[] = [];

  // Get all badges the child hasn't earned yet
  const { data: unearned } = await admin
    .from("badges")
    .select("id, slug, condition_type, condition_value, star_bonus, icon, name_en")
    .not("id", "in", `(select badge_id from child_badges where child_id = '${childId}')`);

  if (!unearned?.length) return newBadges;

  // Compute stats
  const [tasksResult, coinsResult, rewardsResult, streakResult] = await Promise.all([
    admin.from("task_assignments").select("id", { count: "exact", head: true })
      .eq("child_id", childId).eq("status", "approved"),
    admin.from("coin_transactions").select("amount")
      .eq("child_id", childId).gt("amount", 0),
    admin.from("reward_redemptions").select("id", { count: "exact", head: true })
      .eq("child_id", childId).in("status", ["approved", "fulfilled"]),
    admin.from("child_streaks").select("current_streak, longest_streak")
      .eq("child_id", childId).maybeSingle(),
  ]);

  const tasksCompleted = tasksResult.count ?? 0;
  const coinsEarned = (coinsResult.data ?? []).reduce((s, r) => s + r.amount, 0);
  const rewardsRedeemed = rewardsResult.count ?? 0;
  const currentStreak = streakResult.data?.current_streak ?? 0;
  const longestStreak = streakResult.data?.longest_streak ?? 0;
  const bestStreak = Math.max(currentStreak, longestStreak);

  const stats: Record<string, number> = {
    tasks_completed: tasksCompleted,
    coins_earned: coinsEarned,
    rewards_redeemed: rewardsRedeemed,
    streak_days: bestStreak,
    dream_achieved: 0, // checked separately
  };

  for (const badge of unearned) {
    const val = stats[badge.condition_type] ?? 0;
    if (val >= badge.condition_value) {
      const { error } = await admin.from("child_badges").insert({
        child_id: childId,
        badge_id: badge.id,
      });
      if (!error) {
        newBadges.push(`${badge.icon} ${badge.name_en}`);
        // Award star bonus
        if (badge.star_bonus > 0) {
          await admin.from("star_transactions").insert({
            child_id: childId,
            amount: badge.star_bonus,
            transaction_type: "BADGE_BONUS",
            reference_id: badge.id,
            description: `Badge earned: ${badge.name_en}`,
          });
          const { data: child } = await admin
            .from("children").select("lifetime_stars").eq("id", childId).single();
          if (child) {
            await admin.from("children").update({
              lifetime_stars: child.lifetime_stars + badge.star_bonus,
            }).eq("id", childId);
          }
        }
      }
    }
  }

  return newBadges;
}
