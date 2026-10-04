/**
 * Which family tasks fit none of the family's children by age.
 * Pure functions — safe to import from server actions and client components.
 */
import { isAgeEligible, type AgeRange } from "@/lib/age";

/**
 * True when the out-of-age check can be trusted: there is at least one child
 * and every child has a known age. Otherwise nothing is flagged.
 */
export function allAgesKnown(ages: readonly (number | null)[]): ages is number[] {
  return ages.length > 0 && ages.every((a) => a != null);
}

/**
 * Tasks whose [min_age, max_age] range includes no child's age.
 * Returns an empty list when there are no children or any child's age is unknown.
 */
export function tasksFittingNoChild<T extends AgeRange>(
  tasks: readonly T[],
  ages: readonly (number | null)[],
): T[] {
  if (!allAgesKnown(ages)) return [];
  return tasks.filter((task) => !ages.some((age) => isAgeEligible(task, age)));
}
