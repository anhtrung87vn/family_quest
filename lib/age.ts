/**
 * Age helpers shared by parent and child views.
 * Pure functions — safe to import from client components.
 */
import { familyDateISO } from "@/lib/family-time";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * Whole years between a date-of-birth (YYYY-MM-DD) and the family-calendar day
 * of `today`, or null when unknown. Birthdays roll over at local midnight.
 */
export function ageFromDob(dob: string | null | undefined, today: Date = new Date()): number | null {
  const b = dob ? ISO_DATE.exec(dob) : null;
  if (!b) return null;
  const t = ISO_DATE.exec(familyDateISO(today))!;
  const [by, bm, bd] = [+b[1], +b[2], +b[3]];
  const [ty, tm, td] = [+t[1], +t[2], +t[3]];
  if (bm < 1 || bm > 12 || bd < 1 || bd > 31) return null;
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age--;
  return age;
}

export interface AgeRange {
  min_age?: number | null;
  max_age?: number | null;
}

/**
 * True when `age` falls inside the item's [min_age, max_age] range.
 * A missing bound is open, and an unknown age sees everything — family-created
 * items and children without a birthday keep working as before.
 */
export function isAgeEligible(item: AgeRange, age: number | null): boolean {
  if (age == null) return true;
  if (item.min_age != null && age < item.min_age) return false;
  if (item.max_age != null && age > item.max_age) return false;
  return true;
}
