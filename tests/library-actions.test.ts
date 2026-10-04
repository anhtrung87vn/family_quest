import { describe, it, expect } from "vitest";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Library actions module tests — extracted from
// app/[locale]/(parent)/library/actions.ts
//
// Tests: Zod schema, template copy logic, deduplication, assignment creation.
// ---------------------------------------------------------------------------

const copyTemplateSchema = z.object({
  template_id: z.string().uuid(),
  child_id: z.string().uuid().optional().nullable(),
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. copyTemplateToFamily schema
// ═══════════════════════════════════════════════════════════════════════════

describe("copyTemplateToFamily schema — valid", () => {
  const validUuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  it("accepts template_id only", () => {
    const result = copyTemplateSchema.parse({ template_id: validUuid });
    expect(result.template_id).toBe(validUuid);
    expect(result.child_id).toBeUndefined();
  });

  it("accepts template_id + child_id", () => {
    const result = copyTemplateSchema.parse({
      template_id: validUuid,
      child_id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    });
    expect(result.child_id).toBe("b2c3d4e5-f6a7-8901-bcde-f12345678901");
  });

  it("accepts null child_id", () => {
    const result = copyTemplateSchema.parse({ template_id: validUuid, child_id: null });
    expect(result.child_id).toBeNull();
  });
});

describe("copyTemplateToFamily schema — invalid", () => {
  it("rejects non-UUID template_id", () => {
    expect(() => copyTemplateSchema.parse({ template_id: "bad" })).toThrow();
  });

  it("rejects non-UUID child_id", () => {
    expect(() => copyTemplateSchema.parse({
      template_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", child_id: "bad",
    })).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Template row stripping (id, created_at, updated_at)
// ═══════════════════════════════════════════════════════════════════════════

describe("Template row stripping", () => {
  function stripAndCopy(
    tpl: { id: string; created_at: string; updated_at: string; name: string; coin_reward: number; template_key: string | null },
    familyId: string,
    userId: string,
  ) {
    const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = tpl;
    return {
      ...rest,
      family_id: familyId,
      is_system_template: false,
      created_by: userId,
      source_template_key: tpl.template_key,
      template_key: null,
      active: true,
    };
  }

  it("removes id, created_at, updated_at", () => {
    const result = stripAndCopy(
      { id: "old-id", created_at: "2024-01-01", updated_at: "2024-01-02", name: "Task", coin_reward: 10, template_key: "TK1" },
      "fam-1", "user-1",
    );
    expect((result as Record<string, unknown>).id).toBeUndefined();
    expect(result.family_id).toBe("fam-1");
  });

  it("sets is_system_template to false", () => {
    const result = stripAndCopy(
      { id: "x", created_at: "", updated_at: "", name: "T", coin_reward: 0, template_key: "K" },
      "f", "u",
    );
    expect(result.is_system_template).toBe(false);
  });

  it("copies source_template_key from template_key", () => {
    const result = stripAndCopy(
      { id: "x", created_at: "", updated_at: "", name: "T", coin_reward: 0, template_key: "BRUSH_TEETH" },
      "f", "u",
    );
    expect(result.source_template_key).toBe("BRUSH_TEETH");
    expect(result.template_key).toBeNull();
  });

  it("sets active to true", () => {
    const result = stripAndCopy(
      { id: "x", created_at: "", updated_at: "", name: "T", coin_reward: 0, template_key: null },
      "f", "u",
    );
    expect(result.active).toBe(true);
  });

  it("preserves task data", () => {
    const result = stripAndCopy(
      { id: "x", created_at: "", updated_at: "", name: "Brush Teeth", coin_reward: 5, template_key: "BT" },
      "f", "u",
    );
    expect(result.name).toBe("Brush Teeth");
    expect(result.coin_reward).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Deduplication — family already has task with same name
// ═══════════════════════════════════════════════════════════════════════════

describe("Template deduplication", () => {
  function hasDuplicate(existing: { id: string }[]): boolean {
    return existing.length > 0;
  }

  it("detects duplicate when existing tasks found", () => {
    expect(hasDuplicate([{ id: "t1" }])).toBe(true);
  });

  it("no duplicate when empty", () => {
    expect(hasDuplicate([])).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Assignment creation on copy
// ═══════════════════════════════════════════════════════════════════════════

describe("Assignment creation on template copy", () => {
  function shouldCreateAssignment(childId: string | null | undefined, newTaskId: string | null): boolean {
    return !!childId && !!newTaskId;
  }

  it("creates when child_id and newTask present", () => {
    expect(shouldCreateAssignment("c1", "t1")).toBe(true);
  });

  it("skips when no child_id", () => {
    expect(shouldCreateAssignment(null, "t1")).toBe(false);
  });

  it("skips when no newTask", () => {
    expect(shouldCreateAssignment("c1", null)).toBe(false);
  });

  it("skips when both null", () => {
    expect(shouldCreateAssignment(null, null)).toBe(false);
  });
});

describe("Assignment defaults", () => {
  function buildAssignment(taskId: string, childId: string) {
    const today = new Date().toISOString().slice(0, 10);
    return {
      task_id: taskId,
      child_id: childId,
      due_date: today,
      status: "pending",
    };
  }

  it("sets due_date to today", () => {
    const assignment = buildAssignment("t1", "c1");
    expect(assignment.due_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("sets status to pending", () => {
    expect(buildAssignment("t1", "c1").status).toBe("pending");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. FormData extraction pattern
// ═══════════════════════════════════════════════════════════════════════════

describe("FormData extraction — child_id fallback", () => {
  function extractChildId(raw: string | null): string | null {
    return raw || null;
  }

  it("returns null for empty string", () => {
    expect(extractChildId("")).toBeNull();
  });

  it("returns null for null", () => {
    expect(extractChildId(null)).toBeNull();
  });

  it("returns value when present", () => {
    expect(extractChildId("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
  });
});
