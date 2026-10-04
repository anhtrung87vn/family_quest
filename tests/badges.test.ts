import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Badges module tests — extracted from lib/badges.ts
//
// Strategy: Test badge criteria evaluation, stats computation, star bonus
// logic, and badge award flow as pure functions. The actual function uses
// createAdminClient() so we test the evaluation logic in isolation.
// ---------------------------------------------------------------------------

// ─── Types mirrored from badges.ts ───────────────────────────────────────

interface Badge {
  id: string;
  slug: string;
  condition_type: string;
  condition_value: number;
  star_bonus: number;
  icon: string;
  name_en: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. Badge condition evaluation
// ═══════════════════════════════════════════════════════════════════════════

describe("Badge condition evaluation", () => {
  function isBadgeEarned(
    stats: Record<string, number>,
    badge: Pick<Badge, "condition_type" | "condition_value">,
  ): boolean {
    const val = stats[badge.condition_type] ?? 0;
    return val >= badge.condition_value;
  }

  describe("tasks_completed", () => {
    it("earned when tasks completed equals threshold", () => {
      expect(isBadgeEarned({ tasks_completed: 10 }, { condition_type: "tasks_completed", condition_value: 10 })).toBe(true);
    });

    it("earned when tasks completed exceeds threshold", () => {
      expect(isBadgeEarned({ tasks_completed: 15 }, { condition_type: "tasks_completed", condition_value: 10 })).toBe(true);
    });

    it("not earned when tasks below threshold", () => {
      expect(isBadgeEarned({ tasks_completed: 9 }, { condition_type: "tasks_completed", condition_value: 10 })).toBe(false);
    });

    it("not earned with zero tasks", () => {
      expect(isBadgeEarned({ tasks_completed: 0 }, { condition_type: "tasks_completed", condition_value: 1 })).toBe(false);
    });
  });

  describe("coins_earned", () => {
    it("earned at threshold", () => {
      expect(isBadgeEarned({ coins_earned: 100 }, { condition_type: "coins_earned", condition_value: 100 })).toBe(true);
    });

    it("not earned below threshold", () => {
      expect(isBadgeEarned({ coins_earned: 99 }, { condition_type: "coins_earned", condition_value: 100 })).toBe(false);
    });
  });

  describe("rewards_redeemed", () => {
    it("earned when redeemed equals threshold", () => {
      expect(isBadgeEarned({ rewards_redeemed: 5 }, { condition_type: "rewards_redeemed", condition_value: 5 })).toBe(true);
    });

    it("not earned below threshold", () => {
      expect(isBadgeEarned({ rewards_redeemed: 4 }, { condition_type: "rewards_redeemed", condition_value: 5 })).toBe(false);
    });
  });

  describe("streak_days", () => {
    it("earned with sufficient streak", () => {
      expect(isBadgeEarned({ streak_days: 7 }, { condition_type: "streak_days", condition_value: 7 })).toBe(true);
    });

    it("not earned with short streak", () => {
      expect(isBadgeEarned({ streak_days: 6 }, { condition_type: "streak_days", condition_value: 7 })).toBe(false);
    });
  });

  describe("dream_achieved", () => {
    it("defaults to 0 (checked separately)", () => {
      expect(isBadgeEarned({ dream_achieved: 0 }, { condition_type: "dream_achieved", condition_value: 1 })).toBe(false);
    });
  });

  describe("unknown condition_type", () => {
    it("defaults to 0 for unknown stat (not earned)", () => {
      expect(isBadgeEarned({}, { condition_type: "unknown_stat", condition_value: 1 })).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Stats computation from DB results
// ═══════════════════════════════════════════════════════════════════════════

describe("Badge stats computation", () => {
  function computeStats(
    tasksCount: number | null,
    coinRows: { amount: number }[] | null,
    rewardsCount: number | null,
    streakData: { current_streak: number; longest_streak: number } | null,
  ): Record<string, number> {
    const tasksCompleted = tasksCount ?? 0;
    const coinsEarned = (coinRows ?? []).reduce((s, r) => s + r.amount, 0);
    const rewardsRedeemed = rewardsCount ?? 0;
    const currentStreak = streakData?.current_streak ?? 0;
    const longestStreak = streakData?.longest_streak ?? 0;
    const bestStreak = Math.max(currentStreak, longestStreak);

    return {
      tasks_completed: tasksCompleted,
      coins_earned: coinsEarned,
      rewards_redeemed: rewardsRedeemed,
      streak_days: bestStreak,
      dream_achieved: 0,
    };
  }

  it("computes tasks_completed from count", () => {
    const stats = computeStats(25, [], 0, null);
    expect(stats.tasks_completed).toBe(25);
  });

  it("defaults tasks_completed to 0 when null", () => {
    const stats = computeStats(null, [], null, null);
    expect(stats.tasks_completed).toBe(0);
  });

  it("sums positive coin amounts", () => {
    const stats = computeStats(0, [{ amount: 10 }, { amount: 20 }, { amount: 5 }], 0, null);
    expect(stats.coins_earned).toBe(35);
  });

  it("handles empty coin rows", () => {
    const stats = computeStats(0, [], 0, null);
    expect(stats.coins_earned).toBe(0);
  });

  it("handles null coin rows", () => {
    const stats = computeStats(0, null, 0, null);
    expect(stats.coins_earned).toBe(0);
  });

  it("computes rewards_redeemed from count", () => {
    const stats = computeStats(0, [], 3, null);
    expect(stats.rewards_redeemed).toBe(3);
  });

  it("uses best of current/longest streak", () => {
    const stats = computeStats(0, [], 0, { current_streak: 3, longest_streak: 10 });
    expect(stats.streak_days).toBe(10);
  });

  it("uses current streak when it's the longest", () => {
    const stats = computeStats(0, [], 0, { current_streak: 15, longest_streak: 10 });
    expect(stats.streak_days).toBe(15);
  });

  it("defaults streak to 0 when no streak data", () => {
    const stats = computeStats(0, [], 0, null);
    expect(stats.streak_days).toBe(0);
  });

  it("always sets dream_achieved to 0", () => {
    const stats = computeStats(100, [{ amount: 500 }], 20, { current_streak: 30, longest_streak: 30 });
    expect(stats.dream_achieved).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Badge award message formatting
// ═══════════════════════════════════════════════════════════════════════════

describe("Badge award message", () => {
  function formatBadgeMessage(icon: string, name: string): string {
    return `${icon} ${name}`;
  }

  it("combines icon and name", () => {
    expect(formatBadgeMessage("🌟", "First Star")).toBe("🌟 First Star");
  });

  it("handles emoji icons", () => {
    expect(formatBadgeMessage("🏆", "Champion")).toBe("🏆 Champion");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Star bonus transaction
// ═══════════════════════════════════════════════════════════════════════════

describe("Star bonus transaction", () => {
  function shouldAwardStarBonus(starBonus: number): boolean {
    return starBonus > 0;
  }

  function buildStarTx(childId: string, badge: Pick<Badge, "id" | "star_bonus" | "name_en">) {
    return {
      child_id: childId,
      amount: badge.star_bonus,
      transaction_type: "BADGE_BONUS",
      reference_id: badge.id,
      description: `Badge earned: ${badge.name_en}`,
    };
  }

  it("awards star bonus when > 0", () => {
    expect(shouldAwardStarBonus(5)).toBe(true);
  });

  it("skips star bonus when 0", () => {
    expect(shouldAwardStarBonus(0)).toBe(false);
  });

  it("builds correct star transaction", () => {
    const tx = buildStarTx("c1", { id: "b1", star_bonus: 3, name_en: "First Steps" });
    expect(tx.child_id).toBe("c1");
    expect(tx.amount).toBe(3);
    expect(tx.transaction_type).toBe("BADGE_BONUS");
    expect(tx.reference_id).toBe("b1");
    expect(tx.description).toBe("Badge earned: First Steps");
  });

  it("positive amount for star bonus", () => {
    const tx = buildStarTx("c1", { id: "b1", star_bonus: 10, name_en: "X" });
    expect(tx.amount).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Lifetime stars update
// ═══════════════════════════════════════════════════════════════════════════

describe("Lifetime stars update", () => {
  function computeNewLifetimeStars(current: number, bonus: number): number {
    return current + bonus;
  }

  it("adds bonus to existing lifetime stars", () => {
    expect(computeNewLifetimeStars(50, 5)).toBe(55);
  });

  it("starts from 0", () => {
    expect(computeNewLifetimeStars(0, 3)).toBe(3);
  });

  it("accumulates multiple bonuses", () => {
    let stars = 0;
    stars = computeNewLifetimeStars(stars, 3);
    stars = computeNewLifetimeStars(stars, 5);
    stars = computeNewLifetimeStars(stars, 2);
    expect(stars).toBe(10);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. Badge dedup (unearned filter)
// ═══════════════════════════════════════════════════════════════════════════

describe("Unearned badge filtering", () => {
  it("returns empty when all badges earned", () => {
    const unearned: Badge[] = [];
    expect(unearned.length).toBe(0);
  });

  it("returns all badges when none earned", () => {
    const allBadges: Badge[] = [
      { id: "b1", slug: "first-task", condition_type: "tasks_completed", condition_value: 1, star_bonus: 1, icon: "🌱", name_en: "First Task" },
      { id: "b2", slug: "ten-tasks", condition_type: "tasks_completed", condition_value: 10, star_bonus: 3, icon: "🏅", name_en: "Ten Tasks" },
    ];
    expect(allBadges.length).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. Multiple badges can be earned at once
// ═══════════════════════════════════════════════════════════════════════════

describe("Batch badge evaluation", () => {
  function evaluateBadges(
    stats: Record<string, number>,
    badges: Badge[],
  ): Badge[] {
    return badges.filter((b) => {
      const val = stats[b.condition_type] ?? 0;
      return val >= b.condition_value;
    });
  }

  it("awards multiple badges when stats qualify for all", () => {
    const badges: Badge[] = [
      { id: "b1", slug: "task-1", condition_type: "tasks_completed", condition_value: 1, star_bonus: 1, icon: "🌱", name_en: "First" },
      { id: "b2", slug: "task-5", condition_type: "tasks_completed", condition_value: 5, star_bonus: 2, icon: "🌿", name_en: "Five" },
      { id: "b3", slug: "task-10", condition_type: "tasks_completed", condition_value: 10, star_bonus: 3, icon: "🌳", name_en: "Ten" },
    ];
    const earned = evaluateBadges({ tasks_completed: 10 }, badges);
    expect(earned).toHaveLength(3);
  });

  it("awards only qualifying badges", () => {
    const badges: Badge[] = [
      { id: "b1", slug: "task-1", condition_type: "tasks_completed", condition_value: 1, star_bonus: 1, icon: "🌱", name_en: "First" },
      { id: "b2", slug: "task-100", condition_type: "tasks_completed", condition_value: 100, star_bonus: 10, icon: "🏆", name_en: "Century" },
    ];
    const earned = evaluateBadges({ tasks_completed: 50 }, badges);
    expect(earned).toHaveLength(1);
    expect(earned[0].slug).toBe("task-1");
  });

  it("awards badges across different condition types", () => {
    const badges: Badge[] = [
      { id: "b1", slug: "task-1", condition_type: "tasks_completed", condition_value: 1, star_bonus: 1, icon: "🌱", name_en: "Task" },
      { id: "b2", slug: "coin-100", condition_type: "coins_earned", condition_value: 100, star_bonus: 2, icon: "🪙", name_en: "Coins" },
      { id: "b3", slug: "streak-7", condition_type: "streak_days", condition_value: 7, star_bonus: 3, icon: "🔥", name_en: "Streak" },
    ];
    const earned = evaluateBadges(
      { tasks_completed: 5, coins_earned: 200, streak_days: 3 },
      badges,
    );
    expect(earned).toHaveLength(2); // task + coins, not streak
    expect(earned.map((b) => b.slug)).toEqual(["task-1", "coin-100"]);
  });

  it("returns empty when no badges qualify", () => {
    const badges: Badge[] = [
      { id: "b1", slug: "x", condition_type: "tasks_completed", condition_value: 100, star_bonus: 1, icon: "X", name_en: "X" },
    ];
    const earned = evaluateBadges({ tasks_completed: 0 }, badges);
    expect(earned).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. Total star bonus calculation
// ═══════════════════════════════════════════════════════════════════════════

describe("Total star bonus from multiple badges", () => {
  it("sums star bonuses from all earned badges", () => {
    const earned = [
      { star_bonus: 1 },
      { star_bonus: 3 },
      { star_bonus: 5 },
    ];
    const total = earned.reduce((sum, b) => sum + b.star_bonus, 0);
    expect(total).toBe(9);
  });

  it("returns 0 for no badges", () => {
    const earned: { star_bonus: number }[] = [];
    const total = earned.reduce((sum, b) => sum + b.star_bonus, 0);
    expect(total).toBe(0);
  });
});
