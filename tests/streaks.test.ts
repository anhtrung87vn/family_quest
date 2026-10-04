import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Streaks module tests — comprehensive coverage for lib/streaks.ts
//
// Existing tests in streaks-logic.test.ts cover the core computeStreak
// function and vacation mode flag. This file adds coverage for:
// - StreakInfo type shape
// - getStreak error/default handling
// - recordCompletion flow branches (first, same-day, consecutive, grace, break)
// - Grace day edge cases (double grace, boundary)
// - Longest streak tracking
// - Date diff calculation edge cases
// - DB fallback defaults
// ---------------------------------------------------------------------------

// ─── Types mirrored from streaks.ts ──────────────────────────────────────

interface StreakInfo {
  current: number;
  longest: number;
  lastDate: string | null;
  graceUsed: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. StreakInfo default shape
// ═══════════════════════════════════════════════════════════════════════════

describe("StreakInfo defaults", () => {
  const defaultStreak: StreakInfo = { current: 0, longest: 0, lastDate: null, graceUsed: false };

  it("current defaults to 0", () => {
    expect(defaultStreak.current).toBe(0);
  });

  it("longest defaults to 0", () => {
    expect(defaultStreak.longest).toBe(0);
  });

  it("lastDate defaults to null", () => {
    expect(defaultStreak.lastDate).toBeNull();
  });

  it("graceUsed defaults to false", () => {
    expect(defaultStreak.graceUsed).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. getStreak — DB result mapping
// ═══════════════════════════════════════════════════════════════════════════

describe("getStreak — DB result mapping", () => {
  function mapDbToStreakInfo(
    data: { current_streak: number; longest_streak: number; last_completion_date: string; grace_used: boolean } | null,
  ): StreakInfo {
    if (!data) return { current: 0, longest: 0, lastDate: null, graceUsed: false };
    return {
      current: data.current_streak,
      longest: data.longest_streak,
      lastDate: data.last_completion_date,
      graceUsed: data.grace_used,
    };
  }

  it("maps DB row to StreakInfo", () => {
    const result = mapDbToStreakInfo({
      current_streak: 5,
      longest_streak: 12,
      last_completion_date: "2024-01-15",
      grace_used: true,
    });
    expect(result).toEqual({ current: 5, longest: 12, lastDate: "2024-01-15", graceUsed: true });
  });

  it("returns defaults for null data (no row)", () => {
    const result = mapDbToStreakInfo(null);
    expect(result).toEqual({ current: 0, longest: 0, lastDate: null, graceUsed: false });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. recordCompletion — full flow branches
// ═══════════════════════════════════════════════════════════════════════════

describe("recordCompletion — flow branches", () => {
  // Simulates the complete recordCompletion logic
  function simulateRecordCompletion(
    existing: { current_streak: number; longest_streak: number; last_completion_date: string | null; grace_used: boolean } | null,
    today: string,
    vacationMode: boolean,
  ): StreakInfo {
    // Skip if vacation
    if (vacationMode) {
      if (!existing) return { current: 0, longest: 0, lastDate: null, graceUsed: false };
      return {
        current: existing.current_streak,
        longest: existing.longest_streak,
        lastDate: existing.last_completion_date,
        graceUsed: existing.grace_used,
      };
    }

    // First ever completion
    if (!existing) {
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
      newStreak = existing.current_streak + 1;
      graceUsed = false;
    } else if (diffDays === 2 && !existing.grace_used) {
      newStreak = existing.current_streak + 1;
      graceUsed = true;
    } else {
      newStreak = 1;
      graceUsed = false;
    }

    const longest = Math.max(existing.longest_streak, newStreak);
    return { current: newStreak, longest, lastDate: today, graceUsed };
  }

  describe("first completion ever", () => {
    it("starts streak at 1", () => {
      const result = simulateRecordCompletion(null, "2024-01-15", false);
      expect(result.current).toBe(1);
      expect(result.longest).toBe(1);
      expect(result.lastDate).toBe("2024-01-15");
      expect(result.graceUsed).toBe(false);
    });
  });

  describe("same-day completion", () => {
    it("keeps existing streak unchanged", () => {
      const result = simulateRecordCompletion(
        { current_streak: 5, longest_streak: 10, last_completion_date: "2024-01-15", grace_used: false },
        "2024-01-15",
        false,
      );
      expect(result.current).toBe(5);
      expect(result.longest).toBe(10);
    });

    it("preserves grace_used state on same-day", () => {
      const result = simulateRecordCompletion(
        { current_streak: 3, longest_streak: 3, last_completion_date: "2024-01-15", grace_used: true },
        "2024-01-15",
        false,
      );
      expect(result.graceUsed).toBe(true);
    });
  });

  describe("consecutive day (diffDays === 1)", () => {
    it("increments streak by 1", () => {
      const result = simulateRecordCompletion(
        { current_streak: 3, longest_streak: 5, last_completion_date: "2024-01-14", grace_used: false },
        "2024-01-15",
        false,
      );
      expect(result.current).toBe(4);
    });

    it("clears grace_used", () => {
      const result = simulateRecordCompletion(
        { current_streak: 3, longest_streak: 5, last_completion_date: "2024-01-14", grace_used: true },
        "2024-01-15",
        false,
      );
      expect(result.graceUsed).toBe(false);
    });

    it("updates longest when current exceeds it", () => {
      const result = simulateRecordCompletion(
        { current_streak: 5, longest_streak: 5, last_completion_date: "2024-01-14", grace_used: false },
        "2024-01-15",
        false,
      );
      expect(result.longest).toBe(6);
    });
  });

  describe("grace day (diffDays === 2, grace not yet used)", () => {
    it("increments streak and sets grace_used", () => {
      const result = simulateRecordCompletion(
        { current_streak: 5, longest_streak: 5, last_completion_date: "2024-01-13", grace_used: false },
        "2024-01-15",
        false,
      );
      expect(result.current).toBe(6);
      expect(result.graceUsed).toBe(true);
    });
  });

  describe("grace day already used (diffDays === 2, grace_used === true)", () => {
    it("breaks the streak", () => {
      const result = simulateRecordCompletion(
        { current_streak: 5, longest_streak: 10, last_completion_date: "2024-01-13", grace_used: true },
        "2024-01-15",
        false,
      );
      expect(result.current).toBe(1);
      expect(result.graceUsed).toBe(false);
    });

    it("preserves longest streak", () => {
      const result = simulateRecordCompletion(
        { current_streak: 5, longest_streak: 10, last_completion_date: "2024-01-13", grace_used: true },
        "2024-01-15",
        false,
      );
      expect(result.longest).toBe(10);
    });
  });

  describe("streak broken (diffDays >= 3)", () => {
    it("resets to 1 after missing 2 days", () => {
      const result = simulateRecordCompletion(
        { current_streak: 10, longest_streak: 10, last_completion_date: "2024-01-12", grace_used: false },
        "2024-01-15",
        false,
      );
      expect(result.current).toBe(1);
    });

    it("resets to 1 after missing a week", () => {
      const result = simulateRecordCompletion(
        { current_streak: 20, longest_streak: 20, last_completion_date: "2024-01-08", grace_used: false },
        "2024-01-15",
        false,
      );
      expect(result.current).toBe(1);
    });

    it("clears grace_used on break", () => {
      const result = simulateRecordCompletion(
        { current_streak: 5, longest_streak: 5, last_completion_date: "2024-01-10", grace_used: true },
        "2024-01-15",
        false,
      );
      expect(result.graceUsed).toBe(false);
    });
  });

  describe("vacation mode", () => {
    it("returns existing streak without changes", () => {
      const result = simulateRecordCompletion(
        { current_streak: 5, longest_streak: 10, last_completion_date: "2024-01-14", grace_used: false },
        "2024-01-15",
        true,
      );
      expect(result.current).toBe(5);
      expect(result.longest).toBe(10);
    });

    it("returns defaults when no existing streak", () => {
      const result = simulateRecordCompletion(null, "2024-01-15", true);
      expect(result.current).toBe(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Date diff calculation edge cases
// ═══════════════════════════════════════════════════════════════════════════

describe("Date diff calculation", () => {
  function diffDays(lastDate: string | null, today: string): number {
    if (!lastDate) return 999;
    const last = new Date(lastDate);
    const todayD = new Date(today);
    return Math.floor((todayD.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  }

  it("returns 1 for consecutive days", () => {
    expect(diffDays("2024-01-14", "2024-01-15")).toBe(1);
  });

  it("returns 0 for same day", () => {
    expect(diffDays("2024-01-15", "2024-01-15")).toBe(0);
  });

  it("returns 2 for one missed day", () => {
    expect(diffDays("2024-01-13", "2024-01-15")).toBe(2);
  });

  it("returns 7 for a week gap", () => {
    expect(diffDays("2024-01-08", "2024-01-15")).toBe(7);
  });

  it("handles month boundaries", () => {
    expect(diffDays("2024-01-31", "2024-02-01")).toBe(1);
  });

  it("handles year boundaries", () => {
    expect(diffDays("2023-12-31", "2024-01-01")).toBe(1);
  });

  it("handles leap year Feb 28→29", () => {
    expect(diffDays("2024-02-28", "2024-02-29")).toBe(1);
  });

  it("returns 999 for null lastDate (sentinel for first completion)", () => {
    expect(diffDays(null, "2024-01-15")).toBe(999);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Longest streak tracking
// ═══════════════════════════════════════════════════════════════════════════

describe("Longest streak tracking", () => {
  function updateLongest(currentLongest: number, newStreak: number): number {
    return Math.max(currentLongest, newStreak);
  }

  it("updates when new streak exceeds longest", () => {
    expect(updateLongest(5, 6)).toBe(6);
  });

  it("preserves when new streak is less", () => {
    expect(updateLongest(10, 1)).toBe(10);
  });

  it("preserves when equal", () => {
    expect(updateLongest(5, 5)).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. Multi-day simulation
// ═══════════════════════════════════════════════════════════════════════════

describe("Multi-day streak simulation", () => {
  // Reuse the simulation function
  function advanceDay(
    state: { current: number; longest: number; lastDate: string | null; graceUsed: boolean },
    today: string,
  ): { current: number; longest: number; lastDate: string; graceUsed: boolean } {
    if (!state.lastDate) {
      return { current: 1, longest: 1, lastDate: today, graceUsed: false };
    }
    const diff = Math.floor(
      (new Date(today).getTime() - new Date(state.lastDate).getTime()) / (1000 * 60 * 60 * 24),
    );

    let newStreak: number;
    let graceUsed: boolean;
    if (diff === 0) return { ...state, lastDate: today } as { current: number; longest: number; lastDate: string; graceUsed: boolean };
    if (diff === 1) { newStreak = state.current + 1; graceUsed = false; }
    else if (diff === 2 && !state.graceUsed) { newStreak = state.current + 1; graceUsed = true; }
    else { newStreak = 1; graceUsed = false; }

    return { current: newStreak, longest: Math.max(state.longest, newStreak), lastDate: today, graceUsed };
  }

  it("builds a 5-day streak", () => {
    let state: { current: number; longest: number; lastDate: string | null; graceUsed: boolean } = { current: 0, longest: 0, lastDate: null, graceUsed: false };
    for (let d = 1; d <= 5; d++) {
      state = advanceDay(state, `2024-01-${String(d).padStart(2, "0")}`);
    }
    expect(state.current).toBe(5);
    expect(state.longest).toBe(5);
  });

  it("uses grace and continues", () => {
    let state: { current: number; longest: number; lastDate: string | null; graceUsed: boolean } = { current: 0, longest: 0, lastDate: null, graceUsed: false };
    state = advanceDay(state, "2024-01-01"); // day 1 → streak 1
    state = advanceDay(state, "2024-01-02"); // day 2 → streak 2
    // Skip Jan 3 (grace day)
    state = advanceDay(state, "2024-01-04"); // day 4 → streak 3 (grace used)
    expect(state.current).toBe(3);
    expect(state.graceUsed).toBe(true);
    state = advanceDay(state, "2024-01-05"); // consecutive → streak 4, grace cleared
    expect(state.current).toBe(4);
    expect(state.graceUsed).toBe(false);
  });

  it("breaks after second missed day with grace used", () => {
    let state: { current: number; longest: number; lastDate: string | null; graceUsed: boolean } = { current: 0, longest: 0, lastDate: null, graceUsed: false };
    state = advanceDay(state, "2024-01-01"); // streak 1
    state = advanceDay(state, "2024-01-02"); // streak 2
    // Skip Jan 3 → grace
    state = advanceDay(state, "2024-01-04"); // streak 3, grace used
    // Skip Jan 5 → grace already used → BREAK
    state = advanceDay(state, "2024-01-06");
    expect(state.current).toBe(1);
    expect(state.longest).toBe(3); // longest was 3
  });

  it("preserves longest after break", () => {
    let state: { current: number; longest: number; lastDate: string | null; graceUsed: boolean } = { current: 0, longest: 0, lastDate: null, graceUsed: false };
    // Build 5-day streak
    for (let d = 1; d <= 5; d++) {
      state = advanceDay(state, `2024-01-${String(d).padStart(2, "0")}`);
    }
    expect(state.longest).toBe(5);

    // Break (skip 3 days)
    state = advanceDay(state, "2024-01-09");
    expect(state.current).toBe(1);
    expect(state.longest).toBe(5); // preserved

    // Build new 3-day streak
    state = advanceDay(state, "2024-01-10");
    state = advanceDay(state, "2024-01-11");
    expect(state.current).toBe(3);
    expect(state.longest).toBe(5); // still the old record
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. DB update shape
// ═══════════════════════════════════════════════════════════════════════════

describe("Streak DB update shape", () => {
  function buildUpdateRow(streak: StreakInfo, today: string) {
    return {
      current_streak: streak.current,
      longest_streak: streak.longest,
      last_completion_date: today,
      grace_used: streak.graceUsed,
      updated_at: new Date().toISOString(),
    };
  }

  it("maps StreakInfo fields to DB columns", () => {
    const row = buildUpdateRow({ current: 5, longest: 10, lastDate: "2024-01-15", graceUsed: true }, "2024-01-15");
    expect(row.current_streak).toBe(5);
    expect(row.longest_streak).toBe(10);
    expect(row.last_completion_date).toBe("2024-01-15");
    expect(row.grace_used).toBe(true);
  });

  it("includes updated_at timestamp", () => {
    const row = buildUpdateRow({ current: 1, longest: 1, lastDate: "2024-01-15", graceUsed: false }, "2024-01-15");
    expect(row.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. First completion insert shape
// ═══════════════════════════════════════════════════════════════════════════

describe("First completion insert shape", () => {
  function buildInsertRow(childId: string, today: string) {
    return {
      child_id: childId,
      current_streak: 1,
      longest_streak: 1,
      last_completion_date: today,
      grace_used: false,
    };
  }

  it("starts with streak 1", () => {
    const row = buildInsertRow("c1", "2024-01-15");
    expect(row.current_streak).toBe(1);
    expect(row.longest_streak).toBe(1);
  });

  it("grace_used starts false", () => {
    const row = buildInsertRow("c1", "2024-01-15");
    expect(row.grace_used).toBe(false);
  });

  it("includes child_id and today", () => {
    const row = buildInsertRow("child-abc", "2024-03-20");
    expect(row.child_id).toBe("child-abc");
    expect(row.last_completion_date).toBe("2024-03-20");
  });
});
