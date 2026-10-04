import { describe, it, expect } from "vitest";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Quests actions module tests — extracted from app/[locale]/(parent)/quests/actions.ts
//
// Tests: Zod schemas, quest completion logic, contribution upsert logic,
// clone deduplication, reset + reclone flow.
// ---------------------------------------------------------------------------

// ─── Schema definitions (mirrored from actions.ts) ────────────────────────

const questSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  target_count: z.coerce.number().int().min(1).max(1000),
  coin_reward: z.coerce.number().int().min(0).max(1000),
  star_reward: z.coerce.number().int().min(0).max(100),
  end_date: z.string().optional().nullable(),
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. createFamilyQuest schema — valid inputs
// ═══════════════════════════════════════════════════════════════════════════

describe("createFamilyQuest schema — valid inputs", () => {
  it("accepts minimal valid input", () => {
    const result = questSchema.parse({
      title: "Weekend Cleanup",
      target_count: "10",
      coin_reward: "50",
      star_reward: "5",
    });
    expect(result.title).toBe("Weekend Cleanup");
    expect(result.target_count).toBe(10);
    expect(result.coin_reward).toBe(50);
    expect(result.star_reward).toBe(5);
  });

  it("accepts all fields", () => {
    const result = questSchema.parse({
      title: "Read Together",
      description: "Family reading quest",
      target_count: "20",
      coin_reward: "100",
      star_reward: "10",
      end_date: "2024-12-31",
    });
    expect(result.description).toBe("Family reading quest");
    expect(result.end_date).toBe("2024-12-31");
  });

  it("coerces numeric strings", () => {
    const result = questSchema.parse({
      title: "X", target_count: "5", coin_reward: "0", star_reward: "0",
    });
    expect(result.target_count).toBe(5);
    expect(result.coin_reward).toBe(0);
  });

  it("allows null description", () => {
    const result = questSchema.parse({
      title: "X", target_count: 1, coin_reward: 0, star_reward: 0, description: null,
    });
    expect(result.description).toBeNull();
  });

  it("allows null end_date", () => {
    const result = questSchema.parse({
      title: "X", target_count: 1, coin_reward: 0, star_reward: 0, end_date: null,
    });
    expect(result.end_date).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. createFamilyQuest schema — validation errors
// ═══════════════════════════════════════════════════════════════════════════

describe("createFamilyQuest schema — validation errors", () => {
  it("rejects empty title", () => {
    expect(() => questSchema.parse({
      title: "", target_count: 1, coin_reward: 0, star_reward: 0,
    })).toThrow();
  });

  it("rejects title over 100 chars", () => {
    expect(() => questSchema.parse({
      title: "A".repeat(101), target_count: 1, coin_reward: 0, star_reward: 0,
    })).toThrow();
  });

  it("accepts title at 100 chars", () => {
    const result = questSchema.parse({
      title: "A".repeat(100), target_count: 1, coin_reward: 0, star_reward: 0,
    });
    expect(result.title.length).toBe(100);
  });

  it("rejects description over 500 chars", () => {
    expect(() => questSchema.parse({
      title: "X", description: "A".repeat(501), target_count: 1, coin_reward: 0, star_reward: 0,
    })).toThrow();
  });

  it("rejects target_count 0", () => {
    expect(() => questSchema.parse({
      title: "X", target_count: 0, coin_reward: 0, star_reward: 0,
    })).toThrow();
  });

  it("rejects target_count over 1000", () => {
    expect(() => questSchema.parse({
      title: "X", target_count: 1001, coin_reward: 0, star_reward: 0,
    })).toThrow();
  });

  it("rejects negative coin_reward", () => {
    expect(() => questSchema.parse({
      title: "X", target_count: 1, coin_reward: -1, star_reward: 0,
    })).toThrow();
  });

  it("rejects coin_reward over 1000", () => {
    expect(() => questSchema.parse({
      title: "X", target_count: 1, coin_reward: 1001, star_reward: 0,
    })).toThrow();
  });

  it("rejects star_reward over 100", () => {
    expect(() => questSchema.parse({
      title: "X", target_count: 1, coin_reward: 0, star_reward: 101,
    })).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. contributeToQuest — upsert logic
// ═══════════════════════════════════════════════════════════════════════════

describe("contributeToQuest — contribution upsert", () => {
  function computeContribution(
    existing: { id: string; contributions: number } | null,
  ): { action: "update" | "insert"; contributions: number } {
    if (existing) {
      return { action: "update", contributions: existing.contributions + 1 };
    }
    return { action: "insert", contributions: 1 };
  }

  it("creates new member with contribution=1 if no existing", () => {
    const result = computeContribution(null);
    expect(result.action).toBe("insert");
    expect(result.contributions).toBe(1);
  });

  it("increments existing contribution", () => {
    const result = computeContribution({ id: "m1", contributions: 3 });
    expect(result.action).toBe("update");
    expect(result.contributions).toBe(4);
  });

  it("increments from 0", () => {
    const result = computeContribution({ id: "m1", contributions: 0 });
    expect(result.contributions).toBe(1);
  });
});

describe("contributeToQuest — quest completion", () => {
  function computeQuestUpdate(
    currentCount: number,
    targetCount: number,
  ): { newCount: number; completed: boolean } {
    const newCount = currentCount + 1;
    return {
      newCount,
      completed: newCount >= targetCount,
    };
  }

  it("marks completed when count reaches target", () => {
    const result = computeQuestUpdate(9, 10);
    expect(result.newCount).toBe(10);
    expect(result.completed).toBe(true);
  });

  it("marks completed when count exceeds target", () => {
    const result = computeQuestUpdate(10, 10);
    expect(result.completed).toBe(true);
  });

  it("does not complete when below target", () => {
    const result = computeQuestUpdate(5, 10);
    expect(result.completed).toBe(false);
  });

  it("completes single-target quest on first contribution", () => {
    const result = computeQuestUpdate(0, 1);
    expect(result.completed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. cancelQuest — validation
// ═══════════════════════════════════════════════════════════════════════════

describe("cancelQuest — validation", () => {
  const uuidSchema = z.string().uuid();

  it("accepts valid quest UUID", () => {
    expect(uuidSchema.parse("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBeTruthy();
  });

  it("rejects invalid UUID", () => {
    expect(() => uuidSchema.parse("not-uuid")).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. cloneQuestTemplates — deduplication logic
// ═══════════════════════════════════════════════════════════════════════════

describe("cloneQuestTemplates — deduplication", () => {
  function filterNewTemplates(
    templates: { title: string }[],
    existingTitles: Set<string>,
  ): { title: string }[] {
    return templates.filter((t) => !existingTitles.has(t.title));
  }

  it("filters out already-existing titles", () => {
    const templates = [
      { title: "Quest A" },
      { title: "Quest B" },
      { title: "Quest C" },
    ];
    const existing = new Set(["Quest B"]);
    const result = filterNewTemplates(templates, existing);
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.title)).toEqual(["Quest A", "Quest C"]);
  });

  it("returns all when none exist yet", () => {
    const templates = [{ title: "Quest A" }, { title: "Quest B" }];
    expect(filterNewTemplates(templates, new Set())).toHaveLength(2);
  });

  it("returns empty when all exist", () => {
    const templates = [{ title: "Quest A" }];
    expect(filterNewTemplates(templates, new Set(["Quest A"]))).toHaveLength(0);
  });

  it("handles empty templates list", () => {
    expect(filterNewTemplates([], new Set())).toHaveLength(0);
  });
});

describe("cloneQuestTemplates — row construction", () => {
  function buildCloneRow(
    template: { title: string; description: string | null; target_count: number; coin_reward: number; star_reward: number },
    familyId: string,
    userId: string,
  ) {
    return {
      ...template,
      family_id: familyId,
      is_system_template: false,
      created_by: userId,
      status: "active",
    };
  }

  it("sets correct family_id and status", () => {
    const row = buildCloneRow(
      { title: "Q", description: null, target_count: 5, coin_reward: 10, star_reward: 1 },
      "fam-1", "user-1",
    );
    expect(row.family_id).toBe("fam-1");
    expect(row.is_system_template).toBe(false);
    expect(row.created_by).toBe("user-1");
    expect(row.status).toBe("active");
  });

  it("preserves template data", () => {
    const row = buildCloneRow(
      { title: "Family Cook", description: "Cook together", target_count: 10, coin_reward: 50, star_reward: 5 },
      "fam-1", "user-1",
    );
    expect(row.title).toBe("Family Cook");
    expect(row.description).toBe("Cook together");
    expect(row.target_count).toBe(10);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. resetAndRecloneQuests — cancel + reclone flow
// ═══════════════════════════════════════════════════════════════════════════

describe("resetAndRecloneQuests — flow", () => {
  it("cancel targets active non-template quests only", () => {
    // The action filters: family_id + status='active' + is_system_template=false
    const quests = [
      { id: "1", status: "active", is_system_template: false },
      { id: "2", status: "completed", is_system_template: false },
      { id: "3", status: "active", is_system_template: true },
      { id: "4", status: "cancelled", is_system_template: false },
    ];
    const toCancelIds = quests
      .filter((q) => q.status === "active" && !q.is_system_template)
      .map((q) => q.id);
    expect(toCancelIds).toEqual(["1"]);
  });

  it("clones all templates regardless of existing (no dedup in reset)", () => {
    // resetAndRecloneQuests does NOT check existing titles — it always inserts all templates
    const templates = [{ title: "A" }, { title: "B" }, { title: "C" }];
    const rows = templates.map((t) => ({
      ...t,
      family_id: "fam-1",
      is_system_template: false,
      created_by: "user-1",
      status: "active",
    }));
    expect(rows).toHaveLength(3);
    expect(rows[0].status).toBe("active");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. System template nil UUID
// ═══════════════════════════════════════════════════════════════════════════

describe("System template identification", () => {
  const SYSTEM_FAMILY_ID = "00000000-0000-0000-0000-000000000000";

  it("system templates use nil UUID as family_id", () => {
    expect(SYSTEM_FAMILY_ID).toBe("00000000-0000-0000-0000-000000000000");
  });

  it("nil UUID is valid UUID format", () => {
    expect(z.string().uuid().safeParse(SYSTEM_FAMILY_ID).success).toBe(true);
  });
});
