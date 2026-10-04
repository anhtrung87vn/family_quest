---
phase: 7
title: "Testing + Regression"
status: pending
priority: P1
effort: "4h"
dependencies: [1, 2, 3, 4, 5, 6]
---

# Phase 7: Testing + Regression

## Overview

Comprehensive unit, integration, and regression testing for the responsibility/repair system. Verify all new behavior, enforce invariants (no penalty economy), and confirm existing quest/reward/evidence/approval flows are unaffected.

## Requirements

- Functional:
  - Unit tests for:
    - `responsibility_policy` validation
    - `event_type` validation
    - Status transitions (OPEN -> RESOLVED, OPEN -> CANCELLED)
    - Repair idempotency (resolving already-resolved event)
    - No reward transaction from repair
    - Forgetting analysis threshold logic
    - Independence trend calculation
  - Authorization tests:
    - Child A cannot resolve child B's event
    - Family A cannot access family B events
    - Child cannot mark own event EXCUSED
    - Child cannot mark own event REFUSED
    - Child can only resolve FORGOTTEN and NEEDED_HELP events
  - Integration tests:
    - Forgot -> Repair -> Resolved flow
    - Needed Help -> Parent support flow
    - Excused -> no repair required
    - Refused -> Parent consequence guidance
    - Repeated Forgetting -> Habit suggestion
    - Start Habit Support -> task transitions to habit_building
  - Regression tests:
    - Quest completion still works
    - Parent approval still awards coins/stars
    - Quest Coins unchanged
    - Stars unchanged
    - Reward redemption works
    - Evidence submission works
    - Parent messages work
    - Quest Pool works
    - System Quest Library clone works
    - Habit graduation works
    - Streak recording works
- Non-functional:
  - Use Vitest (project test framework)
  - Follow existing test patterns in `tests/` directory
  - Tests should be runnable without a live database (mock Supabase calls)

## Architecture

### Test File Structure

```
tests/
  responsibility-policy.test.ts    — schema validation tests
  responsibility-events.test.ts    — event lifecycle tests
  repair-idempotency.test.ts       — idempotency tests
  forgetting-analysis.test.ts      — threshold detection tests
  independence-trend.test.ts       — analytics calculation tests
  responsibility-auth.test.ts      — authorization boundary tests
```

### Test Patterns

Follow existing test patterns from `tests/`:
- Import functions directly from `lib/` modules
- Mock `createAdminClient()` and `resolveContext()` where needed
- Use `describe/it/expect` structure
- Test pure functions directly; test server actions by mocking DB responses

### Key Test Scenarios

#### 1. Repair Idempotency

```typescript
describe("resolveRepairAction", () => {
  it("resolves an OPEN FORGOTTEN event", async () => {
    // Setup: create OPEN FORGOTTEN event
    // Act: call resolveRepairAction
    // Assert: event status = RESOLVED, resolved_at set
  });

  it("is idempotent - resolving already-resolved event is no-op", async () => {
    // Setup: create RESOLVED event
    // Act: call resolveRepairAction
    // Assert: no error, event still RESOLVED, no duplicate rows
  });

  it("does NOT create coin transaction on repair", async () => {
    // Setup: create OPEN FORGOTTEN event
    // Act: resolve it
    // Assert: no new coin_transactions rows
  });

  it("does NOT create star transaction on repair", async () => {
    // Setup: create OPEN FORGOTTEN event
    // Act: resolve it
    // Assert: no new star_transactions rows
  });
});
```

#### 2. No Penalty Economy

```typescript
describe("penalty invariants", () => {
  it("handleMissedResponsibility never creates negative coin transaction", async () => {
    // For each reason: forgot, needed_help, excused, refused, skip
    // Assert: no coin_transactions with negative amount created
  });

  it("handleMissedResponsibility never creates negative star transaction", async () => {
    // For each reason
    // Assert: no star_transactions with negative amount created
  });

  it("existing coins are unchanged after responsibility event", async () => {
    // Setup: child has 100 coins
    // Act: create FORGOTTEN event
    // Assert: child still has 100 coins
  });

  it("existing stars are unchanged after responsibility event", async () => {
    // Setup: child has 50 stars
    // Act: create REFUSED event
    // Assert: child still has 50 stars
  });
});
```

#### 3. Authorization Boundaries

```typescript
describe("authorization", () => {
  it("child cannot resolve another child's event", async () => {
    // Setup: event for child A, session for child B
    // Act: attempt resolve
    // Assert: error thrown
  });

  it("child cannot resolve REFUSED events", async () => {
    // Setup: REFUSED event for child
    // Act: attempt resolve
    // Assert: error thrown
  });

  it("child cannot mark event as EXCUSED", async () => {
    // Setup: open event
    // Act: attempt to change event_type to EXCUSED
    // Assert: error thrown (only parent can classify)
  });

  it("parent from family B cannot access family A events", async () => {
    // Setup: event in family A
    // Act: parent from family B attempts access
    // Assert: empty result or error
  });
});
```

#### 4. Forgetting Analysis

```typescript
describe("getResponsibilitySummary", () => {
  it("suggests habit support when threshold reached", async () => {
    // Setup: 3 FORGOTTEN events for same task in 7 days
    // Assert: suggestHabitSupport = true
  });

  it("does not suggest when below threshold", async () => {
    // Setup: 2 FORGOTTEN events for same task in 7 days
    // Assert: suggestHabitSupport = false
  });

  it("does not suggest for already habit_building tasks", async () => {
    // Setup: 5 FORGOTTEN events but task is habit_building
    // Assert: suggestHabitSupport = false (already in habit mode)
  });

  it("counts independent completions correctly", async () => {
    // Setup: 5 approved assignments, 2 with FORGOTTEN events
    // Assert: independentCount = 3
  });
});
```

#### 5. Regression Suite

```typescript
describe("regression - existing flows", () => {
  it("task completion still awards coins", async () => {
    // Existing flow: submit -> approve -> verify coins
  });

  it("task completion still awards stars", async () => {
    // Existing flow: submit -> approve -> verify stars
  });

  it("responsibility task completion awards 0 coins (graduated)", async () => {
    // Existing behavior: responsibility tasks default to graduated
  });

  it("reward redemption still works", async () => {
    // Existing flow: request -> approve -> coins deducted
  });

  it("habit graduation still works", async () => {
    // Existing flow: full_reward -> reduced -> stars_only -> graduated
  });

  it("streak recording still works", async () => {
    // Existing flow: complete task -> streak incremented
  });
});
```

## Related Code Files

- Create: `tests/responsibility-policy.test.ts`
- Create: `tests/responsibility-events.test.ts`
- Create: `tests/repair-idempotency.test.ts`
- Create: `tests/forgetting-analysis.test.ts`
- Create: `tests/independence-trend.test.ts`
- Create: `tests/responsibility-auth.test.ts`
- Verify: `tests/` existing test files still pass

## Implementation Steps

1. Create `tests/responsibility-policy.test.ts` — validate Zod schemas and policy values
2. Create `tests/responsibility-events.test.ts` — test event creation and status transitions
3. Create `tests/repair-idempotency.test.ts` — test double-tap safety
4. Create `tests/forgetting-analysis.test.ts` — test threshold logic with mock data
5. Create `tests/independence-trend.test.ts` — test trend calculation functions
6. Create `tests/responsibility-auth.test.ts` — test authorization boundaries
7. Run existing test suite to verify no regressions
8. Run `pnpm vitest` to verify all tests pass
9. Fix any test failures discovered

## Success Criteria

- [ ] All new test files pass (`pnpm vitest`)
- [ ] Repair idempotency verified
- [ ] No-penalty invariant verified (no negative coin/star transactions from responsibility events)
- [ ] Authorization boundaries verified
- [ ] Forgetting analysis threshold logic verified
- [ ] Independence trend calculation verified
- [ ] All existing tests still pass (no regressions)
- [ ] Test coverage includes: happy path, edge cases, authorization, idempotency

## Risk Assessment

- **Risk**: Mocking Supabase calls may not catch real DB-level issues (RLS, constraints). **Mitigation**: For critical paths (RLS, constraint violations), also test against a local Supabase instance in a separate integration test suite. Unit tests verify logic; integration tests verify DB behavior.
- **Risk**: Test setup complexity for server actions that depend on sessions. **Mitigation**: Extract pure logic into `lib/responsibility.ts` functions that can be tested independently. Server actions are thin wrappers around these functions.
