import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// 1. Pure logic tests — reward scaling extracted from awardTask
// ---------------------------------------------------------------------------

/**
 * Compute effective coin/star rewards based on behavior_type and reward_stage.
 * Mirrors the logic inside awardTask's DEV_BYPASS branch (lines 32-46 of ledger.ts).
 */
function computeEffectiveRewards(
  coinReward: number,
  starReward: number,
  behaviorType: string,
  rewardStage: string | null,
): { effCoin: number; effStar: number } {
  let effCoin = coinReward;
  let effStar = starReward;

  if (behaviorType === "habit_building" || behaviorType === "responsibility") {
    const stage =
      rewardStage ?? (behaviorType === "responsibility" ? "graduated" : "full_reward");

    if (stage === "reduced_reward") {
      effCoin = Math.max(Math.floor(effCoin * 0.4), 0);
    } else if (stage === "stars_only") {
      effCoin = 0;
      effStar = effStar > 0 ? Math.max(Math.floor(effStar * 0.5), 1) : 0;
    } else if (stage === "graduated") {
      effCoin = 0;
      effStar = 0;
    }
    // "full_reward" keeps original values
  }

  return { effCoin, effStar };
}

describe("computeEffectiveRewards", () => {
  describe("challenge behavior type", () => {
    it("returns full rewards for challenge tasks regardless of stage", () => {
      const result = computeEffectiveRewards(10, 5, "challenge", null);
      expect(result).toEqual({ effCoin: 10, effStar: 5 });
    });

    it("ignores reward_stage for non-habit/responsibility behaviors", () => {
      const result = computeEffectiveRewards(10, 5, "challenge", "graduated");
      expect(result).toEqual({ effCoin: 10, effStar: 5 });
    });

    it("returns full rewards for character behavior type", () => {
      const result = computeEffectiveRewards(8, 3, "character", "graduated");
      expect(result).toEqual({ effCoin: 8, effStar: 3 });
    });

    it("returns full rewards for family behavior type", () => {
      const result = computeEffectiveRewards(15, 2, "family", null);
      expect(result).toEqual({ effCoin: 15, effStar: 2 });
    });
  });

  describe("habit_building behavior type", () => {
    it("defaults to full_reward stage when no progress exists", () => {
      const result = computeEffectiveRewards(10, 5, "habit_building", null);
      expect(result).toEqual({ effCoin: 10, effStar: 5 });
    });

    it("returns full rewards at full_reward stage", () => {
      const result = computeEffectiveRewards(10, 5, "habit_building", "full_reward");
      expect(result).toEqual({ effCoin: 10, effStar: 5 });
    });

    it("reduces coins to 40% at reduced_reward stage", () => {
      const result = computeEffectiveRewards(10, 5, "habit_building", "reduced_reward");
      expect(result.effCoin).toBe(4); // floor(10 * 0.4)
      expect(result.effStar).toBe(5);
    });

    it("floors reduced coins (no rounding up)", () => {
      const result = computeEffectiveRewards(7, 3, "habit_building", "reduced_reward");
      expect(result.effCoin).toBe(2); // floor(7 * 0.4) = floor(2.8) = 2
      expect(result.effStar).toBe(3);
    });

    it("reduced_reward with 0 coins stays 0", () => {
      const result = computeEffectiveRewards(0, 5, "habit_building", "reduced_reward");
      expect(result.effCoin).toBe(0);
      expect(result.effStar).toBe(5);
    });

    it("reduced_reward with 1 coin gives 0 (floor of 0.4)", () => {
      const result = computeEffectiveRewards(1, 2, "habit_building", "reduced_reward");
      expect(result.effCoin).toBe(0); // floor(1 * 0.4) = 0
    });

    it("zeros coins and halves stars at stars_only stage", () => {
      const result = computeEffectiveRewards(10, 4, "habit_building", "stars_only");
      expect(result.effCoin).toBe(0);
      expect(result.effStar).toBe(2); // floor(4 * 0.5) = 2
    });

    it("stars_only guarantees at least 1 star when star_reward > 0", () => {
      const result = computeEffectiveRewards(10, 1, "habit_building", "stars_only");
      expect(result.effCoin).toBe(0);
      expect(result.effStar).toBe(1); // max(floor(1 * 0.5), 1) = max(0, 1) = 1
    });

    it("stars_only with 0 star_reward gives 0 stars", () => {
      const result = computeEffectiveRewards(10, 0, "habit_building", "stars_only");
      expect(result.effCoin).toBe(0);
      expect(result.effStar).toBe(0);
    });

    it("zeros everything at graduated stage", () => {
      const result = computeEffectiveRewards(10, 5, "habit_building", "graduated");
      expect(result).toEqual({ effCoin: 0, effStar: 0 });
    });
  });

  describe("responsibility behavior type", () => {
    it("defaults to graduated stage when no progress exists (no rewards)", () => {
      const result = computeEffectiveRewards(10, 5, "responsibility", null);
      expect(result).toEqual({ effCoin: 0, effStar: 0 });
    });

    it("returns full rewards at full_reward stage", () => {
      const result = computeEffectiveRewards(10, 5, "responsibility", "full_reward");
      expect(result).toEqual({ effCoin: 10, effStar: 5 });
    });

    it("reduces coins at reduced_reward stage", () => {
      const result = computeEffectiveRewards(10, 5, "responsibility", "reduced_reward");
      expect(result.effCoin).toBe(4);
      expect(result.effStar).toBe(5);
    });

    it("stars_only stage for responsibility", () => {
      const result = computeEffectiveRewards(10, 6, "responsibility", "stars_only");
      expect(result.effCoin).toBe(0);
      expect(result.effStar).toBe(3); // floor(6 * 0.5) = 3
    });

    it("graduated stage for responsibility zeros everything", () => {
      const result = computeEffectiveRewards(20, 10, "responsibility", "graduated");
      expect(result).toEqual({ effCoin: 0, effStar: 0 });
    });
  });

  describe("edge cases", () => {
    it("handles very large coin values at reduced_reward", () => {
      const result = computeEffectiveRewards(1000, 100, "habit_building", "reduced_reward");
      expect(result.effCoin).toBe(400);
      expect(result.effStar).toBe(100);
    });

    it("handles very large star values at stars_only", () => {
      const result = computeEffectiveRewards(999, 999, "responsibility", "stars_only");
      expect(result.effCoin).toBe(0);
      expect(result.effStar).toBe(499); // floor(999 * 0.5) = 499
    });

    it("handles zero rewards gracefully at all stages", () => {
      expect(computeEffectiveRewards(0, 0, "habit_building", "full_reward")).toEqual({ effCoin: 0, effStar: 0 });
      expect(computeEffectiveRewards(0, 0, "habit_building", "reduced_reward")).toEqual({ effCoin: 0, effStar: 0 });
      expect(computeEffectiveRewards(0, 0, "habit_building", "stars_only")).toEqual({ effCoin: 0, effStar: 0 });
      expect(computeEffectiveRewards(0, 0, "habit_building", "graduated")).toEqual({ effCoin: 0, effStar: 0 });
    });
  });
});

// ---------------------------------------------------------------------------
// 2. Balance fallback logic — extracted from getChildBalance
// ---------------------------------------------------------------------------

describe("getChildBalance fallback logic", () => {
  function resolveBalance(
    data: { coin_balance: number | null; star_balance: number | null } | null,
    error: { message: string } | null,
  ): { coin: number; star: number } {
    if (error) {
      return { coin: 0, star: 0 };
    }
    return { coin: data?.coin_balance ?? 0, star: data?.star_balance ?? 0 };
  }

  it("returns balances from valid data", () => {
    const result = resolveBalance({ coin_balance: 50, star_balance: 10 }, null);
    expect(result).toEqual({ coin: 50, star: 10 });
  });

  it("returns zeros when data is null", () => {
    const result = resolveBalance(null, null);
    expect(result).toEqual({ coin: 0, star: 0 });
  });

  it("returns zeros when there is an error", () => {
    const result = resolveBalance(
      { coin_balance: 999, star_balance: 999 },
      { message: "ECONNRESET" },
    );
    expect(result).toEqual({ coin: 0, star: 0 });
  });

  it("handles null coin_balance gracefully", () => {
    const result = resolveBalance({ coin_balance: null, star_balance: 5 }, null);
    expect(result).toEqual({ coin: 0, star: 5 });
  });

  it("handles null star_balance gracefully", () => {
    const result = resolveBalance({ coin_balance: 42, star_balance: null }, null);
    expect(result).toEqual({ coin: 42, star: 0 });
  });

  it("handles both balances null", () => {
    const result = resolveBalance({ coin_balance: null, star_balance: null }, null);
    expect(result).toEqual({ coin: 0, star: 0 });
  });
});

// ---------------------------------------------------------------------------
// 3. Redemption status guard logic — extracted from approveRedemption/rejectRedemption
// ---------------------------------------------------------------------------

describe("Redemption status guards", () => {
  function shouldProcessRedemption(status: string): boolean {
    return status === "requested";
  }

  it("allows processing when status is 'requested'", () => {
    expect(shouldProcessRedemption("requested")).toBe(true);
  });

  it("skips processing when already 'approved'", () => {
    expect(shouldProcessRedemption("approved")).toBe(false);
  });

  it("skips processing when already 'rejected'", () => {
    expect(shouldProcessRedemption("rejected")).toBe(false);
  });

  it("skips processing when 'cancelled'", () => {
    expect(shouldProcessRedemption("cancelled")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Coin refund logic — extracted from rejectRedemption
// ---------------------------------------------------------------------------

describe("Coin refund on rejection", () => {
  function buildRefundTransaction(
    childId: string,
    coinCost: number,
    redemptionId: string,
    userId: string,
  ) {
    return {
      child_id: childId,
      amount: coinCost,
      transaction_type: "MANUAL_ADJUSTMENT",
      reference_id: redemptionId,
      description: "Reward request rejected — refund",
      created_by: userId,
    };
  }

  it("creates a positive-amount refund transaction", () => {
    const tx = buildRefundTransaction("child-1", 50, "redemption-1", "user-1");
    expect(tx.amount).toBe(50);
    expect(tx.amount).toBeGreaterThan(0);
    expect(tx.transaction_type).toBe("MANUAL_ADJUSTMENT");
    expect(tx.description).toContain("refund");
  });

  it("preserves original coin_cost as refund amount", () => {
    const tx = buildRefundTransaction("child-1", 100, "redemption-2", "user-1");
    expect(tx.amount).toBe(100);
  });

  it("links to the correct redemption via reference_id", () => {
    const tx = buildRefundTransaction("child-1", 25, "red-abc", "user-1");
    expect(tx.reference_id).toBe("red-abc");
  });
});

// ---------------------------------------------------------------------------
// 5. Manual adjustment validation logic
// ---------------------------------------------------------------------------

describe("Manual adjustment transaction shape", () => {
  function buildManualAdjustment(
    childId: string,
    amount: number,
    reason: string,
    userId: string,
  ) {
    return {
      child_id: childId,
      amount,
      transaction_type: "MANUAL_ADJUSTMENT",
      description: reason,
      created_by: userId,
    };
  }

  it("creates positive adjustment (add coins)", () => {
    const tx = buildManualAdjustment("child-1", 100, "Bonus for good behavior", "user-1");
    expect(tx.amount).toBe(100);
    expect(tx.transaction_type).toBe("MANUAL_ADJUSTMENT");
  });

  it("creates negative adjustment (deduct coins)", () => {
    const tx = buildManualAdjustment("child-1", -50, "Penalty", "user-1");
    expect(tx.amount).toBe(-50);
  });

  it("creates zero adjustment", () => {
    const tx = buildManualAdjustment("child-1", 0, "No change", "user-1");
    expect(tx.amount).toBe(0);
  });

  it("preserves reason as description", () => {
    const reason = "Birthday bonus! Extra coins for turning 8.";
    const tx = buildManualAdjustment("child-1", 200, reason, "user-1");
    expect(tx.description).toBe(reason);
  });
});

// ---------------------------------------------------------------------------
// 6. Task reward transaction shape
// ---------------------------------------------------------------------------

describe("Task reward transaction shape", () => {
  function buildTaskRewardTransactions(
    childId: string,
    effCoin: number,
    effStar: number,
    completionId: string,
    userId: string,
  ) {
    const txs: Array<{ table: string; data: Record<string, unknown> }> = [];
    if (effCoin > 0) {
      txs.push({
        table: "coin_transactions",
        data: {
          child_id: childId,
          amount: effCoin,
          transaction_type: "TASK_REWARD",
          reference_id: completionId,
          description: "Task approved",
          created_by: userId,
        },
      });
    }
    if (effStar > 0) {
      txs.push({
        table: "star_transactions",
        data: {
          child_id: childId,
          amount: effStar,
          transaction_type: "TASK_STAR_REWARD",
          reference_id: completionId,
          description: "Task approved",
          created_by: userId,
        },
      });
    }
    return txs;
  }

  it("creates both coin and star transactions when both > 0", () => {
    const txs = buildTaskRewardTransactions("c1", 10, 5, "comp-1", "u1");
    expect(txs).toHaveLength(2);
    expect(txs[0].table).toBe("coin_transactions");
    expect(txs[1].table).toBe("star_transactions");
  });

  it("creates only coin transaction when star = 0", () => {
    const txs = buildTaskRewardTransactions("c1", 10, 0, "comp-1", "u1");
    expect(txs).toHaveLength(1);
    expect(txs[0].table).toBe("coin_transactions");
  });

  it("creates only star transaction when coin = 0", () => {
    const txs = buildTaskRewardTransactions("c1", 0, 5, "comp-1", "u1");
    expect(txs).toHaveLength(1);
    expect(txs[0].table).toBe("star_transactions");
  });

  it("creates no transactions when both are 0", () => {
    const txs = buildTaskRewardTransactions("c1", 0, 0, "comp-1", "u1");
    expect(txs).toHaveLength(0);
  });

  it("uses TASK_REWARD type for coins and TASK_STAR_REWARD for stars", () => {
    const txs = buildTaskRewardTransactions("c1", 1, 1, "comp-1", "u1");
    expect(txs[0].data.transaction_type).toBe("TASK_REWARD");
    expect(txs[1].data.transaction_type).toBe("TASK_STAR_REWARD");
  });

  it("links transactions to completion via reference_id", () => {
    const txs = buildTaskRewardTransactions("c1", 5, 3, "comp-xyz", "u1");
    for (const tx of txs) {
      expect(tx.data.reference_id).toBe("comp-xyz");
    }
  });
});

// ---------------------------------------------------------------------------
// 7. Lifetime stars update logic
// ---------------------------------------------------------------------------

describe("Lifetime stars update", () => {
  function computeNewLifetimeStars(
    currentStars: number | null | undefined,
    earnedStars: number,
  ): number {
    return (currentStars ?? 0) + earnedStars;
  }

  it("adds earned stars to existing total", () => {
    expect(computeNewLifetimeStars(100, 5)).toBe(105);
  });

  it("handles null current stars (new child)", () => {
    expect(computeNewLifetimeStars(null, 3)).toBe(3);
  });

  it("handles undefined current stars", () => {
    expect(computeNewLifetimeStars(undefined, 7)).toBe(7);
  });

  it("handles zero earned stars", () => {
    expect(computeNewLifetimeStars(50, 0)).toBe(50);
  });

  it("handles large star values", () => {
    expect(computeNewLifetimeStars(999, 1)).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// 8. Completion counter (habit tracking) logic
// ---------------------------------------------------------------------------

describe("Completion counter logic", () => {
  function updateCompletionCount(existing: { completions: number | null } | null): {
    action: "insert" | "update";
    newCount: number;
  } {
    if (existing) {
      return { action: "update", newCount: (existing.completions ?? 0) + 1 };
    }
    return { action: "insert", newCount: 1 };
  }

  it("inserts new progress row when no existing record", () => {
    const result = updateCompletionCount(null);
    expect(result.action).toBe("insert");
    expect(result.newCount).toBe(1);
  });

  it("updates existing record and increments count", () => {
    const result = updateCompletionCount({ completions: 5 });
    expect(result.action).toBe("update");
    expect(result.newCount).toBe(6);
  });

  it("handles null completions field in existing record", () => {
    const result = updateCompletionCount({ completions: null });
    expect(result.action).toBe("update");
    expect(result.newCount).toBe(1);
  });

  it("increments from 0", () => {
    const result = updateCompletionCount({ completions: 0 });
    expect(result.action).toBe("update");
    expect(result.newCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 9. Mocked integration tests — awardTask, rejectTask, getChildBalance, etc.
// ---------------------------------------------------------------------------

// Helper: builds a chainable Supabase mock
function mockChain(result: { data?: unknown; error?: unknown; count?: number }) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.lte = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  // Make chain itself thenable for queries that don't end with single()
  chain.then = (resolve: (v: unknown) => void) => resolve(result);
  return chain;
}

function createMockDb(tableResults: Record<string, ReturnType<typeof mockChain>>) {
  return {
    from: vi.fn((table: string) => tableResults[table] ?? mockChain({ data: null })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
}

// We test the DEV_BYPASS code path by mocking createAdminClient
// since that's the only path testable without a real Supabase instance.
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/dev-family", () => ({
  DEV_BYPASS: true,
  DEV_USER_ID: "test-user-id",
  DEV_FAMILY_ID: "test-family-id",
}));

describe("getChildBalance (mocked)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns coin and star balances from child_balances view", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const db = createMockDb({
      child_balances: mockChain({
        data: { coin_balance: 120, star_balance: 45 },
        error: null,
      }),
    });
    vi.mocked(createAdminClient).mockReturnValue(db as any);

    const { getChildBalance } = await import("@/lib/ledger");
    const result = await getChildBalance("child-123");

    expect(result).toEqual({ coin: 120, star: 45 });
    expect(db.from).toHaveBeenCalledWith("child_balances");
  });

  it("returns zeros on database error", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const db = createMockDb({
      child_balances: mockChain({
        data: null,
        error: { message: "relation does not exist" },
      }),
    });
    vi.mocked(createAdminClient).mockReturnValue(db as any);

    const { getChildBalance } = await import("@/lib/ledger");
    const result = await getChildBalance("child-404");

    expect(result).toEqual({ coin: 0, star: 0 });
  });

  it("returns zeros when data has null balances", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const db = createMockDb({
      child_balances: mockChain({
        data: { coin_balance: null, star_balance: null },
        error: null,
      }),
    });
    vi.mocked(createAdminClient).mockReturnValue(db as any);

    const { getChildBalance } = await import("@/lib/ledger");
    const result = await getChildBalance("child-null");

    expect(result).toEqual({ coin: 0, star: 0 });
  });
});

describe("rejectTask (mocked DEV_BYPASS)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when completion not found", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const db = createMockDb({
      task_completions: mockChain({ data: null }),
    });
    vi.mocked(createAdminClient).mockReturnValue(db as any);

    const { rejectTask } = await import("@/lib/ledger");
    await expect(rejectTask("missing-id")).rejects.toThrow("completion not found");
  });

  it("updates completion status to rejected and sets assignment to rejected", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const completionsChain = mockChain({ data: { assignment_id: "assign-1" } });
    const assignmentsChain = mockChain({ data: null });
    const db = createMockDb({
      task_completions: completionsChain,
      task_assignments: assignmentsChain,
    });
    vi.mocked(createAdminClient).mockReturnValue(db as any);

    const { rejectTask } = await import("@/lib/ledger");
    await rejectTask("comp-1", "Try again");

    // Verify update was called on task_completions
    expect(completionsChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "rejected",
        parent_note: "Try again",
        approved_by: "test-user-id",
      }),
    );
    // Verify assignment status updated
    expect(assignmentsChain.update).toHaveBeenCalledWith({ status: "rejected" });
  });

  it("sets parent_note to null when note is not provided", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const completionsChain = mockChain({ data: { assignment_id: "assign-1" } });
    const db = createMockDb({
      task_completions: completionsChain,
      task_assignments: mockChain({ data: null }),
    });
    vi.mocked(createAdminClient).mockReturnValue(db as any);

    const { rejectTask } = await import("@/lib/ledger");
    await rejectTask("comp-1");

    expect(completionsChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ parent_note: null }),
    );
  });
});

describe("approveRedemption (mocked DEV_BYPASS)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when redemption not found", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const db = createMockDb({
      reward_redemptions: mockChain({ data: null }),
    });
    vi.mocked(createAdminClient).mockReturnValue(db as any);

    const { approveRedemption } = await import("@/lib/ledger");
    await expect(approveRedemption("missing")).rejects.toThrow("redemption not found");
  });

  it("no-ops when redemption is already approved", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const chain = mockChain({ data: { child_id: "c1", coin_cost: 50, status: "approved" } });
    const db = createMockDb({ reward_redemptions: chain });
    vi.mocked(createAdminClient).mockReturnValue(db as any);

    const { approveRedemption } = await import("@/lib/ledger");
    await approveRedemption("red-1");

    // update should NOT be called because status !== "requested"
    expect(chain.update).not.toHaveBeenCalled();
  });

  it("updates status to approved when status is 'requested'", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const chain = mockChain({ data: { child_id: "c1", coin_cost: 50, status: "requested" } });
    const db = createMockDb({ reward_redemptions: chain });
    vi.mocked(createAdminClient).mockReturnValue(db as any);

    const { approveRedemption } = await import("@/lib/ledger");
    await approveRedemption("red-1");

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "approved",
        approved_by: "test-user-id",
      }),
    );
  });
});

describe("rejectRedemption (mocked DEV_BYPASS)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when redemption not found", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const db = createMockDb({
      reward_redemptions: mockChain({ data: null }),
    });
    vi.mocked(createAdminClient).mockReturnValue(db as any);

    const { rejectRedemption } = await import("@/lib/ledger");
    await expect(rejectRedemption("missing")).rejects.toThrow("redemption not found");
  });

  it("no-ops when status is not 'requested'", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const redemptionsChain = mockChain({ data: { child_id: "c1", coin_cost: 30, status: "rejected" } });
    const coinsChain = mockChain({ data: null });
    const db = createMockDb({
      reward_redemptions: redemptionsChain,
      coin_transactions: coinsChain,
    });
    vi.mocked(createAdminClient).mockReturnValue(db as any);

    const { rejectRedemption } = await import("@/lib/ledger");
    await rejectRedemption("red-1");

    expect(redemptionsChain.update).not.toHaveBeenCalled();
    expect(coinsChain.insert).not.toHaveBeenCalled();
  });

  it("rejects and refunds coins when status is 'requested'", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const redemptionsChain = mockChain({ data: { child_id: "c1", coin_cost: 75, status: "requested" } });
    const coinsChain = mockChain({ data: null });
    const db = createMockDb({
      reward_redemptions: redemptionsChain,
      coin_transactions: coinsChain,
    });
    vi.mocked(createAdminClient).mockReturnValue(db as any);

    const { rejectRedemption } = await import("@/lib/ledger");
    await rejectRedemption("red-1", "Not available");

    // Verify rejection update
    expect(redemptionsChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "rejected",
        approved_by: "test-user-id",
      }),
    );

    // Verify coin refund inserted
    expect(coinsChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        child_id: "c1",
        amount: 75,
        transaction_type: "MANUAL_ADJUSTMENT",
        reference_id: "red-1",
      }),
    );
  });
});

describe("manualAdjustCoins (mocked DEV_BYPASS)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts a coin transaction with the given amount and reason", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const coinsChain = mockChain({ data: null });
    const db = createMockDb({ coin_transactions: coinsChain });
    vi.mocked(createAdminClient).mockReturnValue(db as any);

    const { manualAdjustCoins } = await import("@/lib/ledger");
    await manualAdjustCoins("child-1", 50, "Birthday bonus");

    expect(coinsChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        child_id: "child-1",
        amount: 50,
        transaction_type: "MANUAL_ADJUSTMENT",
        description: "Birthday bonus",
        created_by: "test-user-id",
      }),
    );
  });

  it("supports negative adjustments", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const coinsChain = mockChain({ data: null });
    const db = createMockDb({ coin_transactions: coinsChain });
    vi.mocked(createAdminClient).mockReturnValue(db as any);

    const { manualAdjustCoins } = await import("@/lib/ledger");
    await manualAdjustCoins("child-1", -20, "Correction");

    expect(coinsChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ amount: -20 }),
    );
  });
});
