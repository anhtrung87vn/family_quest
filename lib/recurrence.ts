// Recurrence handling — MVP subset.
// Rule format (JSON string stored in tasks.recurrence_rule):
//   { "freq": "daily" }
//   { "freq": "weekly", "days": [1,2,3,4,5] }  // 0=Sun..6=Sat
//   { "freq": "weekdays" }                     // shorthand
//
// dueOn(rule, date) => boolean

export type RecurrenceRule =
  | { freq: "daily" }
  | { freq: "weekly"; days: number[] }
  | { freq: "weekdays" };

export function parseRule(raw: string | null | undefined): RecurrenceRule | null {
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as RecurrenceRule;
    if (r.freq === "daily") return r;
    if (r.freq === "weekdays") return r;
    if (r.freq === "weekly" && Array.isArray(r.days)) return r;
    return null;
  } catch {
    return null;
  }
}

export function dueOn(rule: RecurrenceRule, date: Date): boolean {
  const dow = date.getDay(); // 0..6
  if (rule.freq === "daily") return true;
  if (rule.freq === "weekdays") return dow >= 1 && dow <= 5;
  if (rule.freq === "weekly") return rule.days.includes(dow);
  return false;
}

export function ruleLabel(rule: RecurrenceRule): string {
  if (rule.freq === "daily") return "Daily";
  if (rule.freq === "weekdays") return "Weekdays";
  if (rule.freq === "weekly") {
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return rule.days.map((d) => names[d]).join(", ");
  }
  return "";
}

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
