import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/dev-family", () => ({ DEV_BYPASS: false, DEV_USER_ID: "" }));

import {
  familyDateISO,
  familyWeekday,
  familyDayStart,
  addDaysISO,
  mondayOfISO,
  weekdayOfISO,
} from "@/lib/family-time";
import { dueOn } from "@/lib/recurrence";
import { ageFromDob } from "@/lib/age";
import { previousWeekRange } from "@/lib/responsibility-week";

// Instants are given in UTC so these tests mean the same thing on any server.
// Vietnam (Asia/Bangkok) is UTC+7 with no daylight saving.

describe("familyDateISO", () => {
  it("rolls over at midnight in Vietnam, not at UTC midnight", () => {
    // 22:00 UTC on Oct 3 = 05:00 on Oct 4 in Vietnam (when the daily cron runs)
    expect(familyDateISO(new Date("2026-10-03T22:00:00Z"))).toBe("2026-10-04");
    // 16:59 UTC = 23:59 Vietnam, still the same day
    expect(familyDateISO(new Date("2026-10-04T16:59:00Z"))).toBe("2026-10-04");
    expect(familyDateISO(new Date("2026-10-04T17:00:00Z"))).toBe("2026-10-05");
  });

  it("uses the family weekday", () => {
    // Sunday 20:00 UTC is already Monday 03:00 in Vietnam
    expect(familyWeekday(new Date("2026-10-04T20:00:00Z"))).toBe(1);
  });
});

describe("calendar arithmetic", () => {
  it("adds days across months and years", () => {
    expect(addDaysISO("2026-09-28", 6)).toBe("2026-10-04");
    expect(addDaysISO("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysISO("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("finds the Monday of a week (Sunday belongs to the week before)", () => {
    expect(weekdayOfISO("2026-10-04")).toBe(0);
    expect(mondayOfISO("2026-10-04")).toBe("2026-09-28");
    expect(mondayOfISO("2026-10-05")).toBe("2026-10-05");
  });

  it("returns the instant of local midnight", () => {
    expect(familyDayStart("2026-10-04").toISOString()).toBe("2026-10-03T17:00:00.000Z");
  });
});

describe("app logic uses the family calendar", () => {
  it("recurrence: a Monday-only task is due when it is Monday in Vietnam", () => {
    const mondayOnly = { freq: "weekly" as const, days: [1] };
    expect(dueOn(mondayOnly, new Date("2026-10-04T20:00:00Z"))).toBe(true); // Mon 03:00 VN
    expect(dueOn(mondayOnly, new Date("2026-10-04T10:00:00Z"))).toBe(false); // Sun 17:00 VN
  });

  it("age changes at local midnight on the birthday", () => {
    expect(ageFromDob("2018-07-25", new Date("2026-07-24T16:59:00Z"))).toBe(7);
    expect(ageFromDob("2018-07-25", new Date("2026-07-24T17:00:00Z"))).toBe(8);
  });

  it("previous responsibility week is Monday–Sunday on the family calendar", () => {
    // Sunday 20:00 UTC = Monday 03:00 VN → last week is Sep 28 – Oct 4
    expect(previousWeekRange(new Date("2026-10-04T20:00:00Z"))).toEqual({ monday: "2026-09-28", sunday: "2026-10-04" });
  });
});
