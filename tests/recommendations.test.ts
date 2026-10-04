import { describe, it, expect } from "vitest";
import { rankTemplates, poolSizeForAge, type TemplateRow, type RecentCompletion } from "@/lib/recommendations";

function makeTpl(overrides: Partial<TemplateRow> = {}): TemplateRow {
  return {
    id: overrides.id ?? "tpl-1",
    name: overrides.name ?? "Test Task",
    skill_domain: "LEARNING",
    behavior_type: "challenge",
    recommended_age: 10,
    min_age: 7,
    max_age: 14,
    independence_level: "SUPPORTED",
    difficulty: 3,
    availability_type: "choice_pool",
    coin_reward: 5,
    star_reward: 1,
    ...overrides,
  };
}

describe("poolSizeForAge", () => {
  it("returns 4 for ages <=8", () => {
    expect(poolSizeForAge(7)).toBe(4);
    expect(poolSizeForAge(8)).toBe(4);
  });

  it("returns 5 for ages 9-10", () => {
    expect(poolSizeForAge(9)).toBe(5);
    expect(poolSizeForAge(10)).toBe(5);
  });

  it("returns 6 for ages 11-12", () => {
    expect(poolSizeForAge(11)).toBe(6);
    expect(poolSizeForAge(12)).toBe(6);
  });

  it("returns 7 for ages 13-14", () => {
    expect(poolSizeForAge(13)).toBe(7);
    expect(poolSizeForAge(14)).toBe(7);
  });

  it("returns 8 for ages 15+", () => {
    expect(poolSizeForAge(15)).toBe(8);
    expect(poolSizeForAge(18)).toBe(8);
  });
});

describe("rankTemplates", () => {
  const baseOptions = {
    childAge: 10,
    recentCompletions: [] as RecentCompletion[],
    activeTaskNames: new Set<string>(),
  };

  it("returns empty array for empty input", () => {
    expect(rankTemplates([], baseOptions)).toEqual([]);
  });

  it("filters out templates that are already active tasks", () => {
    const tpl = makeTpl({ name: "Active Task" });
    const result = rankTemplates([tpl], {
      ...baseOptions,
      activeTaskNames: new Set(["Active Task"]),
    });
    expect(result).toHaveLength(0);
  });

  it("filters out templates outside the child's age range", () => {
    const tpl = makeTpl({ min_age: 15, max_age: 18, recommended_age: 16 });
    const result = rankTemplates([tpl], { ...baseOptions, childAge: 10 });
    expect(result).toHaveLength(0);
  });

  it("includes templates within 1 year of age boundary", () => {
    // min_age=12, childAge=11 → 11 >= 12-1=11 → included
    const tpl = makeTpl({ min_age: 12, max_age: 16, recommended_age: 14 });
    const result = rankTemplates([tpl], { ...baseOptions, childAge: 11 });
    expect(result).toHaveLength(1);
  });

  it("scores perfect age match highest", () => {
    const perfect = makeTpl({ id: "a", name: "A", recommended_age: 10 });
    const close = makeTpl({ id: "b", name: "B", recommended_age: 11 });
    const far = makeTpl({ id: "c", name: "C", recommended_age: 13 });
    const result = rankTemplates([far, close, perfect], baseOptions);
    expect(result[0].id).toBe("a");
    expect(result[0].score).toBeGreaterThan(result[1].score);
    expect(result[1].score).toBeGreaterThan(result[2].score);
  });

  it("boosts templates from unpracticed domains", () => {
    const practiced = makeTpl({ id: "a", name: "A", skill_domain: "LEARNING", recommended_age: 10 });
    const fresh = makeTpl({ id: "b", name: "B", skill_domain: "MONEY", recommended_age: 10 });
    const result = rankTemplates([practiced, fresh], {
      ...baseOptions,
      recentCompletions: [
        { task_name: "Other Learning", skill_domain: "LEARNING", completed_at: new Date().toISOString() },
        { task_name: "Other Learning 2", skill_domain: "LEARNING", completed_at: new Date().toISOString() },
        { task_name: "Other Learning 3", skill_domain: "LEARNING", completed_at: new Date().toISOString() },
        { task_name: "Other Learning 4", skill_domain: "LEARNING", completed_at: new Date().toISOString() },
      ],
    });
    // Fresh domain should rank higher since LEARNING is over-practiced
    expect(result[0].id).toBe("b");
  });

  it("penalizes recently completed templates", () => {
    const recent = makeTpl({ id: "a", name: "Recent Task", recommended_age: 10 });
    const notRecent = makeTpl({ id: "b", name: "Not Recent", recommended_age: 10 });
    const result = rankTemplates([recent, notRecent], {
      ...baseOptions,
      recentCompletions: [
        { task_name: "Recent Task", skill_domain: "LEARNING", completed_at: new Date().toISOString() },
      ],
    });
    expect(result[0].id).toBe("b");
  });

  it("boosts templates matching expected independence for age", () => {
    // Age 10 → expected SUPPORTED
    const supported = makeTpl({ id: "a", name: "A", independence_level: "SUPPORTED", recommended_age: 10 });
    const independent = makeTpl({ id: "b", name: "B", independence_level: "INDEPENDENT", recommended_age: 10 });
    const result = rankTemplates([independent, supported], baseOptions);
    expect(result[0].id).toBe("a");
  });

  it("respects limit parameter", () => {
    const templates = Array.from({ length: 10 }, (_, i) =>
      makeTpl({ id: `t-${i}`, name: `Task ${i}`, recommended_age: 10 })
    );
    const result = rankTemplates(templates, { ...baseOptions, limit: 3 });
    expect(result).toHaveLength(3);
  });

  it("gives bonus to choice_pool challenges", () => {
    const poolChallenge = makeTpl({
      id: "a", name: "A", behavior_type: "challenge", availability_type: "choice_pool", recommended_age: 10,
    });
    const responsibility = makeTpl({
      id: "b", name: "B", behavior_type: "responsibility", availability_type: "daily", recommended_age: 10,
    });
    const result = rankTemplates([responsibility, poolChallenge], baseOptions);
    expect(result[0].id).toBe("a");
  });

  it("handles null fields gracefully", () => {
    const tpl = makeTpl({
      skill_domain: null,
      behavior_type: null,
      recommended_age: null,
      independence_level: null,
      min_age: null,
      max_age: null,
    });
    const result = rankTemplates([tpl], baseOptions);
    expect(result).toHaveLength(1);
    expect(typeof result[0].score).toBe("number");
  });
});
