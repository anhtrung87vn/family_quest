import { describe, it, expect } from "vitest";
import { parseRule, dueOn, ruleLabel } from "@/lib/recurrence";

describe("parseRule", () => {
  it("returns null for null/undefined/empty", () => {
    expect(parseRule(null)).toBeNull();
    expect(parseRule(undefined)).toBeNull();
    expect(parseRule("")).toBeNull();
  });

  it("parses daily rule", () => {
    expect(parseRule('{"freq":"daily"}')).toEqual({ freq: "daily" });
  });

  it("parses weekdays rule", () => {
    expect(parseRule('{"freq":"weekdays"}')).toEqual({ freq: "weekdays" });
  });

  it("parses weekly rule with days", () => {
    expect(parseRule('{"freq":"weekly","days":[1,3,5]}')).toEqual({
      freq: "weekly",
      days: [1, 3, 5],
    });
  });

  it("returns null for invalid JSON", () => {
    expect(parseRule("not json")).toBeNull();
  });

  it("returns null for unknown freq", () => {
    expect(parseRule('{"freq":"monthly"}')).toBeNull();
  });

  it("returns null for weekly without days array", () => {
    expect(parseRule('{"freq":"weekly"}')).toBeNull();
  });
});

describe("dueOn", () => {
  // 2024-01-15 is a Monday (dow=1)
  const monday = new Date(2024, 0, 15);
  // 2024-01-14 is a Sunday (dow=0)
  const sunday = new Date(2024, 0, 14);
  // 2024-01-20 is a Saturday (dow=6)
  const saturday = new Date(2024, 0, 20);

  it("daily is always due", () => {
    expect(dueOn({ freq: "daily" }, monday)).toBe(true);
    expect(dueOn({ freq: "daily" }, sunday)).toBe(true);
    expect(dueOn({ freq: "daily" }, saturday)).toBe(true);
  });

  it("weekdays = Mon-Fri", () => {
    expect(dueOn({ freq: "weekdays" }, monday)).toBe(true);
    expect(dueOn({ freq: "weekdays" }, sunday)).toBe(false);
    expect(dueOn({ freq: "weekdays" }, saturday)).toBe(false);
  });

  it("weekly matches specified days", () => {
    const rule = { freq: "weekly" as const, days: [1, 3, 5] }; // Mon, Wed, Fri
    expect(dueOn(rule, monday)).toBe(true);   // Mon
    expect(dueOn(rule, sunday)).toBe(false);   // Sun
    expect(dueOn(rule, saturday)).toBe(false); // Sat
  });
});

describe("ruleLabel", () => {
  it("labels daily", () => {
    expect(ruleLabel({ freq: "daily" })).toBe("Daily");
  });

  it("labels weekdays", () => {
    expect(ruleLabel({ freq: "weekdays" })).toBe("Weekdays");
  });

  it("labels weekly with day names", () => {
    expect(ruleLabel({ freq: "weekly", days: [1, 3, 5] })).toBe("Mon, Wed, Fri");
  });

  it("labels weekly with all days", () => {
    expect(ruleLabel({ freq: "weekly", days: [0, 1, 2, 3, 4, 5, 6] })).toBe(
      "Sun, Mon, Tue, Wed, Thu, Fri, Sat",
    );
  });
});
