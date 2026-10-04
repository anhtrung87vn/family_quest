import { describe, it, expect } from "vitest";
import { SKILL_LADDERS, ALL_LADDER_KEYS, type LadderMeta } from "@/lib/ladders";

describe("SKILL_LADDERS", () => {
  it("contains 14 ladders", () => {
    expect(Object.keys(SKILL_LADDERS)).toHaveLength(14);
  });

  it("ALL_LADDER_KEYS matches SKILL_LADDERS keys", () => {
    expect(ALL_LADDER_KEYS).toEqual(Object.keys(SKILL_LADDERS));
  });

  it("every ladder has required fields", () => {
    for (const [key, meta] of Object.entries(SKILL_LADDERS)) {
      expect(meta.label_en, `${key}.label_en`).toBeTruthy();
      expect(meta.label_vi, `${key}.label_vi`).toBeTruthy();
      expect(meta.maxLevel, `${key}.maxLevel`).toBeGreaterThanOrEqual(1);
      expect(meta.icon, `${key}.icon`).toBeTruthy();
    }
  });

  it("includes key ladders from curriculum", () => {
    expect(SKILL_LADDERS).toHaveProperty("COOKING");
    expect(SKILL_LADDERS).toHaveProperty("MONEY");
    expect(SKILL_LADDERS).toHaveProperty("DIGITAL_SAFETY");
    expect(SKILL_LADDERS).toHaveProperty("AI_LITERACY");
    expect(SKILL_LADDERS).toHaveProperty("CAREER_EXPLORATION");
  });

  it("MONEY has the highest max level (12)", () => {
    const maxLevels = Object.values(SKILL_LADDERS).map((m) => m.maxLevel);
    expect(SKILL_LADDERS.MONEY.maxLevel).toBe(Math.max(...maxLevels));
  });
});
