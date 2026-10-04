// Level system (design §4.4, §84).
// Levels are based on lifetime_stars and are spread over years, not weeks:
// at ~35 stars/week (an 8-year-old) level 2 takes a week, level 6 about four
// months and level 12 about three years. Each level unlocks a privilege gift,
// and levels unlock avatar frames and profile themes.

export interface LevelInfo {
  level: number;
  title_en: string;
  title_vi: string;
  minStars: number;
  nextLevelStars: number | null;
  progress: number; // 0..1
}

export const LEVELS: { level: number; minStars: number; title_en: string; title_vi: string }[] = [
  { level: 1,  minStars: 0,    title_en: "Seedling",     title_vi: "Mầm Non" },
  { level: 2,  minStars: 25,   title_en: "Sprout",       title_vi: "Chồi Non" },
  { level: 3,  minStars: 100,  title_en: "Explorer",     title_vi: "Nhà Khám Phá" },
  { level: 4,  minStars: 200,  title_en: "Adventurer",   title_vi: "Nhà Phiêu Lưu" },
  { level: 5,  minStars: 350,  title_en: "Pathfinder",   title_vi: "Người Tìm Đường" },
  { level: 6,  minStars: 600,  title_en: "Superstar",    title_vi: "Ngôi Sao" },
  { level: 7,  minStars: 900,  title_en: "Trailblazer",  title_vi: "Người Tiên Phong" },
  { level: 8,  minStars: 1300, title_en: "Champion",     title_vi: "Nhà Vô Địch" },
  { level: 9,  minStars: 1800, title_en: "Mentor",       title_vi: "Người Dẫn Dắt" },
  { level: 10, minStars: 2700, title_en: "Guardian",     title_vi: "Người Bảo Hộ" },
  { level: 11, minStars: 3800, title_en: "Legend",       title_vi: "Huyền Thoại" },
  { level: 12, minStars: 5200, title_en: "Quest Master", title_vi: "Bậc Thầy Quest" },
];

export const MAX_LEVEL = LEVELS[LEVELS.length - 1].level;

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

export function levelTitle(level: number, locale: string): string {
  const l = LEVELS.find((x) => x.level === level) ?? LEVELS[0];
  return locale === "vi" ? l.title_vi : l.title_en;
}

// ── Level-up gifts (privileges, given by a parent) ───────────────────────────

const LEVEL_GIFTS: Record<number, { en: string; vi: string }> = {
  2:  { en: "Choose tonight's dessert", vi: "Chọn món tráng miệng tối nay" },
  3:  { en: "Choose the family movie", vi: "Chọn phim cho cả nhà xem" },
  4:  { en: "Stay up 30 minutes later on a weekend night", vi: "Thức khuya thêm 30 phút vào tối cuối tuần" },
  5:  { en: "Choose the weekend breakfast", vi: "Chọn bữa sáng cuối tuần" },
  6:  { en: "A one-on-one outing with Mom or Dad", vi: "Một buổi đi chơi riêng với ba hoặc mẹ" },
  7:  { en: "Plan a family weekend activity", vi: "Lên kế hoạch một hoạt động cuối tuần cho cả nhà" },
  8:  { en: "Choose the family dinner menu", vi: "Chọn thực đơn bữa tối cho cả nhà" },
  9:  { en: "Invite a friend over for a special afternoon", vi: "Mời bạn đến nhà chơi một buổi chiều" },
  10: { en: "Choose the destination of a family day trip", vi: "Chọn điểm đến cho chuyến đi chơi trong ngày" },
  11: { en: "A new book or online course of your choice", vi: "Một cuốn sách hoặc khóa học online tự chọn" },
  12: { en: "Plan a special family celebration", vi: "Lên kế hoạch một buổi ăn mừng đặc biệt của cả nhà" },
};

export function levelGift(level: number, locale: string): string | null {
  const g = LEVEL_GIFTS[level];
  return g ? (locale === "vi" ? g.vi : g.en) : null;
}

/** Levels newly reached when moving from `fromLevel` to the level of `lifetimeStars`. */
export function newlyReachedLevels(fromLevel: number, lifetimeStars: number): number[] {
  const to = getLevelInfo(lifetimeStars).level;
  const out: number[] = [];
  for (let l = Math.max(fromLevel + 1, 2); l <= to; l++) out.push(l);
  return out;
}

// ── Cosmetics: avatar frames (even levels) and profile themes (odd levels) ────
// Class strings are literal so Tailwind can see them.

export interface Cosmetic {
  key: string;
  unlockLevel: number;
  name_en: string;
  name_vi: string;
  className: string;
}

export const AVATAR_FRAMES: Cosmetic[] = [
  { key: "classic", unlockLevel: 1,  name_en: "Classic",  name_vi: "Cổ Điển",  className: "ring-2 ring-amber-300" },
  { key: "leaf",    unlockLevel: 2,  name_en: "Leaf",     name_vi: "Lá Xanh",  className: "ring-[3px] ring-emerald-400" },
  { key: "ocean",   unlockLevel: 4,  name_en: "Ocean",    name_vi: "Đại Dương", className: "ring-[3px] ring-sky-400 ring-offset-2" },
  { key: "star",    unlockLevel: 6,  name_en: "Star",     name_vi: "Ngôi Sao", className: "ring-4 ring-yellow-400 ring-offset-2" },
  { key: "royal",   unlockLevel: 8,  name_en: "Royal",    name_vi: "Hoàng Gia", className: "ring-4 ring-purple-500 ring-offset-2" },
  { key: "blossom", unlockLevel: 10, name_en: "Blossom",  name_vi: "Hoa Anh Đào", className: "ring-4 ring-pink-400 ring-offset-4" },
  { key: "crown",   unlockLevel: 12, name_en: "Golden Crown", name_vi: "Vương Miện Vàng", className: "ring-[6px] ring-amber-500 ring-offset-4 shadow-lg shadow-amber-300" },
];

export const PROFILE_THEMES: Cosmetic[] = [
  { key: "twilight", unlockLevel: 1,  name_en: "Twilight", name_vi: "Hoàng Hôn Tím", className: "bg-gradient-to-br from-purple-500 to-indigo-600" },
  { key: "forest",   unlockLevel: 3,  name_en: "Forest",   name_vi: "Rừng Xanh",    className: "bg-gradient-to-br from-emerald-500 to-teal-600" },
  { key: "ocean",    unlockLevel: 5,  name_en: "Ocean",    name_vi: "Biển Cả",      className: "bg-gradient-to-br from-sky-500 to-blue-600" },
  { key: "sunset",   unlockLevel: 7,  name_en: "Sunset",   name_vi: "Hoàng Hôn",    className: "bg-gradient-to-br from-orange-400 to-pink-500" },
  { key: "galaxy",   unlockLevel: 9,  name_en: "Galaxy",   name_vi: "Thiên Hà",     className: "bg-gradient-to-br from-indigo-700 to-fuchsia-600" },
  { key: "aurora",   unlockLevel: 11, name_en: "Aurora",   name_vi: "Cực Quang",    className: "bg-gradient-to-br from-teal-400 via-cyan-500 to-purple-600" },
];

/** The best cosmetic the level has unlocked (lists are ordered by unlockLevel). */
function bestUnlocked(list: Cosmetic[], level: number): Cosmetic {
  return [...list].reverse().find((c) => c.unlockLevel <= level) ?? list[0];
}

export function avatarFrameFor(level: number): Cosmetic {
  return bestUnlocked(AVATAR_FRAMES, level);
}

export function profileThemeFor(level: number): Cosmetic {
  return bestUnlocked(PROFILE_THEMES, level);
}
