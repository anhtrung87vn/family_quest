import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/dev-family", () => ({ DEV_BYPASS: false, DEV_USER_ID: "" }));

import { responsibilityWeekStars, responsibilityWeekProgress, previousWeekRange, MIN_WEEKLY_RESPONSIBILITIES } from "@/lib/responsibility-week";

describe("responsibilityWeekStars", () => {
  it("needs enough responsibilities to judge a week", () => {
    expect(responsibilityWeekStars(MIN_WEEKLY_RESPONSIBILITIES - 1, MIN_WEEKLY_RESPONSIBILITIES - 1)).toBe(0);
  });

  it("gives 5 stars for 90%+ and 3 stars for 70%+", () => {
    expect(responsibilityWeekStars(10, 10)).toBe(5);
    expect(responsibilityWeekStars(10, 9)).toBe(5);
    expect(responsibilityWeekStars(10, 8)).toBe(3);
    expect(responsibilityWeekStars(10, 7)).toBe(3);
    expect(responsibilityWeekStars(10, 6)).toBe(0);
  });
});

describe("responsibilityWeekProgress", () => {
  it("tells how many more responsibilities reach the top tier", () => {
    expect(responsibilityWeekProgress(10, 8)).toEqual({ total: 10, done: 8, stars: 3, neededForTop: 1 });
    expect(responsibilityWeekProgress(10, 9)).toEqual({ total: 10, done: 9, stars: 5, neededForTop: 0 });
  });

  it("does not promise stars before the week has enough responsibilities", () => {
    expect(responsibilityWeekProgress(3, 3)).toEqual({ total: 3, done: 3, stars: 0, neededForTop: 0 });
  });
});

describe("previousWeekRange", () => {
  it("returns last Monday–Sunday for any day of the current week", () => {
    // 2026-10-04 is a Sunday → previous week is 2026-09-21..2026-09-27
    expect(previousWeekRange(new Date(2026, 9, 4))).toEqual({ monday: "2026-09-21", sunday: "2026-09-27" });
    // 2026-10-05 is a Monday → previous week is 2026-09-28..2026-10-04
    expect(previousWeekRange(new Date(2026, 9, 5))).toEqual({ monday: "2026-09-28", sunday: "2026-10-04" });
    expect(previousWeekRange(new Date(2026, 9, 10))).toEqual({ monday: "2026-09-28", sunday: "2026-10-04" });
  });
});
