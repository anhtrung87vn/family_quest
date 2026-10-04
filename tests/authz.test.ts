import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Cross-tenant authorization regression tests for lib/authz.ts
//
// Server actions run with the service-role client (RLS bypassed), so these
// assertions are the only thing standing between a caller-supplied record ID
// and another family's data. A record that exists but belongs to family B must
// be rejected exactly like a record that does not exist at all.
// ---------------------------------------------------------------------------

const FAMILY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const FAMILY_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function mockChain(result: { data?: unknown; error?: unknown }) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: (v: unknown) => void) => resolve(result);
  return chain;
}

function createMockDb(tableResults: Record<string, ReturnType<typeof mockChain>>) {
  return {
    from: vi.fn((table: string) => tableResults[table] ?? mockChain({ data: null })),
  };
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

async function withDb(tables: Record<string, ReturnType<typeof mockChain>>) {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  vi.mocked(createAdminClient).mockReturnValue(createMockDb(tables) as never);
  return import("@/lib/authz");
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════
// Direct family_id tables
// ═══════════════════════════════════════════════════════════════════════════

describe("assertChildInFamily", () => {
  it("allows a child in the caller's family", async () => {
    const { assertChildInFamily } = await withDb({
      children: mockChain({ data: { family_id: FAMILY_A } }),
    });
    await expect(assertChildInFamily("child-1", FAMILY_A)).resolves.toBeUndefined();
  });

  it("rejects a child belonging to another family", async () => {
    const { assertChildInFamily } = await withDb({
      children: mockChain({ data: { family_id: FAMILY_B } }),
    });
    await expect(assertChildInFamily("child-1", FAMILY_A)).rejects.toThrow("Child not found");
  });

  it("rejects a nonexistent child", async () => {
    const { assertChildInFamily } = await withDb({
      children: mockChain({ data: null }),
    });
    await expect(assertChildInFamily("nope", FAMILY_A)).rejects.toThrow("Child not found");
  });

  it("does not disclose whether a foreign record exists", async () => {
    const { assertChildInFamily } = await withDb({
      children: mockChain({ data: { family_id: FAMILY_B } }),
    });
    const foreign = await assertChildInFamily("child-1", FAMILY_A).catch((e: Error) => e.message);

    const { assertChildInFamily: assertMissing } = await withDb({
      children: mockChain({ data: null }),
    });
    const missing = await assertMissing("child-1", FAMILY_A).catch((e: Error) => e.message);

    expect(foreign).toBe(missing);
  });
});

describe("assertTaskInFamily", () => {
  it("allows a task in the caller's family", async () => {
    const { assertTaskInFamily } = await withDb({
      tasks: mockChain({ data: { family_id: FAMILY_A } }),
    });
    await expect(assertTaskInFamily("task-1", FAMILY_A)).resolves.toBeUndefined();
  });

  it("rejects another family's task", async () => {
    const { assertTaskInFamily } = await withDb({
      tasks: mockChain({ data: { family_id: FAMILY_B } }),
    });
    await expect(assertTaskInFamily("task-1", FAMILY_A)).rejects.toThrow("Task not found");
  });
});

describe("assertRewardInFamily", () => {
  it("rejects another family's reward", async () => {
    const { assertRewardInFamily } = await withDb({
      rewards: mockChain({ data: { family_id: FAMILY_B } }),
    });
    await expect(assertRewardInFamily("reward-1", FAMILY_A)).rejects.toThrow("Reward not found");
  });
});

describe("assertEvidenceInFamily", () => {
  it("allows evidence in the caller's family", async () => {
    const { assertEvidenceInFamily } = await withDb({
      task_evidence: mockChain({ data: { family_id: FAMILY_A } }),
    });
    await expect(assertEvidenceInFamily("ev-1", FAMILY_A)).resolves.toBeUndefined();
  });

  it("rejects another family's evidence", async () => {
    const { assertEvidenceInFamily } = await withDb({
      task_evidence: mockChain({ data: { family_id: FAMILY_B } }),
    });
    await expect(assertEvidenceInFamily("ev-1", FAMILY_A)).rejects.toThrow("Evidence not found");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Joined tables — these have no family_id column of their own
// ═══════════════════════════════════════════════════════════════════════════

describe("assertCompletionInFamily", () => {
  it("allows a completion reached through the caller's own child", async () => {
    const { assertCompletionInFamily } = await withDb({
      task_completions: mockChain({
        data: {
          id: "comp-1",
          assignment_id: "assign-1",
          assignment: { child_id: "child-1", child: { family_id: FAMILY_A } },
        },
      }),
    });
    await expect(assertCompletionInFamily("comp-1", FAMILY_A)).resolves.toEqual({
      childId: "child-1",
      assignmentId: "assign-1",
    });
  });

  it("rejects a completion belonging to another family (the IDOR case)", async () => {
    const { assertCompletionInFamily } = await withDb({
      task_completions: mockChain({
        data: {
          id: "comp-1",
          assignment_id: "assign-1",
          assignment: { child_id: "child-9", child: { family_id: FAMILY_B } },
        },
      }),
    });
    await expect(assertCompletionInFamily("comp-1", FAMILY_A)).rejects.toThrow(
      "Completion not found",
    );
  });

  it("rejects when the join returns no child", async () => {
    const { assertCompletionInFamily } = await withDb({
      task_completions: mockChain({
        data: { id: "comp-1", assignment_id: "assign-1", assignment: null },
      }),
    });
    await expect(assertCompletionInFamily("comp-1", FAMILY_A)).rejects.toThrow(
      "Completion not found",
    );
  });

  it("handles PostgREST returning embedded relations as arrays", async () => {
    const { assertCompletionInFamily } = await withDb({
      task_completions: mockChain({
        data: {
          id: "comp-1",
          assignment_id: "assign-1",
          assignment: [{ child_id: "child-1", child: [{ family_id: FAMILY_A }] }],
        },
      }),
    });
    await expect(assertCompletionInFamily("comp-1", FAMILY_A)).resolves.toEqual({
      childId: "child-1",
      assignmentId: "assign-1",
    });
  });
});

describe("assertRedemptionInFamily", () => {
  it("allows a redemption from the caller's own child", async () => {
    const { assertRedemptionInFamily } = await withDb({
      reward_redemptions: mockChain({
        data: { id: "red-1", child_id: "child-1", child: { family_id: FAMILY_A } },
      }),
    });
    await expect(assertRedemptionInFamily("red-1", FAMILY_A)).resolves.toEqual({
      childId: "child-1",
    });
  });

  it("rejects another family's redemption", async () => {
    const { assertRedemptionInFamily } = await withDb({
      reward_redemptions: mockChain({
        data: { id: "red-1", child_id: "child-9", child: { family_id: FAMILY_B } },
      }),
    });
    await expect(assertRedemptionInFamily("red-1", FAMILY_A)).rejects.toThrow(
      "Redemption not found",
    );
  });
});

describe("assertAssignmentInFamily", () => {
  it("rejects another family's assignment", async () => {
    const { assertAssignmentInFamily } = await withDb({
      task_assignments: mockChain({
        data: { id: "assign-1", child: { family_id: FAMILY_B } },
      }),
    });
    await expect(assertAssignmentInFamily("assign-1", FAMILY_A)).rejects.toThrow(
      "Assignment not found",
    );
  });

  it("allows the caller's own assignment", async () => {
    const { assertAssignmentInFamily } = await withDb({
      task_assignments: mockChain({
        data: { id: "assign-1", child: { family_id: FAMILY_A } },
      }),
    });
    await expect(assertAssignmentInFamily("assign-1", FAMILY_A)).resolves.toBeUndefined();
  });
});

describe("assertTransactionInFamily", () => {
  it("rejects another family's coin transaction", async () => {
    const { assertTransactionInFamily } = await withDb({
      coin_transactions: mockChain({
        data: { id: "tx-1", child: { family_id: FAMILY_B } },
      }),
    });
    await expect(
      assertTransactionInFamily("coin_transactions", "tx-1", FAMILY_A),
    ).rejects.toThrow("Transaction not found");
  });

  it("reads from the table it is given", async () => {
    const stars = mockChain({ data: { id: "tx-1", child: { family_id: FAMILY_A } } });
    const { assertTransactionInFamily } = await withDb({ star_transactions: stars });
    await expect(
      assertTransactionInFamily("star_transactions", "tx-1", FAMILY_A),
    ).resolves.toBeUndefined();
    expect(stars.select).toHaveBeenCalled();
  });
});

describe("assertQuestInFamily", () => {
  it("rejects another family's quest", async () => {
    const { assertQuestInFamily } = await withDb({
      family_quests: mockChain({ data: { family_id: FAMILY_B } }),
    });
    await expect(assertQuestInFamily("quest-1", FAMILY_A)).rejects.toThrow("Quest not found");
  });
});

describe("assertResponsibilityEventInFamily", () => {
  it("rejects another family's event", async () => {
    const { assertResponsibilityEventInFamily } = await withDb({
      responsibility_events: mockChain({ data: { family_id: FAMILY_B } }),
    });
    await expect(assertResponsibilityEventInFamily("ev-1", FAMILY_A)).rejects.toThrow(
      "Event not found",
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Storage path guard — protects the signed-URL actions
// ═══════════════════════════════════════════════════════════════════════════

describe("assertStoragePathInFamily", () => {
  it("allows a path under the caller's family prefix", async () => {
    const { assertStoragePathInFamily } = await withDb({});
    expect(() =>
      assertStoragePathInFamily(`${FAMILY_A}/child-1/photo.webp`, FAMILY_A),
    ).not.toThrow();
  });

  it("rejects a path under another family's prefix", async () => {
    const { assertStoragePathInFamily } = await withDb({});
    expect(() =>
      assertStoragePathInFamily(`${FAMILY_B}/child-9/photo.webp`, FAMILY_A),
    ).toThrow("File not found");
  });

  it("rejects directory traversal out of the family prefix", async () => {
    const { assertStoragePathInFamily } = await withDb({});
    expect(() =>
      assertStoragePathInFamily(`${FAMILY_A}/../${FAMILY_B}/photo.webp`, FAMILY_A),
    ).toThrow("File not found");
  });

  it("rejects an empty path", async () => {
    const { assertStoragePathInFamily } = await withDb({});
    expect(() => assertStoragePathInFamily("", FAMILY_A)).toThrow("File not found");
  });

  it("rejects a family id used as a bare prefix without a separator", async () => {
    // `<familyA>extra/...` must not pass just because it starts with the id.
    const { assertStoragePathInFamily } = await withDb({});
    expect(() => assertStoragePathInFamily(`${FAMILY_A}extra/photo.webp`, FAMILY_A)).toThrow(
      "File not found",
    );
  });
});
