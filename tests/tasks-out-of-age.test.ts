import { describe, it, expect } from "vitest";
import { allAgesKnown, tasksFittingNoChild } from "@/lib/task-age-fit";

const tasks = [
  { id: "cv", min_age: 15, max_age: 18 },
  { id: "lead", min_age: 16, max_age: 18 },
  { id: "dishes", min_age: 7, max_age: 12 },
  { id: "teen-ish", min_age: 11, max_age: 14 },
  { id: "open", min_age: null, max_age: null },
  { id: "little", min_age: 4, max_age: 6 },
];

describe("allAgesKnown", () => {
  it("is false with no children", () => {
    expect(allAgesKnown([])).toBe(false);
  });

  it("is false when any age is unknown", () => {
    expect(allAgesKnown([8, null])).toBe(false);
  });

  it("is true when every age is known", () => {
    expect(allAgesKnown([8, 11])).toBe(true);
  });
});

describe("tasksFittingNoChild", () => {
  it("flags tasks whose age range includes no child", () => {
    const ids = tasksFittingNoChild(tasks, [8, 11]).map((t) => t.id);
    expect(ids).toEqual(["cv", "lead", "little"]);
  });

  it("keeps a task when at least one child fits", () => {
    const ids = tasksFittingNoChild(tasks, [8, 11]).map((t) => t.id);
    expect(ids).not.toContain("teen-ish");
    expect(ids).not.toContain("dishes");
  });

  it("never flags tasks without age bounds", () => {
    expect(tasksFittingNoChild([{ min_age: null, max_age: null }], [30])).toEqual([]);
  });

  it("flags nothing when there are no children", () => {
    expect(tasksFittingNoChild(tasks, [])).toEqual([]);
  });

  it("flags nothing when any child has an unknown age", () => {
    expect(tasksFittingNoChild(tasks, [8, null])).toEqual([]);
  });
});
