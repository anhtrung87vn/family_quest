/**
 * Age helpers shared by parent and child views.
 * Pure functions — safe to import from client components.
 */

/** Whole years between a date-of-birth (YYYY-MM-DD) and `today`, or null when unknown. */
export function ageFromDob(dob: string | null | undefined, today: Date = new Date()): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
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
