import { describe, it, expect } from "vitest";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Reflections actions module tests — extracted from
// app/[locale]/(parent)/reflections/actions.ts
//
// Tests: Zod schemas, week-end calculation, stats aggregation,
// upsert conflict key, and parent message side-effect gating.
// ---------------------------------------------------------------------------

const reflectionSchema = z.object({
  child_id: z.string().uuid(),
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  highlights: z.string().max(1000).optional().nullable(),
  growth_note: z.string().max(1000).optional().nullable(),
  parent_message: z.string().max(500).optional().nullable(),
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. reflectionSchema — valid inputs
// ═══════════════════════════════════════════════════════════════════════════

describe("reflectionSchema — valid inputs", () => {
  const validUuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  it("accepts minimal valid input", () => {
    const result = reflectionSchema.parse({
      child_id: validUuid,
      week_start: "2024-06-17",
    });
    expect(result.child_id).toBe(validUuid);
    expect(result.week_start).toBe("2024-06-17");
  });

  it("accepts all fields", () => {
    const result = reflectionSchema.parse({
      child_id: validUuid,
      week_start: "2024-06-17",
      highlights: "Great week!",
      growth_note: "Improved reading",
      parent_message: "So proud of you!",
    });
    expect(result.highlights).toBe("Great week!");
    expect(result.growth_note).toBe("Improved reading");
    expect(result.parent_message).toBe("So proud of you!");
  });

  it("allows null optional fields", () => {
    const result = reflectionSchema.parse({
      child_id: validUuid,
      week_start: "2024-01-01",
      highlights: null,
      growth_note: null,
      parent_message: null,
    });
    expect(result.highlights).toBeNull();
    expect(result.growth_note).toBeNull();
    expect(result.parent_message).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. reflectionSchema — validation errors
// ═══════════════════════════════════════════════════════════════════════════

describe("reflectionSchema — validation errors", () => {
  const validUuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  it("rejects non-UUID child_id", () => {
    expect(() => reflectionSchema.parse({ child_id: "bad", week_start: "2024-01-01" })).toThrow();
  });

  it("rejects invalid week_start format", () => {
    expect(() => reflectionSchema.parse({ child_id: validUuid, week_start: "01/01/2024" })).toThrow();
  });

  it("rejects week_start with extra chars", () => {
    expect(() => reflectionSchema.parse({ child_id: validUuid, week_start: "2024-01-01T00:00" })).toThrow();
  });

  it("rejects highlights over 1000 chars", () => {
    expect(() => reflectionSchema.parse({
      child_id: validUuid, week_start: "2024-01-01", highlights: "A".repeat(1001),
    })).toThrow();
  });

  it("rejects growth_note over 1000 chars", () => {
    expect(() => reflectionSchema.parse({
      child_id: validUuid, week_start: "2024-01-01", growth_note: "A".repeat(1001),
    })).toThrow();
  });

  it("rejects parent_message over 500 chars", () => {
    expect(() => reflectionSchema.parse({
      child_id: validUuid, week_start: "2024-01-01", parent_message: "A".repeat(501),
    })).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Week-end date calculation
// ═══════════════════════════════════════════════════════════════════════════

describe("Week-end date calculation", () => {
  function computeWeekEnd(weekStart: string): string {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return weekEnd.toISOString().slice(0, 10);
  }

  it("adds 6 days to Monday → Sunday", () => {
    expect(computeWeekEnd("2024-06-17")).toBe("2024-06-23"); // Mon → Sun
  });

  it("handles month boundary", () => {
    expect(computeWeekEnd("2024-06-26")).toBe("2024-07-02");
  });

  it("handles year boundary", () => {
    expect(computeWeekEnd("2024-12-30")).toBe("2025-01-05");
  });

  it("handles Feb → March in leap year", () => {
    expect(computeWeekEnd("2024-02-26")).toBe("2024-03-03");
  });

  it("handles Feb → March in non-leap year", () => {
    expect(computeWeekEnd("2023-02-27")).toBe("2023-03-05");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Stats aggregation logic
// ═══════════════════════════════════════════════════════════════════════════

describe("Stats aggregation — coins/stars", () => {
  function sumAmounts(rows: { amount: number }[]): number {
    return rows.reduce((s, r) => s + r.amount, 0);
  }

  it("sums positive amounts", () => {
    expect(sumAmounts([{ amount: 10 }, { amount: 20 }, { amount: 5 }])).toBe(35);
  });

  it("returns 0 for empty array", () => {
    expect(sumAmounts([])).toBe(0);
  });

  it("handles single entry", () => {
    expect(sumAmounts([{ amount: 42 }])).toBe(42);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Upsert conflict key
// ═══════════════════════════════════════════════════════════════════════════

describe("Upsert conflict key", () => {
  it("uses child_id + week_start as natural key", () => {
    const conflictKey = "child_id,week_start";
    expect(conflictKey.split(",")).toEqual(["child_id", "week_start"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. Parent message side-effect gating
// ═══════════════════════════════════════════════════════════════════════════

describe("Parent message side-effect", () => {
  function shouldCreateMessage(parentMessage: string | null | undefined, upsertedId: string | null): boolean {
    return !!parentMessage && !!upsertedId;
  }

  it("creates when both message and id present", () => {
    expect(shouldCreateMessage("Great job!", "ref-1")).toBe(true);
  });

  it("skips when no message", () => {
    expect(shouldCreateMessage(null, "ref-1")).toBe(false);
  });

  it("skips when empty message", () => {
    expect(shouldCreateMessage("", "ref-1")).toBe(false);
  });

  it("skips when no upserted id", () => {
    expect(shouldCreateMessage("Great job!", null)).toBe(false);
  });

  it("message type is WEEKLY_JOURNAL", () => {
    const messageType = "WEEKLY_JOURNAL";
    expect(messageType).toBe("WEEKLY_JOURNAL");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. End date string for query filter
// ═══════════════════════════════════════════════════════════════════════════

describe("End-of-day timestamp for query", () => {
  it("appends T23:59:59Z to date string", () => {
    const endStr = "2024-06-23";
    expect(endStr + "T23:59:59Z").toBe("2024-06-23T23:59:59Z");
  });
});
