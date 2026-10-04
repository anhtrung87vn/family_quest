/**
 * Family calendar time.
 *
 * "Today", due dates, weeks, streaks and recurrence are calendar concepts of
 * the family, not of the server. Servers (Vercel) run in UTC, which is 7 hours
 * behind Vietnam, so every calendar computation goes through this module
 * instead of Date#getDate()/getDay() or toISOString().slice(0, 10).
 * Pure Intl — safe on the server and in the browser.
 */
export const FAMILY_TIME_ZONE = "Asia/Bangkok";

// en-CA formats dates as YYYY-MM-DD.
const dateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: FAMILY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const partsFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: FAMILY_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

/** YYYY-MM-DD of the instant `at` in the family time zone. */
export function familyDateISO(at: Date = new Date()): string {
  return dateFormat.format(at);
}

/** Calendar arithmetic on YYYY-MM-DD strings (time-zone free). */
export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday for a YYYY-MM-DD date. */
export function weekdayOfISO(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

/** Weekday of the instant `at` on the family's calendar. */
export function familyWeekday(at: Date = new Date()): number {
  return weekdayOfISO(familyDateISO(at));
}

/** Monday of the week containing a YYYY-MM-DD date (weeks start on Monday). */
export function mondayOfISO(iso: string): string {
  return addDaysISO(iso, -((weekdayOfISO(iso) + 6) % 7));
}

/** Minutes the family zone is ahead of UTC at the instant `at`. */
function offsetMinutes(at: Date): number {
  const p: Record<string, string> = {};
  for (const { type, value } of partsFormat.formatToParts(at)) p[type] = value;
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** The instant of 00:00 on a YYYY-MM-DD date in the family time zone. */
export function familyDayStart(iso: string): Date {
  const utcMidnight = new Date(`${iso}T00:00:00Z`);
  return new Date(utcMidnight.getTime() - offsetMinutes(utcMidnight) * 60000);
}
