import { describe, it, expect } from "vitest";
import {
  domainStyle,
  independenceStyle,
  behaviorStyle,
  ALL_SKILL_DOMAINS,
  type SkillDomain,
} from "@/lib/category-style";

describe("domainStyle", () => {
  it("returns correct style for each domain", () => {
    for (const domain of ALL_SKILL_DOMAINS) {
      const s = domainStyle(domain);
      expect(s.icon, `${domain} icon`).toBeTruthy();
      expect(s.color, `${domain} color`).toMatch(/text-/);
      expect(s.bg, `${domain} bg`).toMatch(/bg-/);
      expect(s.border, `${domain} border`).toMatch(/border-/);
      expect(s.label_en, `${domain} label_en`).toBeTruthy();
      expect(s.label_vi, `${domain} label_vi`).toBeTruthy();
    }
  });

  it("falls back to LEARNING for null/undefined/unknown", () => {
    const fallback = domainStyle("LEARNING");
    expect(domainStyle(null)).toEqual(fallback);
    expect(domainStyle(undefined)).toEqual(fallback);
    expect(domainStyle("INVALID_DOMAIN")).toEqual(fallback);
  });

  it("ALL_SKILL_DOMAINS contains 9 domains", () => {
    expect(ALL_SKILL_DOMAINS).toHaveLength(9);
  });
});

describe("independenceStyle", () => {
  it("returns correct style for GUIDED", () => {
    const s = independenceStyle("GUIDED");
    expect(s.icon).toBe("👋");
    expect(s.label_en).toBe("Guided");
  });

  it("returns correct style for SUPPORTED", () => {
    const s = independenceStyle("SUPPORTED");
    expect(s.icon).toBe("🌿");
    expect(s.label_en).toBe("Supported");
  });

  it("returns correct style for INDEPENDENT", () => {
    const s = independenceStyle("INDEPENDENT");
    expect(s.icon).toBe("🦅");
    expect(s.label_en).toBe("Independent");
  });

  it("falls back to GUIDED for null/unknown", () => {
    const fallback = independenceStyle("GUIDED");
    expect(independenceStyle(null)).toEqual(fallback);
    expect(independenceStyle(undefined)).toEqual(fallback);
    expect(independenceStyle("UNKNOWN")).toEqual(fallback);
  });
});

describe("behaviorStyle", () => {
  const behaviors = ["responsibility", "habit_building", "challenge", "character", "family"] as const;

  it("returns correct style for all behavior types", () => {
    for (const bt of behaviors) {
      const s = behaviorStyle(bt);
      expect(s.icon, `${bt} icon`).toBeTruthy();
      expect(s.color, `${bt} color`).toMatch(/text-/);
      expect(s.bg, `${bt} bg`).toMatch(/bg-/);
      expect(s.border, `${bt} border`).toMatch(/border-/);
      expect(s.label_en, `${bt} label_en`).toBeTruthy();
      expect(s.label_vi, `${bt} label_vi`).toBeTruthy();
    }
  });

  it("responsibility uses emerald", () => {
    expect(behaviorStyle("responsibility").bg).toContain("emerald");
  });

  it("habit_building uses amber", () => {
    expect(behaviorStyle("habit_building").bg).toContain("amber");
  });

  it("falls back to challenge for null/unknown", () => {
    const fallback = behaviorStyle("challenge");
    expect(behaviorStyle(null)).toEqual(fallback);
    expect(behaviorStyle(undefined)).toEqual(fallback);
    expect(behaviorStyle("UNKNOWN_TYPE")).toEqual(fallback);
  });
});
