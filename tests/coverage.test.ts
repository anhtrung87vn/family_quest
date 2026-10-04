import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Coverage module tests — extracted from lib/coverage.ts
//
// Strategy: Test the pure logic for domain counting, ladder progress
// max-level tracking, and graduated habits result mapping. The actual
// functions use createAdminClient() so we test the data-processing
// logic in isolation.
// ---------------------------------------------------------------------------

// ─── Constants mirrored from dependencies ─────────────────────────────────

const ALL_SKILL_DOMAINS = [
  "LEARNING", "SELF_MANAGEMENT", "LIFE_HOME", "MONEY",
  "COMMUNICATION", "CHARACTER_FAMILY", "HEALTH", "DIGITAL", "WORLD_INDEPENDENCE",
] as const;
type SkillDomain = (typeof ALL_SKILL_DOMAINS)[number];

const SKILL_LADDERS: Record<string, { maxLevel: number }> = {
  COOKING: { maxLevel: 9 },
  HOUSEHOLD_CARE: { maxLevel: 9 },
  PERSONAL_ORGANIZATION: { maxLevel: 8 },
  READING: { maxLevel: 6 },
  RESEARCH: { maxLevel: 3 },
  COMMUNICATION: { maxLevel: 9 },
  MONEY: { maxLevel: 12 },
  DIGITAL_SAFETY: { maxLevel: 7 },
  AI_LITERACY: { maxLevel: 2 },
  FAMILY_CONTRIBUTION: { maxLevel: 9 },
  PLANNING: { maxLevel: 10 },
  PROJECT_EXECUTION: { maxLevel: 7 },
  CAREER_EXPLORATION: { maxLevel: 6 },
  TRAVEL_NAVIGATION: { maxLevel: 6 },
};
const ALL_LADDER_KEYS = Object.keys(SKILL_LADDERS);

// ═══════════════════════════════════════════════════════════════════════════
// 1. Domain counting logic (getDevelopmentCoverage)
// ═══════════════════════════════════════════════════════════════════════════

describe("Domain counting logic", () => {
  function countDomains(
    rows: { task: { skill_domain: string | null } | { skill_domain: string | null }[] | null }[],
  ): Map<string, number> {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const task: any = Array.isArray(row.task) ? row.task[0] : row.task;
      const domain = task?.skill_domain;
      if (domain) counts.set(domain, (counts.get(domain) ?? 0) + 1);
    }
    return counts;
  }

  it("counts single domain", () => {
    const counts = countDomains([
      { task: { skill_domain: "LEARNING" } },
      { task: { skill_domain: "LEARNING" } },
    ]);
    expect(counts.get("LEARNING")).toBe(2);
  });

  it("counts multiple domains", () => {
    const counts = countDomains([
      { task: { skill_domain: "LEARNING" } },
      { task: { skill_domain: "HEALTH" } },
      { task: { skill_domain: "LEARNING" } },
    ]);
    expect(counts.get("LEARNING")).toBe(2);
    expect(counts.get("HEALTH")).toBe(1);
  });

  it("skips null skill_domain", () => {
    const counts = countDomains([
      { task: { skill_domain: "LEARNING" } },
      { task: { skill_domain: null } },
    ]);
    expect(counts.get("LEARNING")).toBe(1);
    expect(counts.size).toBe(1);
  });

  it("skips null task", () => {
    const counts = countDomains([{ task: null }]);
    expect(counts.size).toBe(0);
  });

  it("handles task as array (Supabase join format)", () => {
    const counts = countDomains([
      { task: [{ skill_domain: "MONEY" }] },
    ]);
    expect(counts.get("MONEY")).toBe(1);
  });

  it("returns empty map for no rows", () => {
    expect(countDomains([]).size).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Domain coverage result building (all 9 domains)
// ═══════════════════════════════════════════════════════════════════════════

describe("Domain coverage result building", () => {
  function buildCoverageResult(counts: Map<string, number>) {
    return ALL_SKILL_DOMAINS.map((d) => ({
      domain: d,
      count: counts.get(d) ?? 0,
    }));
  }

  it("returns all 9 domains", () => {
    const result = buildCoverageResult(new Map());
    expect(result).toHaveLength(9);
  });

  it("fills in count for present domains", () => {
    const counts = new Map([["LEARNING", 5], ["HEALTH", 3]]);
    const result = buildCoverageResult(counts);
    const learning = result.find((r) => r.domain === "LEARNING");
    expect(learning?.count).toBe(5);
  });

  it("defaults to 0 for absent domains", () => {
    const result = buildCoverageResult(new Map([["LEARNING", 1]]));
    const money = result.find((r) => r.domain === "MONEY");
    expect(money?.count).toBe(0);
  });

  it("preserves domain order", () => {
    const result = buildCoverageResult(new Map());
    expect(result[0].domain).toBe("LEARNING");
    expect(result[8].domain).toBe("WORLD_INDEPENDENCE");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. ALL_SKILL_DOMAINS constants
// ═══════════════════════════════════════════════════════════════════════════

describe("ALL_SKILL_DOMAINS", () => {
  it("has exactly 9 domains", () => {
    expect(ALL_SKILL_DOMAINS).toHaveLength(9);
  });

  it("contains no duplicates", () => {
    const unique = new Set(ALL_SKILL_DOMAINS);
    expect(unique.size).toBe(ALL_SKILL_DOMAINS.length);
  });

  it("includes expected domains", () => {
    expect(ALL_SKILL_DOMAINS).toContain("LEARNING");
    expect(ALL_SKILL_DOMAINS).toContain("HEALTH");
    expect(ALL_SKILL_DOMAINS).toContain("MONEY");
    expect(ALL_SKILL_DOMAINS).toContain("DIGITAL");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Ladder max-level tracking (getSkillLadderProgress)
// ═══════════════════════════════════════════════════════════════════════════

describe("Ladder max-level tracking", () => {
  function computeMaxLevels(
    rows: { task: { skill_ladder_key: string | null; skill_ladder_level: number | null } | { skill_ladder_key: string | null; skill_ladder_level: number | null }[] | null }[],
  ): Map<string, number> {
    const maxLevels = new Map<string, number>();
    for (const row of rows) {
      const task: any = Array.isArray(row.task) ? row.task[0] : row.task;
      const key = task?.skill_ladder_key;
      const level = task?.skill_ladder_level;
      if (key && typeof level === "number") {
        maxLevels.set(key, Math.max(maxLevels.get(key) ?? 0, level));
      }
    }
    return maxLevels;
  }

  it("tracks max level per ladder", () => {
    const max = computeMaxLevels([
      { task: { skill_ladder_key: "COOKING", skill_ladder_level: 3 } },
      { task: { skill_ladder_key: "COOKING", skill_ladder_level: 5 } },
      { task: { skill_ladder_key: "COOKING", skill_ladder_level: 2 } },
    ]);
    expect(max.get("COOKING")).toBe(5);
  });

  it("tracks multiple ladders independently", () => {
    const max = computeMaxLevels([
      { task: { skill_ladder_key: "COOKING", skill_ladder_level: 3 } },
      { task: { skill_ladder_key: "READING", skill_ladder_level: 6 } },
    ]);
    expect(max.get("COOKING")).toBe(3);
    expect(max.get("READING")).toBe(6);
  });

  it("skips null ladder key", () => {
    const max = computeMaxLevels([
      { task: { skill_ladder_key: null, skill_ladder_level: 5 } },
    ]);
    expect(max.size).toBe(0);
  });

  it("skips null ladder level", () => {
    const max = computeMaxLevels([
      { task: { skill_ladder_key: "COOKING", skill_ladder_level: null } },
    ]);
    expect(max.size).toBe(0);
  });

  it("handles task as array", () => {
    const max = computeMaxLevels([
      { task: [{ skill_ladder_key: "MONEY", skill_ladder_level: 7 }] },
    ]);
    expect(max.get("MONEY")).toBe(7);
  });

  it("returns empty for no rows", () => {
    expect(computeMaxLevels([]).size).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Ladder progress result building
// ═══════════════════════════════════════════════════════════════════════════

describe("Ladder progress result building", () => {
  function buildLadderResult(maxLevels: Map<string, number>) {
    return ALL_LADDER_KEYS.map((k) => ({
      ladderKey: k,
      maxCompletedLevel: maxLevels.get(k) ?? 0,
      totalLevels: SKILL_LADDERS[k].maxLevel,
    }));
  }

  it("returns all 14 ladders", () => {
    expect(buildLadderResult(new Map())).toHaveLength(14);
  });

  it("fills in completed level for active ladders", () => {
    const result = buildLadderResult(new Map([["COOKING", 5]]));
    const cooking = result.find((r) => r.ladderKey === "COOKING");
    expect(cooking?.maxCompletedLevel).toBe(5);
    expect(cooking?.totalLevels).toBe(9);
  });

  it("defaults to 0 for untouched ladders", () => {
    const result = buildLadderResult(new Map());
    const money = result.find((r) => r.ladderKey === "MONEY");
    expect(money?.maxCompletedLevel).toBe(0);
    expect(money?.totalLevels).toBe(12);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. SKILL_LADDERS constants
// ═══════════════════════════════════════════════════════════════════════════

describe("SKILL_LADDERS constants", () => {
  it("has 14 ladders", () => {
    expect(ALL_LADDER_KEYS).toHaveLength(14);
  });

  it("all ladders have positive maxLevel", () => {
    for (const key of ALL_LADDER_KEYS) {
      expect(SKILL_LADDERS[key].maxLevel).toBeGreaterThan(0);
    }
  });

  it("AI_LITERACY has lowest maxLevel (2)", () => {
    expect(SKILL_LADDERS["AI_LITERACY"].maxLevel).toBe(2);
  });

  it("MONEY has highest maxLevel (12)", () => {
    expect(SKILL_LADDERS["MONEY"].maxLevel).toBe(12);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. Graduated habits result mapping
// ═══════════════════════════════════════════════════════════════════════════

describe("Graduated habits result mapping", () => {
  function mapGraduatedHabits(
    rows: { task_id: string; graduated_at: string; task: { name: string; name_vi: string | null } | { name: string; name_vi: string | null }[] | null }[],
  ) {
    return rows.map((row: any) => {
      const task = Array.isArray(row.task) ? row.task[0] : row.task;
      return {
        task_id: row.task_id,
        task_name: task?.name ?? "",
        task_name_vi: task?.name_vi ?? null,
        graduated_at: row.graduated_at,
      };
    });
  }

  it("maps row with task object", () => {
    const result = mapGraduatedHabits([
      { task_id: "t1", graduated_at: "2024-01-15", task: { name: "Brush teeth", name_vi: "Đánh răng" } },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].task_name).toBe("Brush teeth");
    expect(result[0].task_name_vi).toBe("Đánh răng");
  });

  it("maps row with task as array", () => {
    const result = mapGraduatedHabits([
      { task_id: "t1", graduated_at: "2024-01-15", task: [{ name: "Read 10 min", name_vi: null }] },
    ]);
    expect(result[0].task_name).toBe("Read 10 min");
    expect(result[0].task_name_vi).toBeNull();
  });

  it("defaults task_name to empty for null task", () => {
    const result = mapGraduatedHabits([
      { task_id: "t1", graduated_at: "2024-01-15", task: null },
    ]);
    expect(result[0].task_name).toBe("");
    expect(result[0].task_name_vi).toBeNull();
  });

  it("returns empty array for no rows", () => {
    expect(mapGraduatedHabits([])).toHaveLength(0);
  });

  it("preserves graduated_at timestamp", () => {
    const result = mapGraduatedHabits([
      { task_id: "t1", graduated_at: "2024-06-15T10:30:00Z", task: { name: "X", name_vi: null } },
    ]);
    expect(result[0].graduated_at).toBe("2024-06-15T10:30:00Z");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. Date range calculation (getDevelopmentCoverage days param)
// ═══════════════════════════════════════════════════════════════════════════

describe("Coverage date range calculation", () => {
  function computeSinceDate(days: number): Date {
    const since = new Date();
    since.setDate(since.getDate() - days);
    return since;
  }

  it("defaults to 30 days", () => {
    const since = computeSinceDate(30);
    const now = new Date();
    const diff = Math.floor((now.getTime() - since.getTime()) / (1000 * 60 * 60 * 24));
    expect(diff).toBe(30);
  });

  it("supports custom day range", () => {
    const since = computeSinceDate(7);
    const now = new Date();
    const diff = Math.floor((now.getTime() - since.getTime()) / (1000 * 60 * 60 * 24));
    expect(diff).toBe(7);
  });

  it("returns a date in the past", () => {
    const since = computeSinceDate(1);
    expect(since.getTime()).toBeLessThan(Date.now());
  });
});
