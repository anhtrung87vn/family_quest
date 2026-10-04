/**
 * Rule-based Recommendation Engine for System Quest Templates
 *
 * Deterministic scoring:
 * 1. Age proximity — recommended_age closest to child's age scores highest
 * 2. Domain diversity — prefer domains not practiced recently
 * 3. Recency — avoid templates completed very recently
 * 4. Independence fit — prefer matching independence level for the child's age
 * 5. Variety — spread across behavior types
 *
 * No ML, no sibling comparison, no black-box scoring.
 */

export interface TemplateRow {
  id: string;
  name: string;
  skill_domain: string | null;
  behavior_type: string | null;
  recommended_age: number | null;
  min_age: number | null;
  max_age: number | null;
  independence_level: string | null;
  difficulty: number | null;
  availability_type: string | null;
  coin_reward: number;
  star_reward: number;
}

export interface RecentCompletion {
  task_name: string;
  skill_domain: string | null;
  completed_at: string;
}

export interface RankedTemplate extends TemplateRow {
  score: number;
  reasons: string[];
}

interface Options {
  childAge: number;
  recentCompletions: RecentCompletion[];
  activeTaskNames: Set<string>;
  /** Max results to return */
  limit?: number;
}

/**
 * Compute expected independence level for a given age.
 */
function expectedIndependence(age: number): string {
  if (age <= 8) return "GUIDED";
  if (age <= 11) return "SUPPORTED";
  return "INDEPENDENT";
}

/**
 * Count how many recent completions are in each domain.
 */
function domainCounts(completions: RecentCompletion[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const c of completions) {
    const d = c.skill_domain || "UNKNOWN";
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  return counts;
}

/**
 * Count how many recent completions are in each behavior type.
 * (Uses task names matched against templates — simplified approach)
 */
function recentTaskNames(completions: RecentCompletion[]): Set<string> {
  return new Set(completions.map((c) => c.task_name));
}

/**
 * Days since a date string (ISO).
 */
function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * Rank system templates for a given child.
 *
 * Scoring (higher = more recommended):
 *   +30  perfect recommended_age match
 *   +25  age within 1 year of recommended
 *   +15  age within 2 years of recommended
 *   +20  domain not practiced in recent completions
 *   +10  domain practiced ≤ 1 time recently
 *   -20  domain practiced ≥ 4 times recently
 *   +10  independence level matches expected for age
 *   -5   independence level is one step off
 *   +5   not recently completed (or never)
 *   -30  completed within last 3 days
 *   -15  completed within last 7 days
 *   -999 already an active task (filtered out)
 */
export function rankTemplates(
  templates: TemplateRow[],
  options: Options
): RankedTemplate[] {
  const { childAge, recentCompletions, activeTaskNames, limit = 20 } = options;
  const domainMap = domainCounts(recentCompletions);
  const recentNames = recentTaskNames(recentCompletions);
  const expectedLevel = expectedIndependence(childAge);

  // Map recent completions to recency by task name
  const lastCompletedMap = new Map<string, string>();
  for (const c of recentCompletions) {
    const existing = lastCompletedMap.get(c.task_name);
    if (!existing || c.completed_at > existing) {
      lastCompletedMap.set(c.task_name, c.completed_at);
    }
  }

  const ranked: RankedTemplate[] = [];

  for (const tpl of templates) {
    // Hard filter: skip if already active in family
    if (activeTaskNames.has(tpl.name)) continue;

    // Hard filter: skip if outside age range (with buffer)
    const minAge = tpl.min_age ?? 4;
    const maxAge = tpl.max_age ?? 21;
    if (childAge < minAge - 1 || childAge > maxAge + 1) continue;

    let score = 0;
    const reasons: string[] = [];

    // 1. Age proximity scoring
    const recAge = tpl.recommended_age ?? (minAge + maxAge) / 2;
    const ageDiff = Math.abs(childAge - recAge);
    if (ageDiff === 0) {
      score += 30;
      reasons.push("Perfect age match");
    } else if (ageDiff <= 1) {
      score += 25;
      reasons.push("Close age match");
    } else if (ageDiff <= 2) {
      score += 15;
      reasons.push("Within age range");
    } else {
      score += 5;
    }

    // 2. Domain diversity scoring
    const domain = tpl.skill_domain || "UNKNOWN";
    const domainCount = domainMap.get(domain) ?? 0;
    if (domainCount === 0) {
      score += 20;
      reasons.push(`New domain: ${domain}`);
    } else if (domainCount <= 1) {
      score += 10;
    } else if (domainCount >= 4) {
      score -= 20;
      reasons.push(`${domain} practiced often recently`);
    }

    // 3. Recency scoring
    const lastCompleted = lastCompletedMap.get(tpl.name);
    if (lastCompleted) {
      const days = daysSince(lastCompleted);
      if (days <= 3) {
        score -= 30;
        reasons.push("Completed very recently");
      } else if (days <= 7) {
        score -= 15;
        reasons.push("Completed this week");
      } else {
        score += 5;
      }
    } else {
      score += 5;
      reasons.push("Not yet tried");
    }

    // 4. Independence fit
    const level = tpl.independence_level || "GUIDED";
    if (level === expectedLevel) {
      score += 10;
      reasons.push("Independence level matches age");
    } else {
      const levels = ["GUIDED", "SUPPORTED", "INDEPENDENT"];
      const diff = Math.abs(levels.indexOf(level) - levels.indexOf(expectedLevel));
      if (diff === 1) score -= 5;
      // More than 1 step off — no extra penalty, just no bonus
    }

    // 5. Behavior type variety bonus — give slight preference to challenges for pool
    if (tpl.behavior_type === "challenge" && (tpl.availability_type === "choice_pool" || tpl.availability_type === "both")) {
      score += 5;
    }

    ranked.push({ ...tpl, score, reasons });
  }

  // Sort by score descending, then by recommended_age ascending for tie-breaking
  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.recommended_age ?? 0) - (b.recommended_age ?? 0);
  });

  return ranked.slice(0, limit);
}

/**
 * Get the recommended pool size for a child based on age.
 * From the curriculum doc §18.
 */
export function poolSizeForAge(age: number): number {
  if (age <= 8) return 4;
  if (age <= 10) return 5;
  if (age <= 12) return 6;
  if (age <= 14) return 7;
  return 8; // 15+
}
