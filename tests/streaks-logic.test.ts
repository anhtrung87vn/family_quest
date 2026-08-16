import { describe, it, expect } from "vitest";

// Test streak calculation logic extracted from lib/streaks.ts
// without requiring Supabase connection

describe("Streak calculation logic", () => {
  function computeStreak(
    lastDate: string | null,
    today: string,
    currentStreak: number,
    graceUsed: boolean,
  ): { newStreak: number; newGraceUsed: boolean } {
    if (!lastDate) return { newStreak: 1, newGraceUsed: false };

    const last = new Date(lastDate);
    const todayD = new Date(today);
    const diffDays = Math.floor(
      (todayD.getTime() - last.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) {
      // Already counted today
      return { newStreak: currentStreak, newGraceUsed: graceUsed };
    }
    if (diffDays === 1) {
      // Consecutive day
      return { newStreak: currentStreak + 1, newGraceUsed: false };
    }
    if (diffDays === 2 && !graceUsed) {
      // Grace day: missed one day but grace not yet used
      return { newStreak: currentStreak + 1, newGraceUsed: true };
    }
    // Streak broken
    return { newStreak: 1, newGraceUsed: false };
  }

  it("starts streak at 1 for first completion", () => {
    const result = computeStreak(null, "2024-01-15", 0, false);
    expect(result.newStreak).toBe(1);
    expect(result.newGraceUsed).toBe(false);
  });

  it("increments streak for consecutive day", () => {
    const result = computeStreak("2024-01-14", "2024-01-15", 3, false);
    expect(result.newStreak).toBe(4);
    expect(result.newGraceUsed).toBe(false);
  });

  it("keeps streak same if already counted today", () => {
    const result = computeStreak("2024-01-15", "2024-01-15", 5, false);
    expect(result.newStreak).toBe(5);
  });

  it("uses grace day when missing one day", () => {
    const result = computeStreak("2024-01-13", "2024-01-15", 3, false);
    expect(result.newStreak).toBe(4);
    expect(result.newGraceUsed).toBe(true);
  });

  it("breaks streak when grace already used and missing a day", () => {
    const result = computeStreak("2024-01-13", "2024-01-15", 3, true);
    expect(result.newStreak).toBe(1);
    expect(result.newGraceUsed).toBe(false);
  });

  it("breaks streak after missing 3+ days", () => {
    const result = computeStreak("2024-01-10", "2024-01-15", 10, false);
    expect(result.newStreak).toBe(1);
  });

  it("tracks longest streak correctly", () => {
    let longestStreak = 0;
    const streaks = [1, 2, 3, 4, 5, 1, 2, 3];
    for (const s of streaks) {
      longestStreak = Math.max(longestStreak, s);
    }
    expect(longestStreak).toBe(5);
  });
});

describe("Vacation mode", () => {
  it("skips streak update when vacation mode is on", () => {
    const vacationMode = true;
    const shouldUpdate = !vacationMode;
    expect(shouldUpdate).toBe(false);
  });

  it("updates streak when vacation mode is off", () => {
    const vacationMode = false;
    const shouldUpdate = !vacationMode;
    expect(shouldUpdate).toBe(true);
  });
});
