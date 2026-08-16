// Level system (design §4.4)
// Levels are based on lifetime_stars.
// Early levels are fast so children feel progress in 1–2 weeks.

export interface LevelInfo {
  level: number;
  title_en: string;
  title_vi: string;
  minStars: number;
  nextLevelStars: number | null;
  progress: number; // 0..1
}

export const LEVELS: { level: number; minStars: number; title_en: string; title_vi: string }[] = [
  { level: 1, minStars: 0,    title_en: "Seedling",     title_vi: "Mầm Non" },
  { level: 2, minStars: 25,   title_en: "Explorer",     title_vi: "Nhà Khám Phá" },
  { level: 3, minStars: 75,   title_en: "Adventurer",   title_vi: "Nhà Phiêu Lưu" },
  { level: 4, minStars: 150,  title_en: "Superstar",    title_vi: "Ngôi Sao" },
  { level: 5, minStars: 300,  title_en: "Champion",     title_vi: "Nhà Vô Địch" },
  { level: 6, minStars: 500,  title_en: "Quest Master", title_vi: "Bậc Thầy Quest" },
];

export function getLevelInfo(lifetimeStars: number): LevelInfo {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (lifetimeStars >= l.minStars) current = l;
    else break;
  }
  const idx = LEVELS.indexOf(current);
  const next = idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
  const starsInLevel = lifetimeStars - current.minStars;
  const starsNeeded = next ? next.minStars - current.minStars : 1;
  return {
    level: current.level,
    title_en: current.title_en,
    title_vi: current.title_vi,
    minStars: current.minStars,
    nextLevelStars: next?.minStars ?? null,
    progress: next ? Math.min(1, starsInLevel / starsNeeded) : 1,
  };
}
