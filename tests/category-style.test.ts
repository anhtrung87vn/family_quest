import { describe, it, expect } from "vitest";
import { taskStyle, rewardStyle, rewardIcon, levelIcon } from "@/lib/category-style";

describe("taskStyle", () => {
  it("returns learning style for 'learning'", () => {
    const s = taskStyle("learning");
    expect(s.icon).toBe("📚");
    expect(s.bg).toContain("blue");
  });

  it("returns responsibility style", () => {
    const s = taskStyle("responsibility");
    expect(s.icon).toBe("🌱");
    expect(s.bg).toContain("emerald");
  });

  it("returns family style", () => {
    const s = taskStyle("family");
    expect(s.icon).toBe("❤️");
    expect(s.bg).toContain("pink");
  });

  it("returns health style with orange", () => {
    const s = taskStyle("health");
    expect(s.icon).toBe("🏃");
    expect(s.bg).toContain("orange");
  });

  it("returns creativity style with purple", () => {
    const s = taskStyle("creativity");
    expect(s.icon).toBe("🎨");
    expect(s.bg).toContain("purple");
  });

  it("falls back to learning for null/undefined/unknown", () => {
    expect(taskStyle(null).icon).toBe("📚");
    expect(taskStyle(undefined).icon).toBe("📚");
    expect(taskStyle("unknown_cat").icon).toBe("📚");
  });
});

describe("rewardStyle", () => {
  it("returns styles for all categories", () => {
    expect(rewardStyle("small").bg).toContain("amber");
    expect(rewardStyle("medium").bg).toContain("orange");
    expect(rewardStyle("large").icon).toBe("🏆");
    expect(rewardStyle("experience").icon).toBe("✨");
    expect(rewardStyle("dream").icon).toBe("🌈");
  });

  it("falls back to small for unknown", () => {
    expect(rewardStyle(null).bg).toContain("amber");
    expect(rewardStyle("invalid").bg).toContain("amber");
  });
});

describe("rewardIcon", () => {
  it("maps screen-related rewards", () => {
    expect(rewardIcon("30 min screen time")).toBe("📺");
    expect(rewardIcon("Watch TV")).toBe("📺");
    expect(rewardIcon("YouTube time")).toBe("📺");
  });

  it("maps food rewards", () => {
    expect(rewardIcon("Ice Cream")).toBe("🍦");
    expect(rewardIcon("Pick dinner")).toBe("🍕");
    expect(rewardIcon("Favorite snack")).toBe("🍪");
    expect(rewardIcon("Chocolate bar")).toBe("🍫");
  });

  it("maps entertainment rewards", () => {
    expect(rewardIcon("Movie night")).toBe("🎬");
    expect(rewardIcon("Game time")).toBe("🎮");
  });

  it("maps physical rewards", () => {
    expect(rewardIcon("New Bicycle")).toBe("🚲");
    expect(rewardIcon("LEGO set")).toBe("🧱");
    expect(rewardIcon("New book")).toBe("📚");
  });

  it("maps stay up late", () => {
    expect(rewardIcon("Stay up 30 min")).toBe("🌙");
  });

  it("maps Vietnamese names", () => {
    expect(rewardIcon("Kem")).toBe("🍦");
    expect(rewardIcon("Xe đạp")).toBe("🚲");
    expect(rewardIcon("Trà sữa")).toBe("🧋");
    expect(rewardIcon("Xem phim")).toBe("🎬");
  });

  it("maps travel/experience rewards", () => {
    expect(rewardIcon("Family trip")).toBe("✈️");
    expect(rewardIcon("Theme park")).toBe("🎢");
    expect(rewardIcon("Singapore trip")).toBe("✈️");
  });

  it("falls back to 🎁 for unknown", () => {
    expect(rewardIcon("Something random")).toBe("🎁");
    expect(rewardIcon("Custom reward")).toBe("🎁");
  });

  it("is case-insensitive", () => {
    expect(rewardIcon("ICE CREAM")).toBe("🍦");
    expect(rewardIcon("movie NIGHT")).toBe("🎬");
  });
});

describe("levelIcon", () => {
  it("returns correct icons for each level", () => {
    expect(levelIcon(1)).toBe("🌱");
    expect(levelIcon(2)).toBe("🧭");
    expect(levelIcon(3)).toBe("🚀");
    expect(levelIcon(4)).toBe("🌟");
    expect(levelIcon(5)).toBe("🏆");
    expect(levelIcon(6)).toBe("👑");
  });

  it("clamps to last icon for levels beyond max", () => {
    expect(levelIcon(7)).toBe("👑");
    expect(levelIcon(100)).toBe("👑");
  });
});
