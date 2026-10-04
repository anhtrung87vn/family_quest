import { describe, it, expect } from "vitest";
import {
  getLevelInfo,
  LEVELS,
  MAX_LEVEL,
  levelGift,
  levelTitle,
  newlyReachedLevels,
  avatarFrameFor,
  profileThemeFor,
  AVATAR_FRAMES,
  PROFILE_THEMES,
} from "@/lib/levels";

describe("getLevelInfo", () => {
  it("returns level 1 Seedling for 0 stars", () => {
    const info = getLevelInfo(0);
    expect(info.level).toBe(1);
    expect(info.minStars).toBe(0);
    expect(info.nextLevelStars).toBe(25);
    expect(info.title_en).toBe("Seedling");
    expect(info.title_vi).toBe("Mầm Non");
  });

  it("returns level 1 for 24 stars (boundary)", () => {
    expect(getLevelInfo(24).level).toBe(1);
  });

  it("returns level 2 Sprout for 25 stars", () => {
    const info = getLevelInfo(25);
    expect(info.level).toBe(2);
    expect(info.title_en).toBe("Sprout");
    expect(info.nextLevelStars).toBe(100);
  });

  it("returns the max level Quest Master at 5,200+ stars", () => {
    const info = getLevelInfo(5200);
    expect(info.level).toBe(12);
    expect(info.title_en).toBe("Quest Master");
    expect(info.nextLevelStars).toBeNull();
    expect(info.progress).toBe(1);
    expect(getLevelInfo(99999).level).toBe(MAX_LEVEL);
  });

  it("computes progress inside a level", () => {
    const info = getLevelInfo(150); // Lv3 100 → Lv4 200
    expect(info.level).toBe(3);
    expect(info.progress).toBe(0.5);
    expect(getLevelInfo(100).progress).toBe(0);
  });

  it("has strictly increasing thresholds over 12 levels", () => {
    expect(LEVELS).toHaveLength(12);
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].minStars).toBeGreaterThan(LEVELS[i - 1].minStars);
      expect(LEVELS[i].level).toBe(i + 1);
    }
  });

  it("spreads levels over years at ~35 stars/week (an 8-year-old)", () => {
    const weeksTo = (level: number) => LEVELS[level - 1].minStars / 35;
    expect(weeksTo(2)).toBeLessThanOrEqual(1);
    expect(weeksTo(6)).toBeGreaterThan(12); // not before ~3 months
    expect(weeksTo(12)).toBeGreaterThan(104); // top level takes 2+ years
  });
});

describe("level gifts and titles", () => {
  it("has a gift for every level from 2 to the max, in both languages", () => {
    for (let l = 2; l <= MAX_LEVEL; l++) {
      expect(levelGift(l, "en")).toBeTruthy();
      expect(levelGift(l, "vi")).toBeTruthy();
    }
    expect(levelGift(1, "en")).toBeNull();
  });

  it("returns localized titles", () => {
    expect(levelTitle(3, "en")).toBe("Explorer");
    expect(levelTitle(3, "vi")).toBe("Nhà Khám Phá");
  });
});

describe("newlyReachedLevels", () => {
  it("lists every level crossed since the last recorded one", () => {
    expect(newlyReachedLevels(1, 210)).toEqual([2, 3, 4]);
    expect(newlyReachedLevels(3, 210)).toEqual([4]);
  });

  it("returns nothing when no new level was reached", () => {
    expect(newlyReachedLevels(4, 210)).toEqual([]);
    expect(newlyReachedLevels(1, 10)).toEqual([]);
  });
});

describe("cosmetics", () => {
  it("uses the best frame and theme the level has unlocked", () => {
    expect(avatarFrameFor(1).key).toBe("classic");
    expect(avatarFrameFor(5).key).toBe("ocean");
    expect(avatarFrameFor(12).key).toBe("crown");
    expect(profileThemeFor(2).key).toBe("twilight");
    expect(profileThemeFor(7).key).toBe("sunset");
  });

  it("unlocks something new at every level from 2 upward", () => {
    for (let l = 2; l <= MAX_LEVEL; l++) {
      const unlocked = [...AVATAR_FRAMES, ...PROFILE_THEMES].some((c) => c.unlockLevel === l);
      expect(unlocked).toBe(true);
    }
  });
});
