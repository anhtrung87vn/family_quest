import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import {
  selectQuestSuggestions,
  selectRewardSuggestions,
  recurrenceFor,
  toFamilyTask,
  toFamilyReward,
  POOL_QUEST_LIMIT,
  type QuestTemplate,
  type RewardTemplate,
} from "@/lib/age-provisioning";

function quest(overrides: Partial<QuestTemplate> & { name: string }): QuestTemplate {
  return {
    id: overrides.name,
    skill_domain: "LEARNING",
    behavior_type: "challenge",
    recommended_age: 8,
    min_age: 7,
    max_age: 9,
    independence_level: "GUIDED",
    difficulty: 2,
    availability_type: "choice_pool",
    coin_reward: 8,
    star_reward: 1,
    in_pool: true,
    ...overrides,
  };
}

function reward(overrides: Partial<RewardTemplate> & { name: string }): RewardTemplate {
  return {
    id: overrides.name,
    category: "small",
    coin_cost: 50,
    min_age: 6,
    recommended_age: 9,
    max_age: 17,
    ...overrides,
  };
}

const noExisting = { familyTaskNames: new Set<string>(), childTaskNames: new Set<string>() };

describe("selectQuestSuggestions", () => {
  it("only suggests quests whose age range includes the child", () => {
    const templates = [
      quest({ name: "Fits 8", min_age: 7, max_age: 9 }),
      quest({ name: "Teen only", min_age: 13, max_age: 17, recommended_age: 15 }),
      quest({ name: "Just above", min_age: 9, max_age: 12, recommended_age: 10 }),
    ];
    const { pool } = selectQuestSuggestions(templates, 8, noExisting);
    expect(pool.map((q) => q.name)).toEqual(["Fits 8"]);
  });

  it("splits pool quests from assigned core quests", () => {
    const templates = [
      quest({ name: "Pool quest" }),
      quest({ name: "Make bed", in_pool: false, behavior_type: "responsibility", availability_type: "assigned_only" }),
    ];
    const { pool, core } = selectQuestSuggestions(templates, 8, noExisting);
    expect(pool.map((q) => q.name)).toEqual(["Pool quest"]);
    expect(core.map((q) => q.name)).toEqual(["Make bed"]);
  });

  it("keeps core quests to those recommended within one year of the child's age", () => {
    const templates = [
      quest({ name: "Core 9", in_pool: false, recommended_age: 9, min_age: 6, max_age: 12 }),
      quest({ name: "Core 12", in_pool: false, recommended_age: 12, min_age: 6, max_age: 12 }),
    ];
    const { core } = selectQuestSuggestions(templates, 8, noExisting);
    expect(core.map((q) => q.name)).toEqual(["Core 9"]);
  });

  it("skips pool quests the family already has and core quests the child already does", () => {
    const templates = [
      quest({ name: "Owned pool" }),
      quest({ name: "Owned core", in_pool: false }),
      quest({ name: "New pool" }),
    ];
    const { pool, core } = selectQuestSuggestions(templates, 8, {
      familyTaskNames: new Set(["Owned pool"]),
      childTaskNames: new Set(["Owned core"]),
    });
    expect(pool.map((q) => q.name)).toEqual(["New pool"]);
    expect(core).toEqual([]);
  });

  it("caps the pool suggestions", () => {
    const templates = Array.from({ length: POOL_QUEST_LIMIT + 5 }, (_, i) => quest({ name: `Q${i}` }));
    expect(selectQuestSuggestions(templates, 8, noExisting).pool).toHaveLength(POOL_QUEST_LIMIT);
  });
});

describe("selectRewardSuggestions", () => {
  it("filters by age and existing family rewards, cheapest first", () => {
    const templates = [
      reward({ name: "iPad", coin_cost: 12000, min_age: 8 }),
      reward({ name: "Sticker", coin_cost: 20, max_age: 10 }),
      reward({ name: "Café with friends", coin_cost: 60, min_age: 12 }),
      reward({ name: "Bubble tea", coin_cost: 50 }),
    ];
    const out = selectRewardSuggestions(templates, 8, new Set(["Bubble tea"]));
    expect(out.map((r) => r.name)).toEqual(["Sticker", "iPad"]);
  });
});

describe("recurrenceFor", () => {
  it("makes daily and weekly quests recur", () => {
    expect(recurrenceFor("daily")).toEqual({ is_recurring: true, recurrence_rule: '{"freq":"daily"}' });
    expect(recurrenceFor("weekly")).toEqual({ is_recurring: true, recurrence_rule: '{"freq":"weekly","days":[6]}' });
  });

  it("leaves one-off and monthly quests one-off", () => {
    for (const f of ["once", "monthly", null, undefined]) {
      expect(recurrenceFor(f)).toEqual({ is_recurring: false, recurrence_rule: null });
    }
  });
});

describe("family copies", () => {
  it("moves template_key to source_template_key and drops the template id", () => {
    const task = toFamilyTask({ id: "tpl", template_key: "BQ-X", name: "X" }, "fam", "user");
    expect(task).toEqual({
      name: "X", family_id: "fam", created_by: "user", is_system_template: false, active: true, source_template_key: "BQ-X",
    });
    const rw = toFamilyReward({ id: "tpl", template_key: "BQ-RWD-X", name: "X", min_age: 6 }, "fam");
    expect(rw).toEqual({
      name: "X", min_age: 6, family_id: "fam", is_system_template: false, active: true, source_template_key: "BQ-RWD-X",
    });
  });
});
