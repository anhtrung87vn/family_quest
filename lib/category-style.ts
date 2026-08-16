// Semantic category colors & icons (design §8)
// Used across quest cards, reward cards, and progress indicators.

export type TaskCategory = "learning" | "responsibility" | "family" | "health" | "creativity";
export type RewardCategory = "small" | "medium" | "large" | "experience" | "dream";

const TASK_STYLES: Record<TaskCategory, { icon: string; color: string; bg: string; border: string }> = {
  learning:       { icon: "📚", color: "text-blue-600",    bg: "bg-blue-50",    border: "border-blue-200" },
  responsibility: { icon: "🌱", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  family:         { icon: "❤️", color: "text-pink-600",    bg: "bg-pink-50",    border: "border-pink-200" },
  health:         { icon: "🏃", color: "text-orange-600",  bg: "bg-orange-50",  border: "border-orange-200" },
  creativity:     { icon: "🎨", color: "text-purple-600",  bg: "bg-purple-50",  border: "border-purple-200" },
};

const REWARD_STYLES: Record<RewardCategory, { icon: string; color: string; bg: string; border: string; accent: string }> = {
  small:      { icon: "🎁", color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-200",  accent: "bg-amber-400" },
  medium:     { icon: "🎁", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", accent: "bg-orange-400" },
  large:      { icon: "🏆", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200", accent: "bg-purple-500" },
  experience: { icon: "✨", color: "text-cyan-600",   bg: "bg-cyan-50",   border: "border-cyan-200",   accent: "bg-cyan-400" },
  dream:      { icon: "🌈", color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200", accent: "bg-gradient-to-r from-indigo-400 to-purple-500" },
};

export function taskStyle(category: string | null | undefined) {
  return TASK_STYLES[(category as TaskCategory) ?? "learning"] ?? TASK_STYLES.learning;
}

export function rewardStyle(category: string | null | undefined) {
  return REWARD_STYLES[(category as RewardCategory) ?? "small"] ?? REWARD_STYLES.small;
}

// Level emoji progression
const LEVEL_ICONS = ["🌱", "🧭", "🚀", "🌟", "🏆", "👑"];
export function levelIcon(level: number) {
  return LEVEL_ICONS[Math.min(level - 1, LEVEL_ICONS.length - 1)] ?? "🌱";
}

// Behavior type styles (design: Habit Plan §5)
export type BehaviorType = "responsibility" | "habit_building" | "challenge" | "character" | "family";

const BEHAVIOR_STYLES: Record<BehaviorType, { icon: string; color: string; bg: string; border: string; label_en: string; label_vi: string }> = {
  responsibility: { icon: "🌱", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", label_en: "Responsibility", label_vi: "Trách nhiệm" },
  habit_building: { icon: "🌟", color: "text-amber-600",   bg: "bg-amber-50",   border: "border-amber-200",   label_en: "Habit Building", label_vi: "Tập thói quen" },
  challenge:      { icon: "🎯", color: "text-blue-600",    bg: "bg-blue-50",    border: "border-blue-200",    label_en: "Challenge",      label_vi: "Thử thách" },
  character:      { icon: "💎", color: "text-purple-600",  bg: "bg-purple-50",  border: "border-purple-200",  label_en: "Character",      label_vi: "Phẩm chất" },
  family:         { icon: "👨‍👩‍👧‍👦", color: "text-pink-600",    bg: "bg-pink-50",    border: "border-pink-200",    label_en: "Family",         label_vi: "Gia đình" },
};

export function behaviorStyle(type: string | null | undefined) {
  return BEHAVIOR_STYLES[(type as BehaviorType) ?? "challenge"] ?? BEHAVIOR_STYLES.challenge;
}

// Reward stage display
export type RewardStage = "full_reward" | "reduced_reward" | "stars_only" | "graduated";

const STAGE_STYLES: Record<RewardStage, { icon: string; color: string; bg: string; label_en: string; label_vi: string }> = {
  full_reward:    { icon: "🪙", color: "text-amber-600",   bg: "bg-amber-50",   label_en: "Full Reward",    label_vi: "Thưởng đầy đủ" },
  reduced_reward: { icon: "📉", color: "text-orange-600",  bg: "bg-orange-50",  label_en: "Reduced",        label_vi: "Giảm thưởng" },
  stars_only:     { icon: "⭐", color: "text-purple-600",  bg: "bg-purple-50",  label_en: "Stars Only",     label_vi: "Chỉ sao" },
  graduated:      { icon: "🎓", color: "text-emerald-600", bg: "bg-emerald-50", label_en: "Graduated!",     label_vi: "Đã tốt nghiệp!" },
};

export function stageStyle(stage: string | null | undefined) {
  return STAGE_STYLES[(stage as RewardStage) ?? "full_reward"] ?? STAGE_STYLES.full_reward;
}

// Reward name → icon mapping for visual variety in reward cards
const REWARD_ICON_MAP: Record<string, string> = {
  "screen time": "📺", "screen": "📺", "tv": "📺", "youtube": "📺",
  "dinner": "🍕", "lunch": "🍕", "breakfast": "🥞", "restaurant": "🍕",
  "ice cream": "🍦", "icecream": "🍦", "kem": "🍦",
  "snack": "🍪", "cookie": "🍪", "candy": "🍬", "chocolate": "🍫",
  "movie": "🎬", "cinema": "🎬", "phim": "🎬",
  "book": "📚", "sách": "📚", "notebook": "📓",
  "sticker": "🌟", "star": "🌟",
  "stay up": "🌙", "bedtime": "🌙", "thức khuya": "🌙",
  "game": "🎮", "gaming": "🎮",
  "lego": "🧱", "toy": "🧸", "đồ chơi": "🧸",
  "bicycle": "🚲", "bike": "🚲", "xe đạp": "🚲",
  "watch": "⌚", "smart watch": "⌚", "apple watch": "⌚",
  "ipad": "📱", "tablet": "📱",
  "headphone": "🎧", "tai nghe": "🎧",
  "trip": "✈️", "travel": "✈️", "du lịch": "✈️", "resort": "🏖️", "singapore": "✈️",
  "theme park": "🎢", "park": "🌳",
  "art": "🎨", "paint": "🎨", "craft": "🎨",
  "music": "🎵", "nhạc": "🎵",
  "t-shirt": "👕", "shirt": "👕", "clothes": "👕",
  "bubble tea": "🧋", "trà sữa": "🧋", "drink": "🧋",
  "activity": "🎯", "family activity": "👨‍👩‍👧‍👦",
  "day trip": "🚗",
};

export function rewardIcon(name: string): string {
  const lower = name.toLowerCase();
  for (const [keyword, icon] of Object.entries(REWARD_ICON_MAP)) {
    if (lower.includes(keyword)) return icon;
  }
  return "🎁";
}
