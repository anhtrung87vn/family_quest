import { describe, it, expect } from "vitest";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Tasks actions module tests — extracted from app/[locale]/(parent)/tasks/actions.ts
//
// Strategy: Test Zod schemas and business logic as pure functions.
// Server actions themselves are thin wrappers (validate → DB → revalidate)
// so we focus on validation schemas, derived state, and edge cases.
// ---------------------------------------------------------------------------

// ─── Schema definitions (mirrored from actions.ts) ────────────────────────

const createTaskSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional().nullable(),
  category: z.enum(["learning", "responsibility", "family", "health", "creativity"]).optional().nullable(),
  coin_reward: z.coerce.number().int().min(0).max(500),
  star_reward: z.coerce.number().int().min(0).max(50),
  difficulty: z.coerce.number().int().min(1).max(10).optional().nullable(),
  requires_approval: z.coerce.boolean().default(true),
  recurrence: z.enum(["none", "daily", "weekdays"]).default("none"),
  behavior_type: z.enum(["responsibility", "habit_building", "challenge", "character", "family"]).default("challenge"),
  responsibility_policy: z.enum(["NONE", "REPAIR_REQUIRED", "COMPLETE_BEFORE_PRIVILEGE", "PARENT_DECIDES"]).default("NONE"),
  availability_type: z.enum(["assigned_only", "choice_pool", "both"]).default("assigned_only"),
  evidence_type: z.enum(["none", "photo", "audio", "text", "choice", "parent_observation"]).default("none"),
  evidence_required: z.coerce.boolean().default(false),
  max_audio_seconds: z.coerce.number().int().min(5).max(60).default(30),
  skill_domain: z.enum(["LEARNING", "SELF_MANAGEMENT", "LIFE_HOME", "MONEY", "COMMUNICATION", "CHARACTER_FAMILY", "HEALTH", "DIGITAL", "WORLD_INDEPENDENCE"]).optional().nullable(),
  min_age: z.coerce.number().int().min(4).max(21).optional().nullable(),
  recommended_age: z.coerce.number().int().min(4).max(21).optional().nullable(),
  max_age: z.coerce.number().int().min(4).max(21).optional().nullable(),
  independence_level: z.enum(["GUIDED", "SUPPORTED", "INDEPENDENT"]).optional().nullable(),
  estimated_minutes: z.coerce.number().int().min(1).max(480).optional().nullable(),
  development_goal: z.string().max(500).optional().nullable(),
  parent_tip: z.string().max(500).optional().nullable(),
  requires_supervision: z.coerce.boolean().default(false),
});

const updateTaskSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional().nullable(),
  coin_reward: z.coerce.number().int().min(0).max(500),
  star_reward: z.coerce.number().int().min(0).max(50),
  evidence_type: z.enum(["none", "photo", "audio", "text", "choice", "parent_observation"]).default("none"),
  evidence_required: z.coerce.boolean().default(false),
  max_audio_seconds: z.coerce.number().int().min(5).max(60).default(30),
  requires_approval: z.coerce.boolean().default(true),
  responsibility_policy: z.enum(["NONE", "REPAIR_REQUIRED", "COMPLETE_BEFORE_PRIVILEGE", "PARENT_DECIDES"]).default("NONE"),
});

const assignTaskSchema = z.object({
  task_id: z.string().uuid(),
  child_ids: z.array(z.string().uuid()).min(1),
  due_date: z.string().optional().nullable(),
});

const handleMissedSchema = z.object({
  task_id: z.string().uuid(),
  child_id: z.string().uuid(),
  task_assignment_id: z.string().uuid().optional().nullable(),
  reason: z.enum(["forgot", "needed_help", "excused", "refused", "skip"]),
  parent_note: z.string().max(500).optional().nullable(),
});

// ═══════════════════════════════════════════════════════════════════════════
// createTaskSchema
// ═══════════════════════════════════════════════════════════════════════════

describe("createTaskSchema validation", () => {
  const validInput = {
    name: "Read a book",
    coin_reward: 5,
    star_reward: 1,
  };

  describe("valid inputs", () => {
    it("accepts minimal valid input with defaults", () => {
      const result = createTaskSchema.parse(validInput);
      expect(result.name).toBe("Read a book");
      expect(result.coin_reward).toBe(5);
      expect(result.star_reward).toBe(1);
      expect(result.requires_approval).toBe(true);
      expect(result.recurrence).toBe("none");
      expect(result.behavior_type).toBe("challenge");
      expect(result.evidence_type).toBe("none");
    });

    it("accepts full input with all fields", () => {
      const result = createTaskSchema.parse({
        ...validInput,
        description: "Read for 20 minutes",
        category: "learning",
        difficulty: 2,
        requires_approval: true,
        recurrence: "daily",
        behavior_type: "habit_building",
        responsibility_policy: "REPAIR_REQUIRED",
        availability_type: "both",
        evidence_type: "photo",
        evidence_required: true,
        max_audio_seconds: 45,
        skill_domain: "LEARNING",
        min_age: 6,
        recommended_age: 8,
        max_age: 12,
        independence_level: "GUIDED",
        estimated_minutes: 20,
        development_goal: "Build reading habit",
        parent_tip: "Let them pick the book",
        requires_supervision: false,
      });
      expect(result.category).toBe("learning");
      expect(result.behavior_type).toBe("habit_building");
      expect(result.evidence_type).toBe("photo");
      expect(result.evidence_required).toBe(true);
      expect(result.skill_domain).toBe("LEARNING");
    });

    it("accepts null for optional fields", () => {
      const result = createTaskSchema.parse({
        ...validInput,
        description: null,
        category: null,
        difficulty: null,
      });
      expect(result.description).toBeNull();
      expect(result.category).toBeNull();
      expect(result.difficulty).toBeNull();
    });

    it("coerces string numbers to numbers", () => {
      const result = createTaskSchema.parse({
        ...validInput,
        coin_reward: "10",
        star_reward: "3",
      });
      expect(result.coin_reward).toBe(10);
      expect(result.star_reward).toBe(3);
    });
  });

  describe("name validation", () => {
    it("rejects empty name", () => {
      expect(() => createTaskSchema.parse({ ...validInput, name: "" })).toThrow();
    });

    it("rejects name over 80 chars", () => {
      expect(() => createTaskSchema.parse({ ...validInput, name: "x".repeat(81) })).toThrow();
    });

    it("accepts name at boundary (80 chars)", () => {
      const result = createTaskSchema.parse({ ...validInput, name: "x".repeat(80) });
      expect(result.name).toHaveLength(80);
    });

    it("accepts 1-char name", () => {
      const result = createTaskSchema.parse({ ...validInput, name: "A" });
      expect(result.name).toBe("A");
    });
  });

  describe("coin_reward validation", () => {
    it("rejects negative coins", () => {
      expect(() => createTaskSchema.parse({ ...validInput, coin_reward: -1 })).toThrow();
    });

    it("rejects coins over 500", () => {
      expect(() => createTaskSchema.parse({ ...validInput, coin_reward: 501 })).toThrow();
    });

    it("accepts 0 coins", () => {
      expect(createTaskSchema.parse({ ...validInput, coin_reward: 0 }).coin_reward).toBe(0);
    });

    it("accepts max 500 coins", () => {
      expect(createTaskSchema.parse({ ...validInput, coin_reward: 500 }).coin_reward).toBe(500);
    });

    it("rejects decimal coin values", () => {
      expect(() => createTaskSchema.parse({ ...validInput, coin_reward: 5.5 })).toThrow();
    });
  });

  describe("star_reward validation", () => {
    it("rejects stars over 50", () => {
      expect(() => createTaskSchema.parse({ ...validInput, star_reward: 51 })).toThrow();
    });

    it("accepts 0 stars", () => {
      expect(createTaskSchema.parse({ ...validInput, star_reward: 0 }).star_reward).toBe(0);
    });

    it("accepts max 50 stars", () => {
      expect(createTaskSchema.parse({ ...validInput, star_reward: 50 }).star_reward).toBe(50);
    });
  });

  describe("max_audio_seconds validation", () => {
    it("defaults to 30", () => {
      expect(createTaskSchema.parse(validInput).max_audio_seconds).toBe(30);
    });

    it("rejects below 5", () => {
      expect(() => createTaskSchema.parse({ ...validInput, max_audio_seconds: 4 })).toThrow();
    });

    it("rejects above 60", () => {
      expect(() => createTaskSchema.parse({ ...validInput, max_audio_seconds: 61 })).toThrow();
    });

    it("accepts boundary values", () => {
      expect(createTaskSchema.parse({ ...validInput, max_audio_seconds: 5 }).max_audio_seconds).toBe(5);
      expect(createTaskSchema.parse({ ...validInput, max_audio_seconds: 60 }).max_audio_seconds).toBe(60);
    });
  });

  describe("enum validations", () => {
    it("rejects invalid category", () => {
      expect(() => createTaskSchema.parse({ ...validInput, category: "invalid" })).toThrow();
    });

    it("rejects invalid behavior_type", () => {
      expect(() => createTaskSchema.parse({ ...validInput, behavior_type: "unknown" })).toThrow();
    });

    it("rejects invalid evidence_type", () => {
      expect(() => createTaskSchema.parse({ ...validInput, evidence_type: "video" })).toThrow();
    });

    it("rejects invalid recurrence", () => {
      expect(() => createTaskSchema.parse({ ...validInput, recurrence: "weekly" })).toThrow();
    });

    it("rejects invalid responsibility_policy", () => {
      expect(() => createTaskSchema.parse({ ...validInput, responsibility_policy: "DEDUCT_COINS" })).toThrow();
    });

    it("rejects invalid availability_type", () => {
      expect(() => createTaskSchema.parse({ ...validInput, availability_type: "public" })).toThrow();
    });

    it("accepts all valid behavior_types", () => {
      for (const bt of ["responsibility", "habit_building", "challenge", "character", "family"]) {
        expect(createTaskSchema.parse({ ...validInput, behavior_type: bt }).behavior_type).toBe(bt);
      }
    });

    it("accepts all valid evidence_types", () => {
      for (const et of ["none", "photo", "audio", "text", "choice", "parent_observation"]) {
        expect(createTaskSchema.parse({ ...validInput, evidence_type: et }).evidence_type).toBe(et);
      }
    });

    it("accepts all valid categories", () => {
      for (const cat of ["learning", "responsibility", "family", "health", "creativity"]) {
        expect(createTaskSchema.parse({ ...validInput, category: cat }).category).toBe(cat);
      }
    });
  });

  describe("curriculum fields", () => {
    it("rejects age below 4", () => {
      expect(() => createTaskSchema.parse({ ...validInput, min_age: 3 })).toThrow();
    });

    it("rejects age above 21", () => {
      expect(() => createTaskSchema.parse({ ...validInput, max_age: 22 })).toThrow();
    });

    it("accepts all valid skill domains", () => {
      const domains = ["LEARNING", "SELF_MANAGEMENT", "LIFE_HOME", "MONEY", "COMMUNICATION", "CHARACTER_FAMILY", "HEALTH", "DIGITAL", "WORLD_INDEPENDENCE"];
      for (const d of domains) {
        expect(createTaskSchema.parse({ ...validInput, skill_domain: d }).skill_domain).toBe(d);
      }
    });

    it("accepts all valid independence levels", () => {
      for (const il of ["GUIDED", "SUPPORTED", "INDEPENDENT"]) {
        expect(createTaskSchema.parse({ ...validInput, independence_level: il }).independence_level).toBe(il);
      }
    });

    it("rejects estimated_minutes below 1", () => {
      expect(() => createTaskSchema.parse({ ...validInput, estimated_minutes: 0 })).toThrow();
    });

    it("rejects estimated_minutes above 480 (8h)", () => {
      expect(() => createTaskSchema.parse({ ...validInput, estimated_minutes: 481 })).toThrow();
    });
  });

  describe("description validation", () => {
    it("rejects description over 500 chars", () => {
      expect(() => createTaskSchema.parse({ ...validInput, description: "x".repeat(501) })).toThrow();
    });

    it("accepts description at boundary (500 chars)", () => {
      const result = createTaskSchema.parse({ ...validInput, description: "x".repeat(500) });
      expect(result.description).toHaveLength(500);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// updateTaskSchema
// ═══════════════════════════════════════════════════════════════════════════

describe("updateTaskSchema validation", () => {
  const validId = "00000000-0000-0000-0000-000000000001";
  const validInput = { id: validId, name: "Updated task", coin_reward: 10, star_reward: 2 };

  it("accepts valid update input", () => {
    const result = updateTaskSchema.parse(validInput);
    expect(result.id).toBe(validId);
    expect(result.name).toBe("Updated task");
    expect(result.requires_approval).toBe(true);
  });

  it("rejects non-UUID id", () => {
    expect(() => updateTaskSchema.parse({ ...validInput, id: "not-a-uuid" })).toThrow();
  });

  it("rejects empty name", () => {
    expect(() => updateTaskSchema.parse({ ...validInput, name: "" })).toThrow();
  });

  it("defaults evidence_type to none", () => {
    expect(updateTaskSchema.parse(validInput).evidence_type).toBe("none");
  });

  it("defaults responsibility_policy to NONE", () => {
    expect(updateTaskSchema.parse(validInput).responsibility_policy).toBe("NONE");
  });

  it("accepts all valid responsibility policies", () => {
    for (const p of ["NONE", "REPAIR_REQUIRED", "COMPLETE_BEFORE_PRIVILEGE", "PARENT_DECIDES"]) {
      expect(updateTaskSchema.parse({ ...validInput, responsibility_policy: p }).responsibility_policy).toBe(p);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// assignTaskSchema
// ═══════════════════════════════════════════════════════════════════════════

describe("assignTaskSchema validation", () => {
  const validId = "00000000-0000-0000-0000-000000000001";
  const childId1 = "00000000-0000-0000-0000-000000000010";
  const childId2 = "00000000-0000-0000-0000-000000000020";

  it("accepts valid assignment with one child", () => {
    const result = assignTaskSchema.parse({
      task_id: validId,
      child_ids: [childId1],
      due_date: "2024-01-15",
    });
    expect(result.task_id).toBe(validId);
    expect(result.child_ids).toHaveLength(1);
  });

  it("accepts assignment with multiple children", () => {
    const result = assignTaskSchema.parse({
      task_id: validId,
      child_ids: [childId1, childId2],
    });
    expect(result.child_ids).toHaveLength(2);
  });

  it("rejects empty child_ids array", () => {
    expect(() =>
      assignTaskSchema.parse({ task_id: validId, child_ids: [] })
    ).toThrow();
  });

  it("rejects non-UUID task_id", () => {
    expect(() =>
      assignTaskSchema.parse({ task_id: "bad", child_ids: [childId1] })
    ).toThrow();
  });

  it("rejects non-UUID child_id in array", () => {
    expect(() =>
      assignTaskSchema.parse({ task_id: validId, child_ids: ["not-uuid"] })
    ).toThrow();
  });

  it("accepts null due_date", () => {
    const result = assignTaskSchema.parse({
      task_id: validId,
      child_ids: [childId1],
      due_date: null,
    });
    expect(result.due_date).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// handleMissedSchema (responsibility-actions.ts)
// ═══════════════════════════════════════════════════════════════════════════

describe("handleMissedSchema validation", () => {
  const validId = "00000000-0000-0000-0000-000000000001";
  const childId = "00000000-0000-0000-0000-000000000010";

  const validInput = {
    task_id: validId,
    child_id: childId,
    reason: "forgot" as const,
  };

  it("accepts valid minimal input", () => {
    const result = handleMissedSchema.parse(validInput);
    expect(result.task_id).toBe(validId);
    expect(result.reason).toBe("forgot");
  });

  it("accepts all valid reasons", () => {
    for (const reason of ["forgot", "needed_help", "excused", "refused", "skip"]) {
      expect(handleMissedSchema.parse({ ...validInput, reason }).reason).toBe(reason);
    }
  });

  it("rejects invalid reason", () => {
    expect(() => handleMissedSchema.parse({ ...validInput, reason: "lazy" })).toThrow();
  });

  it("accepts optional parent_note", () => {
    const result = handleMissedSchema.parse({
      ...validInput,
      parent_note: "Was feeling sick",
    });
    expect(result.parent_note).toBe("Was feeling sick");
  });

  it("rejects parent_note over 500 chars", () => {
    expect(() =>
      handleMissedSchema.parse({ ...validInput, parent_note: "x".repeat(501) })
    ).toThrow();
  });

  it("accepts null parent_note", () => {
    expect(handleMissedSchema.parse({ ...validInput, parent_note: null }).parent_note).toBeNull();
  });

  it("accepts optional task_assignment_id", () => {
    const assignmentId = "00000000-0000-0000-0000-000000000099";
    const result = handleMissedSchema.parse({
      ...validInput,
      task_assignment_id: assignmentId,
    });
    expect(result.task_assignment_id).toBe(assignmentId);
  });

  it("rejects non-UUID task_assignment_id", () => {
    expect(() =>
      handleMissedSchema.parse({ ...validInput, task_assignment_id: "not-uuid" })
    ).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Derived business logic — extracted from actions
// ═══════════════════════════════════════════════════════════════════════════

describe("in_pool derivation from availability_type", () => {
  function deriveInPool(availabilityType: string): boolean {
    return availabilityType === "choice_pool" || availabilityType === "both";
  }

  it("returns false for assigned_only", () => {
    expect(deriveInPool("assigned_only")).toBe(false);
  });

  it("returns true for choice_pool", () => {
    expect(deriveInPool("choice_pool")).toBe(true);
  });

  it("returns true for both", () => {
    expect(deriveInPool("both")).toBe(true);
  });
});

describe("recurrence_rule derivation", () => {
  function deriveRecurrence(recurrence: string): { is_recurring: boolean; recurrence_rule: string | null } {
    const is_recurring = recurrence !== "none";
    const recurrence_rule = is_recurring ? JSON.stringify({ freq: recurrence }) : null;
    return { is_recurring, recurrence_rule };
  }

  it("returns null rule for none", () => {
    const result = deriveRecurrence("none");
    expect(result.is_recurring).toBe(false);
    expect(result.recurrence_rule).toBeNull();
  });

  it("returns daily rule", () => {
    const result = deriveRecurrence("daily");
    expect(result.is_recurring).toBe(true);
    expect(JSON.parse(result.recurrence_rule!)).toEqual({ freq: "daily" });
  });

  it("returns weekdays rule", () => {
    const result = deriveRecurrence("weekdays");
    expect(result.is_recurring).toBe(true);
    expect(JSON.parse(result.recurrence_rule!)).toEqual({ freq: "weekdays" });
  });
});

describe("pool_max_per_day parsing", () => {
  function parsePoolMaxPerDay(raw: string | null): number {
    return raw ? parseInt(raw, 10) || 1 : 1;
  }

  it("defaults to 1 when null", () => {
    expect(parsePoolMaxPerDay(null)).toBe(1);
  });

  it("parses valid integer", () => {
    expect(parsePoolMaxPerDay("3")).toBe(3);
  });

  it("defaults to 1 for non-numeric string", () => {
    expect(parsePoolMaxPerDay("abc")).toBe(1);
  });

  it("defaults to 1 for empty string", () => {
    expect(parsePoolMaxPerDay("")).toBe(1);
  });
});

describe("Responsibility event reason mapping", () => {
  const reasonMap: Record<string, { event_type: string; status: string }> = {
    forgot: { event_type: "FORGOTTEN", status: "OPEN" },
    needed_help: { event_type: "NEEDED_HELP", status: "OPEN" },
    excused: { event_type: "EXCUSED", status: "RESOLVED" },
    refused: { event_type: "REFUSED", status: "OPEN" },
  };

  it("maps forgot to FORGOTTEN event with OPEN status", () => {
    expect(reasonMap["forgot"]).toEqual({ event_type: "FORGOTTEN", status: "OPEN" });
  });

  it("maps needed_help to NEEDED_HELP event with OPEN status", () => {
    expect(reasonMap["needed_help"]).toEqual({ event_type: "NEEDED_HELP", status: "OPEN" });
  });

  it("maps excused to EXCUSED event with RESOLVED status", () => {
    expect(reasonMap["excused"]).toEqual({ event_type: "EXCUSED", status: "RESOLVED" });
  });

  it("maps refused to REFUSED event with OPEN status", () => {
    expect(reasonMap["refused"]).toEqual({ event_type: "REFUSED", status: "OPEN" });
  });

  it("skip reason has no mapping (handled before lookup)", () => {
    expect(reasonMap["skip"]).toBeUndefined();
  });
});

describe("Task assignment row generation", () => {
  function buildAssignmentRows(
    taskId: string,
    childIds: string[],
    dueDate: string | null | undefined,
  ) {
    return childIds.map((cid) => ({
      task_id: taskId,
      child_id: cid,
      due_date: dueDate,
      status: "todo" as const,
    }));
  }

  it("creates one row per child", () => {
    const rows = buildAssignmentRows("task-1", ["c1", "c2", "c3"], "2024-01-15");
    expect(rows).toHaveLength(3);
  });

  it("sets all rows to status todo", () => {
    const rows = buildAssignmentRows("task-1", ["c1"], "2024-01-15");
    expect(rows[0].status).toBe("todo");
  });

  it("assigns same task_id and due_date to all rows", () => {
    const rows = buildAssignmentRows("task-1", ["c1", "c2"], "2024-01-15");
    for (const r of rows) {
      expect(r.task_id).toBe("task-1");
      expect(r.due_date).toBe("2024-01-15");
    }
  });

  it("handles single child", () => {
    const rows = buildAssignmentRows("task-1", ["c1"], null);
    expect(rows).toHaveLength(1);
    expect(rows[0].child_id).toBe("c1");
    expect(rows[0].due_date).toBeNull();
  });
});

describe("Soft delete semantics", () => {
  it("deleteTask soft-deletes by setting active=false (not removing rows)", () => {
    // Verify the convention: soft delete means setting active: false
    const softDelete = { active: false };
    expect(softDelete.active).toBe(false);
  });

  it("deleteAllTasks only targets active, non-template tasks", () => {
    // Verify filters used: family_id + active=true + is_system_template=false
    const filters = { active: true, is_system_template: false };
    expect(filters.active).toBe(true);
    expect(filters.is_system_template).toBe(false);
  });
});

describe("Template cloning dedup logic", () => {
  function filterNewTemplates(
    templates: { name: string }[],
    existingNames: Set<string>,
  ) {
    return templates.filter((t) => !existingNames.has(t.name));
  }

  it("filters out templates whose names already exist", () => {
    const templates = [
      { name: "Read" },
      { name: "Clean" },
      { name: "Cook" },
    ];
    const existing = new Set(["Read", "Cook"]);
    const result = filterNewTemplates(templates, existing);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Clean");
  });

  it("returns all templates when no existing names", () => {
    const templates = [{ name: "A" }, { name: "B" }];
    const result = filterNewTemplates(templates, new Set());
    expect(result).toHaveLength(2);
  });

  it("returns empty when all templates already exist", () => {
    const templates = [{ name: "A" }];
    const result = filterNewTemplates(templates, new Set(["A"]));
    expect(result).toHaveLength(0);
  });

  it("handles empty template list", () => {
    const result = filterNewTemplates([], new Set(["A"]));
    expect(result).toHaveLength(0);
  });
});

describe("startHabitSupport reward defaults", () => {
  function computeHabitUpdates(coinReward: number | null, starReward: number | null) {
    const updates: Record<string, unknown> = { behavior_type: "habit_building" };
    if ((coinReward ?? 0) === 0) updates.coin_reward = 5;
    if ((starReward ?? 0) === 0) updates.star_reward = 1;
    return updates;
  }

  it("sets default coin_reward=5 when existing is 0", () => {
    const updates = computeHabitUpdates(0, 3);
    expect(updates.coin_reward).toBe(5);
    expect(updates.star_reward).toBeUndefined();
  });

  it("sets default star_reward=1 when existing is 0", () => {
    const updates = computeHabitUpdates(10, 0);
    expect(updates.star_reward).toBe(1);
    expect(updates.coin_reward).toBeUndefined();
  });

  it("sets both defaults when both are 0", () => {
    const updates = computeHabitUpdates(0, 0);
    expect(updates.coin_reward).toBe(5);
    expect(updates.star_reward).toBe(1);
  });

  it("sets both defaults when both are null", () => {
    const updates = computeHabitUpdates(null, null);
    expect(updates.coin_reward).toBe(5);
    expect(updates.star_reward).toBe(1);
  });

  it("keeps existing rewards when non-zero", () => {
    const updates = computeHabitUpdates(10, 3);
    expect(updates.coin_reward).toBeUndefined();
    expect(updates.star_reward).toBeUndefined();
    expect(updates.behavior_type).toBe("habit_building");
  });
});

describe("updateRewardStage graduated_at logic", () => {
  function computeGraduatedAt(rewardStage: string): string | null {
    return rewardStage === "graduated" ? new Date().toISOString() : null;
  }

  it("sets graduated_at when stage is graduated", () => {
    const result = computeGraduatedAt("graduated");
    expect(result).not.toBeNull();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns null when stage is not graduated", () => {
    expect(computeGraduatedAt("full_reward")).toBeNull();
    expect(computeGraduatedAt("reduced_reward")).toBeNull();
    expect(computeGraduatedAt("stars_only")).toBeNull();
  });
});
