import { describe, it, expect } from "vitest";
import en from "@/messages/en.json";
import vi from "@/messages/vi.json";

describe("responsibility i18n completeness", () => {
  const parentKeys = [
    "handleMissed",
    "whatHappened",
    "reasonForgot",
    "reasonNeededHelp",
    "reasonExcused",
    "reasonRefused",
    "reasonSkip",
    "parentNote",
    "handleSubmit",
    "responsibilityHandled",
    "missedResponsibilities",
    "responsibilityPolicy",
    "policyRepairRequired",
    "policyCompleteBeforePrivilege",
    "policyParentDecides",
    "policyNone",
    "habitSuggestion",
    "startHabitBuilding",
    "dismissSuggestion",
    "makeResponsibility",
    "growingIndependence",
    "independentDays",
    "remindersThisWeek",
    "repairsCompleted",
    "fewerReminders",
    "moreReminders",
    "sameReminders",
    "mayNeedSupport",
    "daysIndependent",
    "habitsGraduated",
    "independenceTitle",
    "independenceDesc",
    "independenceEmpty",
  ];

  const childKeys = [
    "repairSection",
    "repairPrompt",
    "repairDone",
    "repairResolved",
  ];

  it("all parent responsibility keys exist in en.json", () => {
    const parentEn = (en as unknown as Record<string, Record<string, string>>).parent;
    for (const key of parentKeys) {
      expect(parentEn).toHaveProperty(key);
      expect(parentEn[key]).toBeTruthy();
    }
  });

  it("all parent responsibility keys exist in vi.json", () => {
    const parentVi = (vi as unknown as Record<string, Record<string, string>>).parent;
    for (const key of parentKeys) {
      expect(parentVi).toHaveProperty(key);
      expect(parentVi[key]).toBeTruthy();
    }
  });

  it("all child repair keys exist in en.json", () => {
    const childEn = (en as unknown as Record<string, Record<string, string>>).child;
    for (const key of childKeys) {
      expect(childEn).toHaveProperty(key);
      expect(childEn[key]).toBeTruthy();
    }
  });

  it("all child repair keys exist in vi.json", () => {
    const childVi = (vi as unknown as Record<string, Record<string, string>>).child;
    for (const key of childKeys) {
      expect(childVi).toHaveProperty(key);
      expect(childVi[key]).toBeTruthy();
    }
  });

  it("habitSuggestion contains {child} and {task} placeholders", () => {
    const parentEn = (en as unknown as Record<string, Record<string, string>>).parent;
    expect(parentEn.habitSuggestion).toContain("{child}");
    expect(parentEn.habitSuggestion).toContain("{task}");
  });

  it("Vietnamese habitSuggestion contains {child} and {task} placeholders", () => {
    const parentVi = (vi as unknown as Record<string, Record<string, string>>).parent;
    expect(parentVi.habitSuggestion).toContain("{child}");
    expect(parentVi.habitSuggestion).toContain("{task}");
  });

  it("child repair strings use supportive language (not punitive)", () => {
    const childEn = (en as unknown as Record<string, Record<string, string>>).child;
    // Should say "Things to fix" not "Violations" or "Penalties"
    expect(childEn.repairSection.toLowerCase()).not.toContain("violation");
    expect(childEn.repairSection.toLowerCase()).not.toContain("penalty");
    expect(childEn.repairSection.toLowerCase()).not.toContain("punishment");
  });
});

describe("common i18n completeness", () => {
  const requiredCommonKeys = ["appName", "coins", "stars", "save", "cancel", "back", "loading", "all"];

  it("all required common keys exist in en.json", () => {
    const commonEn = (en as unknown as Record<string, Record<string, string>>).common;
    for (const key of requiredCommonKeys) {
      expect(commonEn, `missing common.${key} in en.json`).toHaveProperty(key);
      expect(commonEn[key]).toBeTruthy();
    }
  });

  it("all required common keys exist in vi.json", () => {
    const commonVi = (vi as unknown as Record<string, Record<string, string>>).common;
    for (const key of requiredCommonKeys) {
      expect(commonVi, `missing common.${key} in vi.json`).toHaveProperty(key);
      expect(commonVi[key]).toBeTruthy();
    }
  });
});
