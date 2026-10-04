/**
 * Skill Ladder metadata — V1 ladders and their max levels.
 * Source: BloomQuest System Quest Curriculum §13.
 */

export interface LadderMeta {
  label_en: string;
  label_vi: string;
  maxLevel: number;
  icon: string;
}

export const SKILL_LADDERS: Record<string, LadderMeta> = {
  COOKING:               { label_en: "Cooking",              label_vi: "Nấu ăn",              maxLevel: 9,  icon: "🍳" },
  HOUSEHOLD_CARE:        { label_en: "Household Care",       label_vi: "Chăm sóc nhà",        maxLevel: 9,  icon: "🏠" },
  PERSONAL_ORGANIZATION: { label_en: "Personal Organization", label_vi: "Tổ chức cá nhân",     maxLevel: 8,  icon: "📋" },
  READING:               { label_en: "Reading",              label_vi: "Đọc sách",             maxLevel: 6,  icon: "📚" },
  RESEARCH:              { label_en: "Research",             label_vi: "Nghiên cứu",           maxLevel: 3,  icon: "🔬" },
  COMMUNICATION:         { label_en: "Communication",        label_vi: "Giao tiếp",            maxLevel: 9,  icon: "💬" },
  MONEY:                 { label_en: "Money",                label_vi: "Tiền bạc",             maxLevel: 12, icon: "💰" },
  DIGITAL_SAFETY:        { label_en: "Digital Safety",       label_vi: "An toàn số",           maxLevel: 7,  icon: "🔒" },
  AI_LITERACY:           { label_en: "AI Literacy",          label_vi: "Hiểu biết AI",         maxLevel: 2,  icon: "🤖" },
  FAMILY_CONTRIBUTION:   { label_en: "Family Contribution",  label_vi: "Đóng góp gia đình",   maxLevel: 9,  icon: "❤️" },
  PLANNING:              { label_en: "Planning",             label_vi: "Lập kế hoạch",         maxLevel: 10, icon: "🎯" },
  PROJECT_EXECUTION:     { label_en: "Project Execution",    label_vi: "Thực hiện dự án",      maxLevel: 7,  icon: "🚀" },
  CAREER_EXPLORATION:    { label_en: "Career Exploration",   label_vi: "Khám phá nghề nghiệp", maxLevel: 6, icon: "🌍" },
  TRAVEL_NAVIGATION:     { label_en: "Travel & Navigation",  label_vi: "Du lịch & Tìm đường",  maxLevel: 6, icon: "🧭" },
};

export const ALL_LADDER_KEYS = Object.keys(SKILL_LADDERS);
