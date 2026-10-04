import { describe, it, expect } from "vitest";
import { ageFromDob, isAgeEligible } from "@/lib/age";

describe("ageFromDob", () => {
  const today = new Date(2026, 9, 4); // 2026-10-04

  it("returns null when the birthday is missing or invalid", () => {
    expect(ageFromDob(null, today)).toBeNull();
    expect(ageFromDob(undefined, today)).toBeNull();
    expect(ageFromDob("not-a-date", today)).toBeNull();
  });

  it("counts whole years once the birthday has passed", () => {
    expect(ageFromDob("2018-03-15", today)).toBe(8);
    expect(ageFromDob("2015-10-04", today)).toBe(11);
  });

  it("does not count the year before the birthday", () => {
    expect(ageFromDob("2015-10-05", today)).toBe(10);
    expect(ageFromDob("2018-12-31", today)).toBe(7);
  });
});

describe("isAgeEligible", () => {
  it("accepts ages inside the inclusive range", () => {
    expect(isAgeEligible({ min_age: 6, max_age: 9 }, 6)).toBe(true);
    expect(isAgeEligible({ min_age: 6, max_age: 9 }, 9)).toBe(true);
  });

  it("rejects ages outside the range", () => {
    expect(isAgeEligible({ min_age: 6, max_age: 9 }, 5)).toBe(false);
    expect(isAgeEligible({ min_age: 6, max_age: 9 }, 10)).toBe(false);
  });

  it("treats missing bounds as open", () => {
    expect(isAgeEligible({ min_age: null, max_age: 9 }, 4)).toBe(true);
    expect(isAgeEligible({ min_age: 12, max_age: null }, 17)).toBe(true);
    expect(isAgeEligible({}, 11)).toBe(true);
  });

  it("shows everything when the child's age is unknown", () => {
    expect(isAgeEligible({ min_age: 15, max_age: 17 }, null)).toBe(true);
  });
});
