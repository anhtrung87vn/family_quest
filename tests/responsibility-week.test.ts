import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/dev-family", () => ({ DEV_BYPASS: false, DEV_USER_ID: "" }));

import { responsibilityWeekStars, previousWeekRange, MIN_WEEKLY_RESPONSIBILITIES } from "@/lib/responsibility-week";

describe("responsibilityWeekStars", () => {
  it("needs enough responsibilities to judge a week", () => {
    expect(responsibilityWeekStars(MIN_WEEKLY_RESPONSIBILITIES - 1, MIN_WEEKLY_RESPONSIBILITIES - 1)).toBe(0);
  });

  it("gives 2 stars for 90%+ and 1 star for 70%+", () => {
    expect(responsibilityWeekStars(10, 10)).toBe(2);
    expect(responsibilityWeekStars(10, 9)).toBe(2);
    expect(responsibilityWeekStars(10, 8)).toBe(1);
    expect(responsibilityWeekStars(10, 7)).toBe(1);
    expect(responsibilityWeekStars(10, 6)).toBe(0);
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
