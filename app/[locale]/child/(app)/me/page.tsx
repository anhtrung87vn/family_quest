import { getTranslations, setRequestLocale } from "next-intl/server";
import { getChildSession } from "@/lib/auth/child-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getChildBalance } from "@/lib/ledger";
import { getLevelInfo, levelGift, profileThemeFor, avatarFrameFor, AVATAR_FRAMES, PROFILE_THEMES, MAX_LEVEL, type Cosmetic } from "@/lib/levels";
import { getStreak } from "@/lib/streaks";
import { levelIcon } from "@/lib/category-style";
import { signOutChild, markWeeklyReflectionReadAction, deleteJourneyEntryAction } from "../actions";
import { redirect } from "@/lib/i18n/routing";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CoinIcon } from "@/components/ui/CoinIcon";
import { FAMILY_TIME_ZONE } from "@/lib/family-time";

export const dynamic = "force-dynamic";

const NEXT_BADGE_COUNT = 3;

export default async function ChildMe({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const sessionOrNull = await getChildSession();
  if (!sessionOrNull) redirect({ href: "/child/select", locale });
  const session = sessionOrNull!;
  const admin = createAdminClient();

  const [
    { coin, star },
    { data: txs },
    childRow,
    streak,
    { data: badges },
    { data: child },
    { data: allBadges },
    { data: weeklyRef },
    { data: levelUps },
    { count: totalCompleted },
    { data: earnedCoins },
    { count: rewardsRedeemed },
  ] = await Promise.all([
    getChildBalance(session.childId),
    admin.from("coin_transactions").select("id, amount, transaction_type, description, created_at")
      .eq("child_id", session.childId).order("created_at", { ascending: false }).limit(20),
    admin.from("children").select("lifetime_stars").eq("id", session.childId).single(),
    getStreak(session.childId),
    admin.from("child_badges").select("badge_id, earned_at, badge:badges(icon, name_en, name_vi)")
      .eq("child_id", session.childId).order("earned_at", { ascending: false }),
    admin.from("children").select("name, avatar_url").eq("id", session.childId).single(),
    // All badge definitions; unearned ones are filtered in code below
    admin.from("badges").select("id, icon, name_en, name_vi, condition_type, condition_value")
      .order("condition_value", { ascending: true }),
    // Current week's reflection
    admin.from("weekly_reflections")
      .select("id, week_start, highlights, growth_note, parent_message, tasks_completed, coins_earned, stars_earned, child_read_at")
      .eq("child_id", session.childId)
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Level-up gifts (rows are created by the child layout's syncLevelUps)
    admin.from("child_level_ups")
      .select("id, level, reached_at, gifted_at")
      .eq("child_id", session.childId)
      .order("level", { ascending: false })
      .limit(12),
    admin.from("task_assignments")
      .select("id", { count: "exact", head: true })
      .eq("child_id", session.childId)
      .eq("status", "approved"),
    admin.from("coin_transactions").select("amount")
      .eq("child_id", session.childId).gt("amount", 0),
    admin.from("reward_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("child_id", session.childId)
      .in("status", ["approved", "fulfilled"]),
  ]);

  const lifetimeStars = childRow.data?.lifetime_stars ?? 0;
  const level = getLevelInfo(lifetimeStars);
  const levelTitle = locale === "vi" ? level.title_vi : level.title_en;
  const lvIcon = levelIcon(level.level);
  const theme = profileThemeFor(level.level);
  const frame = avatarFrameFor(level.level);
  const cosmeticName = (c: Cosmetic) => (locale === "vi" ? c.name_vi : c.name_en);
  const nextGiftLevel = level.level < MAX_LEVEL ? level.level + 1 : null;

  // Child's current stats for next-badge progress (same measures the badge checker uses)
  const childStats: Record<string, number> = {
    tasks_completed: totalCompleted ?? 0,
    coins_earned: (earnedCoins ?? []).reduce((sum, r) => sum + r.amount, 0),
    rewards_redeemed: rewardsRedeemed ?? 0,
    streak_days: Math.max(streak.current, streak.longest),
  };

  const earnedBadgeIds = new Set((badges ?? []).map((b) => b.badge_id));
  const nextBadges = (allBadges ?? [])
    .filter((b) => !earnedBadgeIds.has(b.id))
    .slice(0, NEXT_BADGE_COUNT);

  // Group txs by date for journey view
  function groupByDate<T extends { created_at: string }>(items: T[]) {
    const groups: { date: string; items: T[] }[] = [];
    for (const item of items) {
      const d = new Date(item.created_at).toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric", timeZone: FAMILY_TIME_ZONE });
      const last = groups[groups.length - 1];
      if (last?.date === d) last.items.push(item);
      else groups.push({ date: d, items: [item] });
    }
    return groups;
  }

  const journeyGroups = groupByDate(txs ?? []);

  return (
    <div className="space-y-5">
      {/* 👧 Profile card */}
      <section className={`overflow-hidden rounded-2xl ${theme.className} p-6 text-center text-white shadow-lg`}>
        {child?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={child.avatar_url} alt="" className={`mx-auto mb-3 h-20 w-20 rounded-full object-cover ${frame.className}`} />
        ) : (
          <div className={`mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-3xl font-bold ${frame.className}`}>
            {child?.name?.slice(0, 1) ?? "?"}
          </div>
        )}
        <div className="mb-1 text-xl font-bold">{child?.name}</div>
        <div className="mb-3 flex items-center justify-center gap-2 text-sm text-white/90">
          <span>{lvIcon}</span>
          <span>Lv.{level.level} {levelTitle}</span>
        </div>

        {level.nextLevelStars && (
          <div className="mx-auto max-w-[240px]">
            <ProgressBar
              value={lifetimeStars - level.minStars}
              max={level.nextLevelStars - level.minStars}
              color="amber"
              size="sm"
            />
            <div className="mt-1.5 text-[13px] text-white/85">
              {lifetimeStars} / {level.nextLevelStars} ⭐ → Lv.{level.level + 1}
            </div>
          </div>
        )}

        {/* Stat row */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-white/15 px-2 py-2">
            <div className="text-lg font-bold"><CoinIcon /> {coin}</div>
            <div className="text-xs text-white/80">{t("common.coins")}</div>
          </div>
          <div className="rounded-xl bg-white/15 px-2 py-2">
            <div className="text-lg font-bold">⭐ {star}</div>
            <div className="text-xs text-white/80">{t("common.stars")}</div>
          </div>
          <div className="rounded-xl bg-white/15 px-2 py-2">
            <div className="text-lg font-bold">🔥 {streak.current}</div>
            <div className="text-xs text-white/80">{t("child.streakDays")}</div>
          </div>
        </div>
      </section>

      {/* 🎁 Level-up gifts */}
      <Card className="space-y-3 border-amber-200 bg-amber-50">
        <h2 className="flex items-center gap-2 text-base font-bold text-stone-800">🎁 {t("child.levelGifts")}</h2>
        {(levelUps ?? []).length > 0 ? (
          <ul className="space-y-2">
            {(levelUps ?? []).map((lu) => (
              <li key={lu.id} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2">
                <span className="text-xl">{levelIcon(lu.level)}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-stone-500">{t("child.levelReached", { level: lu.level })}</div>
                  <div className="text-sm text-stone-800">{levelGift(lu.level, locale)}</div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${lu.gifted_at ? "bg-emerald-100 text-emerald-700" : "bg-amber-200 text-amber-800"}`}>
                  {lu.gifted_at ? t("child.levelGiftGiven") : t("child.levelGiftPending")}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {nextGiftLevel && (
          <p className="text-[13px] text-stone-600">
            {t("child.levelNextGift", { level: nextGiftLevel, stars: level.nextLevelStars! - lifetimeStars, gift: levelGift(nextGiftLevel, locale) ?? "" })}
          </p>
        )}
      </Card>

      {/* 🏅 Badges + next-badge progress */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-stone-800">
          🏅 {t("child.badges")}
        </h2>

        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-2xl border border-purple-200 bg-purple-50 px-3 py-2">
            <div className="text-xl font-bold text-purple-600">🎯 {totalCompleted ?? 0}</div>
            <div className="text-[13px] text-stone-600">{t("child.totalQuestsDone")}</div>
          </div>
          <div className="rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2">
            <div className="text-xl font-bold text-orange-600">🏆 {streak.longest}</div>
            <div className="text-[13px] text-stone-600">{t("child.bestStreak")}</div>
          </div>
        </div>

        {badges && badges.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {badges.map((b) => {
              const badge = Array.isArray(b.badge) ? b.badge[0] : b.badge;
              return (
                <div key={b.badge_id} className="flex flex-col items-center gap-1 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-center shadow-sm">
                  <span className="text-3xl">{badge?.icon}</span>
                  <span className="text-xs font-semibold text-stone-700">{locale === "vi" ? badge?.name_vi : badge?.name_en}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-3 text-center">
            <div className="text-sm font-semibold text-stone-700">🏅 {t("child.emptyBadgesTitle")}</div>
            <div className="text-[13px] text-stone-500">{t("child.emptyBadgesDesc")}</div>
          </div>
        )}

        {nextBadges.length > 0 && (
          <Card className="border-indigo-100 bg-indigo-50/50">
            <div className="mb-3 text-[13px] font-semibold text-indigo-600">
              🎯 {t("child.nextBadge")}
            </div>
            <ul className="space-y-3">
              {nextBadges.map((nb) => {
                const target = nb.condition_value;
                const current = Math.min(childStats[nb.condition_type] ?? 0, target);
                const badgeName = locale === "vi" ? nb.name_vi : nb.name_en;
                return (
                  <li key={nb.id}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium text-stone-700">{nb.icon} {badgeName}</span>
                      <span className="shrink-0 text-[13px] text-stone-500">{current} / {target}</span>
                    </div>
                    <ProgressBar value={current} max={target} color="indigo" size="sm" />
                    {current < target && (
                      <div className="mt-1 text-[13px] text-stone-500">
                        {t("child.badgeRemaining", { n: String(target - current) })}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>

      {/* 🎨 Collection: avatar frames + profile themes unlocked by level */}
      <Card className="space-y-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-stone-800">🎨 {t("child.collection")}</h2>
        {[
          { title: t("child.avatarFrames"), items: AVATAR_FRAMES, current: frame.key, frameStyle: true },
          { title: t("child.profileThemes"), items: PROFILE_THEMES, current: theme.key, frameStyle: false },
        ].map((group) => (
          <div key={group.title}>
            <div className="mb-2 text-[13px] font-semibold text-stone-600">{group.title}</div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {group.items.map((c) => {
                const unlocked = c.unlockLevel <= level.level;
                return (
                  <div key={c.key} className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center ${c.key === group.current ? "border-amber-400 bg-amber-50" : "border-stone-200"} ${unlocked ? "" : "opacity-60"}`}>
                    {group.frameStyle ? (
                      <div className={`h-8 w-8 rounded-full bg-stone-200 ${unlocked ? c.className : "ring-2 ring-stone-300"}`} />
                    ) : (
                      <div className={`h-8 w-12 rounded-lg ${unlocked ? c.className : "bg-stone-300"}`} />
                    )}
                    <div className="text-xs font-medium text-stone-700">{cosmeticName(c)}</div>
                    <div className="text-xs text-stone-500">{unlocked ? "✓" : `🔒 ${t("child.unlockAtLevel", { level: c.unlockLevel })}`}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </Card>

      {/* 📖 Weekly journal — this week's reflection from parents */}
      {weeklyRef && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-stone-800">
            📖 {t("child.weeklyJournalTitle")}
            {!weeklyRef.child_read_at && (
              <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-white">{t("child.newTag")}</span>
            )}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm">
            {/* Week stats */}
            <div className="grid grid-cols-3 divide-x divide-amber-100 border-b border-amber-100">
              <div className="p-3 text-center">
                <div className="text-xl font-bold text-emerald-600">🎯 {weeklyRef.tasks_completed}</div>
                <div className="text-xs text-stone-600">{t("parent.tasksCompleted")}</div>
              </div>
              <div className="p-3 text-center">
                <div className="text-xl font-bold text-amber-600"><CoinIcon /> {weeklyRef.coins_earned}</div>
                <div className="text-xs text-stone-600">{t("parent.earned")}</div>
              </div>
              <div className="p-3 text-center">
                <div className="text-xl font-bold text-purple-600">⭐ {weeklyRef.stars_earned}</div>
                <div className="text-xs text-stone-600">{t("common.stars")}</div>
              </div>
            </div>

            <div className="space-y-3 p-4">
              {weeklyRef.highlights && (
                <div>
                  <div className="mb-1 text-[13px] font-semibold text-amber-700">🌟 {t("child.weeklyProud")}</div>
                  <p className="text-sm leading-relaxed text-stone-700">"{weeklyRef.highlights}"</p>
                </div>
              )}
              {weeklyRef.growth_note && (
                <div>
                  <div className="mb-1 text-[13px] font-semibold text-emerald-700">🌱 {t("child.weeklyGrowth")}</div>
                  <p className="text-sm leading-relaxed text-stone-700">"{weeklyRef.growth_note}"</p>
                </div>
              )}
              {weeklyRef.parent_message && (
                <div className="rounded-xl bg-white/70 p-3">
                  <div className="mb-1 text-[13px] font-semibold text-pink-600">❤️ {t("child.weeklyNote")}</div>
                  <p className="text-sm leading-relaxed text-stone-700">"{weeklyRef.parent_message}"</p>
                </div>
              )}
            </div>

            {/* Mark as read */}
            <div className="border-t border-amber-100 px-4 py-3 text-center">
              {weeklyRef.child_read_at ? (
                <span className="text-[13px] text-stone-500">{t("child.weeklyAlreadyRead")}</span>
              ) : (
                <form action={markWeeklyReflectionReadAction}>
                  <input type="hidden" name="id" value={weeklyRef.id} />
                  <Button type="submit" size="md" className="bg-amber-400 text-white hover:bg-amber-500">
                    {t("child.weeklyReadBtn")}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ✨ Journey (collapsible coin history with delete) */}
      <section>
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl text-base font-bold text-stone-800 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 [&::-webkit-details-marker]:hidden">
            <span>✨ {t("child.journey")}</span>
            <span aria-hidden className="ml-auto text-base text-stone-400 transition-transform duration-150 group-open:rotate-180">▾</span>
          </summary>
          <div className="mt-3">
            {!journeyGroups.length ? (
              <Card className="text-center">
                <div className="text-3xl">✨</div>
                <div className="mt-1 text-sm font-semibold text-stone-700">{t("child.emptyHistoryTitle")}</div>
                <div className="text-[13px] text-stone-500">{t("child.emptyHistoryDesc")}</div>
              </Card>
            ) : (
              <div className="space-y-3">
                {journeyGroups.map((group) => (
                  <div key={group.date}>
                    <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500">
                      {group.date}
                    </div>
                    <Card>
                      <ul className="divide-y divide-stone-100">
                        {group.items.map((tx) => (
                          <li key={tx.id} className="flex items-center gap-2 py-0.5 text-sm">
                            <span className="flex-1 truncate font-medium text-stone-700">{tx.description ?? tx.transaction_type}</span>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                              tx.amount >= 0
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}>
                              {tx.amount >= 0 ? "+" : ""}{tx.amount} <CoinIcon />
                            </span>
                            <form action={deleteJourneyEntryAction}>
                              <input type="hidden" name="tx_id" value={tx.id} />
                              <button
                                type="submit"
                                title={t("common.delete")}
                                aria-label={t("common.delete")}
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base text-stone-300 transition-colors hover:bg-red-50 hover:text-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                              >
                                🗑
                              </button>
                            </form>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>
      </section>

      {/* Sign out */}
      <form action={signOutChild} className="pt-2">
        <Button type="submit" variant="ghost" size="md" className="w-full text-stone-500">
          {t("child.signOut")}
        </Button>
      </form>
    </div>
  );
}
