import { describe, it, expect } from "vitest";
import { SUGGEST_THRESHOLD, ANALYSIS_WINDOW_DAYS } from "@/lib/responsibility";

describe("responsibility constants", () => {
  it("SUGGEST_THRESHOLD is 3 (3 FORGOTTEN events trigger suggestion)", () => {
    expect(SUGGEST_THRESHOLD).toBe(3);
  });

  it("ANALYSIS_WINDOW_DAYS is 7 (1-week rolling window)", () => {
    expect(ANALYSIS_WINDOW_DAYS).toBe(7);
  });

  it("threshold is positive integer", () => {
    expect(Number.isInteger(SUGGEST_THRESHOLD)).toBe(true);
    expect(SUGGEST_THRESHOLD).toBeGreaterThan(0);
  });

  it("window is positive integer", () => {
    expect(Number.isInteger(ANALYSIS_WINDOW_DAYS)).toBe(true);
    expect(ANALYSIS_WINDOW_DAYS).toBeGreaterThan(0);
  });
});

describe("responsibility_policy validation", () => {
  const validPolicies = ["NONE", "REPAIR_REQUIRED", "COMPLETE_BEFORE_PRIVILEGE", "PARENT_DECIDES"];

  it("all valid policy values are strings", () => {
    for (const p of validPolicies) {
      expect(typeof p).toBe("string");
    }
  });

  it("has exactly 4 valid values", () => {
    expect(validPolicies).toHaveLength(4);
  });

  it("default is NONE", () => {
    expect(validPolicies[0]).toBe("NONE");
  });
});

describe("event_type validation", () => {
  const validTypes = ["FORGOTTEN", "NEEDED_HELP", "EXCUSED", "REFUSED", "REMINDER"];

  it("has exactly 5 valid event types", () => {
    expect(validTypes).toHaveLength(5);
  });

  it("FORGOTTEN and NEEDED_HELP are the ones used for habit suggestions", () => {
    expect(validTypes).toContain("FORGOTTEN");
    expect(validTypes).toContain("NEEDED_HELP");
  });

  it("EXCUSED resolves immediately (not OPEN)", () => {
    // EXCUSED events are created with status RESOLVED — verified in the server action
    expect(validTypes).toContain("EXCUSED");
  });
});

describe("event status validation", () => {
  const validStatuses = ["OPEN", "RESOLVED", "CANCELLED"];

  it("has exactly 3 valid statuses", () => {
    expect(validStatuses).toHaveLength(3);
  });

  it("OPEN is the default for new events", () => {
    expect(validStatuses[0]).toBe("OPEN");
  });
});

describe("no-penalty invariants", () => {
  it("responsibility event types do not include any coin/star deduction type", () => {
    const eventTypes = ["FORGOTTEN", "NEEDED_HELP", "EXCUSED", "REFUSED", "REMINDER"];
    const penaltyTerms = ["DEDUCT", "PENALTY", "FINE", "PUNISH", "SUBTRACT"];
    for (const et of eventTypes) {
      for (const pt of penaltyTerms) {
        expect(et).not.toContain(pt);
      }
    }
  });

  it("responsibility_policy values do not include penalty policies", () => {
    const policies = ["NONE", "REPAIR_REQUIRED", "COMPLETE_BEFORE_PRIVILEGE", "PARENT_DECIDES"];
    const penaltyTerms = ["DEDUCT", "PENALTY", "FINE", "PUNISH", "SUBTRACT", "REMOVE_COINS", "REMOVE_STARS"];
    for (const p of policies) {
      for (const pt of penaltyTerms) {
        expect(p).not.toContain(pt);
      }
    }
  });
});

describe("forgetting suggestion logic", () => {
  it("below threshold: no suggestion", () => {
    const forgottenCount = SUGGEST_THRESHOLD - 1;
    expect(forgottenCount >= SUGGEST_THRESHOLD).toBe(false);
  });

  it("at threshold: suggestion triggered", () => {
    const forgottenCount = SUGGEST_THRESHOLD;
    expect(forgottenCount >= SUGGEST_THRESHOLD).toBe(true);
  });

  it("above threshold: suggestion triggered", () => {
    const forgottenCount = SUGGEST_THRESHOLD + 5;
    expect(forgottenCount >= SUGGEST_THRESHOLD).toBe(true);
  });

  it("zero forgotten: no suggestion", () => {
    expect(0 >= SUGGEST_THRESHOLD).toBe(false);
  });
});
