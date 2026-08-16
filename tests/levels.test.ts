import { describe, it, expect } from "vitest";
import { getLevelInfo } from "@/lib/levels";

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
    const info = getLevelInfo(24);
    expect(info.level).toBe(1);
  });

  it("returns level 2 Explorer for 25 stars", () => {
    const info = getLevelInfo(25);
    expect(info.level).toBe(2);
    expect(info.minStars).toBe(25);
    expect(info.title_en).toBe("Explorer");
    expect(info.nextLevelStars).toBe(75);
  });

  it("returns level 3 Adventurer for 75 stars", () => {
    const info = getLevelInfo(75);
    expect(info.level).toBe(3);
    expect(info.title_en).toBe("Adventurer");
    expect(info.title_vi).toBe("Nhà Phiêu Lưu");
  });

  it("returns level 4 Superstar for 150 stars", () => {
    const info = getLevelInfo(150);
    expect(info.level).toBe(4);
    expect(info.title_en).toBe("Superstar");
  });

  it("returns level 5 Champion for 300 stars", () => {
    const info = getLevelInfo(300);
    expect(info.level).toBe(5);
    expect(info.title_en).toBe("Champion");
    expect(info.title_vi).toBe("Nhà Vô Địch");
  });

  it("returns level 6 Quest Master for 500+ stars (max level)", () => {
    const info = getLevelInfo(500);
    expect(info.level).toBe(6);
    expect(info.title_en).toBe("Quest Master");
    expect(info.nextLevelStars).toBeNull();
    expect(info.progress).toBe(1);
  });

  it("returns level 6 for very large values", () => {
    const info = getLevelInfo(99999);
    expect(info.level).toBe(6);
  });

  it("returns correct progress mid-level (Lv2: 25→75)", () => {
    const info = getLevelInfo(50); // 50 - 25 = 25 out of 50 needed
    expect(info.level).toBe(2);
    expect(info.minStars).toBe(25);
    expect(info.nextLevelStars).toBe(75);
    expect(info.progress).toBe(0.5);
  });

  it("progress is 0 at level start", () => {
    const info = getLevelInfo(25); // exactly at Lv2 start
    expect(info.progress).toBe(0);
  });

  it("progress approaches 1 just before next level", () => {
    const info = getLevelInfo(74); // 1 star before Lv3
    expect(info.progress).toBeCloseTo(0.98, 1);
  });

  it("early level-up is achievable in ~25 tasks", () => {
    // With 1 star per task, Lv2 at 25 stars = ~25 tasks = ~1-2 weeks
    const info = getLevelInfo(25);
    expect(info.level).toBeGreaterThanOrEqual(2);
  });
});
