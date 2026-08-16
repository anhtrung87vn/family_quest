import { getTranslations, setRequestLocale } from "next-intl/server";
import { getChildSession } from "@/lib/auth/child-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getChildBalance } from "@/lib/ledger";
import { getLevelInfo } from "@/lib/levels";
import { getStreak } from "@/lib/streaks";
import { levelIcon } from "@/lib/category-style";
import { signOutChild, markMessagesReadAction, reactToMessageAction, markWeeklyReflectionReadAction, clearAllMessagesAction, deleteJourneyEntryAction } from "../actions";
import { redirect } from "@/lib/i18n/routing";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { MessagesSection } from "@/components/ui/MessagesSection";

export const dynamic = "force-dynamic";

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

  const [{ coin, star }, { data: txs }, { data: starTxs }, childRow, streak, { data: badges }, { data: child }, { data: nextBadges }, { data: messages }, { data: weeklyRef }] = await Promise.all([
    getChildBalance(session.childId),
    admin.from("coin_transactions").select("id, amount, transaction_type, description, created_at")
      .eq("child_id", session.childId).order("created_at", { ascending: false }).limit(50),
    admin.from("star_transactions").select("id, amount, transaction_type, description, created_at")
      .eq("child_id", session.childId).order("created_at", { ascending: false }).limit(30),
    admin.from("children").select("lifetime_stars").eq("id", session.childId).single(),
    getStreak(session.childId),
    admin.from("child_badges").select("earned_at, badge:badges(icon, name_en, name_vi, description_en, description_vi)")
      .eq("child_id", session.childId).order("earned_at", { ascending: false }),
    admin.from("children").select("name, avatar_url").eq("id", session.childId).single(),
    // Next unearned badges for motivation
    admin.from("badges").select("id, icon, name_en, name_vi, condition_type, condition_value")
      .not("id", "in", `(select badge_id from child_badges where child_id = '${session.childId}')`)
      .order("condition_value", { ascending: true })
      .limit(3),
    // Parent messages — all, most recent first
    admin.from("parent_messages")
      .select("id, message, message_type, created_at, reaction, read_at, reference_id")
      .eq("child_id", session.childId)
      .order("created_at", { ascending: false })
      .limit(30),
    // Current week's reflection
    admin.from("weekly_reflections")
      .select("id, week_start, highlights, growth_note, parent_message, tasks_completed, coins_earned, stars_earned, child_read_at")
      .eq("child_id", session.childId)
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const lifetimeStars = childRow.data?.lifetime_stars ?? 0;
  const level = getLevelInfo(lifetimeStars);
  const levelTitle = locale === "vi" ? level.title_vi : level.title_en;
  const lvIcon = levelIcon(level.level);

  // Total tasks completed all time
  const { count: totalCompleted } = await admin
    .from("task_assignments")
    .select("id", { count: "exact", head: true })
    .eq("child_id", session.childId)
    .eq("status", "approved");

  // Compute child's current stats for next-badge progress
  const childStats: Record<string, number> = {
    tasks_completed: totalCompleted ?? 0,
    streak_days: Math.max(streak.current, streak.longest),
  };

  type ParentMsg = { id: string; message: string; message_type: string; created_at: string; reaction: string | null; read_at: string | null; reference_id: string | null };
  const typedMessages = (messages ?? []) as unknown as ParentMsg[];
  const unreadMsgCount = typedMessages.filter((m) => !m.read_at).length;

  // Fetch task names for QUEST_APPROVAL messages
  const taskCompletionIds = typedMessages
    .filter((m) => m.message_type === "QUEST_APPROVAL" && m.reference_id)
    .map((m) => m.reference_id!);
  const taskNameMap = new Map<string, string>();
  if (taskCompletionIds.length > 0) {
    const { data: completions } = await admin
      .from("task_completions")
      .select("id, assignment:task_assignments(task:tasks(name))")
      .in("id", taskCompletionIds);
    for (const tc of completions ?? []) {
      const assignment: any = Array.isArray(tc.assignment) ? tc.assignment[0] : tc.assignment;
      const task: any = assignment?.task;
      const taskName: string | undefined = Array.isArray(task) ? task[0]?.name : task?.name;
      if (taskName) taskNameMap.set(tc.id, taskName);
    }
  }

  // Group messages by relative date label
  function msgDateLabel(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return locale === "vi" ? "Hôm nay" : "Today";
    if (diffDays === 1) return locale === "vi" ? "Hôm qua" : "Yesterday";
    if (diffDays < 7) return d.toLocaleDateString(locale, { weekday: "long" });
    return locale === "vi" ? "Tuần trước" : "Last week";
  }

  // Group txs by date for journey view
  function groupByDate<T extends { created_at: string }>(items: T[]) {
    const groups: { date: string; items: T[] }[] = [];
    for (const item of items) {
      const d = new Date(item.created_at).toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" });
      const last = groups[groups.length - 1];
      if (last?.date === d) last.items.push(item);
      else groups.push({ date: d, items: [item] });
    }
    return groups;
  }

  const journeyGroups = groupByDate(txs?.slice(0, 20) ?? []);

  return (
    <div className="space-y-5">
      {/* 👧 Profile Card */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 p-6 text-center text-white shadow-lg">
        {child?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={child.avatar_url} alt="" className="mx-auto mb-3 h-20 w-20 rounded-full object-cover ring-4 ring-white/50" />
        ) : (
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-3xl font-bold ring-4 ring-white/50">
            {child?.name?.slice(0, 1) ?? "?"}
          </div>
        )}
        <div className="mb-1 text-xl font-bold">{child?.name}</div>
        <div className="mb-3 flex items-center justify-center gap-2 text-sm text-white/80">
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
              showPct
            />
            <div className="mt-1 text-xs text-white/60">
              {lifetimeStars} / {level.nextLevelStars} ⭐ → Lv.{level.level + 1}
            </div>
          </div>
        )}

        {/* Stat row */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-white/15 px-2 py-2">
            <div className="text-lg font-bold">🪙 {coin}</div>
            <div className="text-[10px] text-white/70">{t("common.coins")}</div>
          </div>
          <div className="rounded-xl bg-white/15 px-2 py-2">
            <div className="text-lg font-bold">⭐ {star}</div>
            <div className="text-[10px] text-white/70">{t("common.stars")}</div>
          </div>
          <div className="rounded-xl bg-white/15 px-2 py-2">
            <div className="text-lg font-bold">🔥 {streak.current}</div>
            <div className="text-[10px] text-white/70">{t("child.streakDays")}</div>
          </div>
        </div>
      </section>

      {/* 📊 Stats */}
      <Card className="border-purple-200 bg-purple-50">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-purple-600">🎯 {totalCompleted ?? 0}</div>
            <div className="text-xs text-stone-500">{t("child.totalQuestsDone")}</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">🔥 {streak.longest}</div>
            <div className="text-xs text-stone-500">{t("child.bestStreak")}</div>
          </div>
        </div>
      </Card>

      {/* 🏅 Badges */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-stone-800">
          🏅 {t("child.badges")}
        </h2>
        {badges && badges.length > 0 && (
          <div className="mb-3 grid grid-cols-3 gap-3">
            {badges.map((b, i) => {
              const badge = Array.isArray(b.badge) ? b.badge[0] : b.badge;
              return (
                <div key={i} className="flex flex-col items-center gap-1 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-center shadow-sm">
                  <span className="text-3xl">{badge?.icon}</span>
                  <span className="text-[11px] font-semibold text-stone-700">{locale === "vi" ? badge?.name_vi : badge?.name_en}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Next badge progress — always show motivation */}
        {nextBadges && nextBadges.length > 0 && (
          <Card className="border-indigo-100 bg-indigo-50/50">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
              🏅 {t("child.nextBadge")}
            </div>
            <ul className="space-y-3">
              {nextBadges.map((nb) => {
                const current = childStats[nb.condition_type] ?? 0;
                const target = nb.condition_value;
                const pct = Math.min(100, Math.round((current / target) * 100));
                const badgeName = locale === "vi" ? nb.name_vi : nb.name_en;
                return (
                  <li key={nb.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-stone-700">{nb.icon} {badgeName}</span>
                      <span className="text-xs text-stone-400">{current} / {target}</span>
                    </div>
                    <ProgressBar value={current} max={target} color="indigo" size="sm" />
                    {pct < 100 && (
                      <div className="mt-0.5 text-[10px] text-stone-400">
                        {t("child.badgeRemaining", { n: String(target - current) })}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        {!badges?.length && !nextBadges?.length && (
          <Card>
            <EmptyState
              icon="🏅"
              title={t("child.emptyBadgesTitle")}
              description={t("child.emptyBadgesDesc")}
            />
          </Card>
        )}
      </section>

      {/* 💌 Messages from parents — above journey */}
      <MessagesSection
        messages={typedMessages.map((m) => ({ ...m, media_type: null, media_signed_url: null }))}
        unreadCount={unreadMsgCount}
        taskNameMap={Object.fromEntries(taskNameMap)}
        title={t("child.messages")}
        markReadLabel={t("child.markRead")}
        markReadAction={markMessagesReadAction}
        reactAction={reactToMessageAction}
        unreadIds={typedMessages.filter((m) => !m.read_at).map((m) => m.id).join(",")}
        clearAllAction={clearAllMessagesAction}
      />

      {/* ✨ Journey (collapsible coin history with delete) */}
      <section>
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-base font-bold text-stone-800 select-none">
            <span>✨ {t("child.journey")}</span>
            <span className="ml-auto text-xs text-stone-400 group-open:hidden">▶</span>
            <span className="ml-auto hidden text-xs text-stone-400 group-open:inline">▼</span>
          </summary>
          <div className="mt-3">
            {!journeyGroups.length ? (
              <Card>
                <EmptyState
                  icon="✨"
                  title={t("child.emptyHistoryTitle")}
                  description={t("child.emptyHistoryDesc")}
                />
              </Card>
            ) : (
              <div className="space-y-3">
                {journeyGroups.map((group) => (
                  <div key={group.date}>
                    <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400">
                      {group.date}
                    </div>
                    <Card>
                      <ul className="divide-y divide-stone-100">
                        {group.items.map((tx) => (
                          <li key={tx.id} className="flex items-center gap-2 py-1.5 text-sm">
                            <span className="flex-1 truncate font-medium text-stone-700">{tx.description ?? tx.transaction_type}</span>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                              tx.amount >= 0
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}>
                              {tx.amount >= 0 ? "+" : ""}{tx.amount} 🪙
                            </span>
                            <form action={deleteJourneyEntryAction}>
                              <input type="hidden" name="tx_id" value={tx.id} />
                              <button type="submit" className="shrink-0 rounded-full p-1 text-[10px] text-stone-300 hover:bg-red-50 hover:text-red-400 transition-colors" title="Xóa">
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

      {/* 📖 Weekly Journal — this week's reflection from parents */}
      {weeklyRef && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-stone-800">
            📖 {t("child.weeklyJournalTitle")}
            {!weeklyRef.child_read_at && (
              <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-white">NEW</span>
            )}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm">
            {/* Week stats */}
            <div className="grid grid-cols-3 divide-x divide-amber-100 border-b border-amber-100">
              <div className="p-3 text-center">
                <div className="text-xl font-bold text-emerald-600">🎯 {weeklyRef.tasks_completed}</div>
                <div className="text-[10px] text-stone-500">{t("parent.tasksCompleted")}</div>
              </div>
              <div className="p-3 text-center">
                <div className="text-xl font-bold text-amber-600">🪙 {weeklyRef.coins_earned}</div>
                <div className="text-[10px] text-stone-500">{t("parent.earned")}</div>
              </div>
              <div className="p-3 text-center">
                <div className="text-xl font-bold text-purple-600">⭐ {weeklyRef.stars_earned}</div>
                <div className="text-[10px] text-stone-500">{t("common.stars")}</div>
              </div>
            </div>

            <div className="space-y-3 p-4">
              {weeklyRef.highlights && (
                <div>
                  <div className="mb-1 text-xs font-semibold text-amber-700">🌟 {t("child.weeklyProud")}</div>
                  <p className="text-sm text-stone-700 leading-relaxed">"{weeklyRef.highlights}"</p>
                </div>
              )}
              {weeklyRef.growth_note && (
                <div>
                  <div className="mb-1 text-xs font-semibold text-emerald-700">🌱 {t("child.weeklyGrowth")}</div>
                  <p className="text-sm text-stone-700 leading-relaxed">"{weeklyRef.growth_note}"</p>
                </div>
              )}
              {weeklyRef.parent_message && (
                <div className="rounded-xl bg-white/70 p-3">
                  <div className="mb-1 text-xs font-semibold text-pink-600">❤️ {t("child.weeklyNote")}</div>
                  <p className="text-sm text-stone-700 leading-relaxed">"{weeklyRef.parent_message}"</p>
                </div>
              )}
            </div>

            {/* Mark as read */}
            <div className="border-t border-amber-100 px-4 py-3 text-center">
              {weeklyRef.child_read_at ? (
                <span className="text-xs text-stone-400">{t("child.weeklyAlreadyRead")}</span>
              ) : (
                <form action={markWeeklyReflectionReadAction}>
                  <input type="hidden" name="id" value={weeklyRef.id} />
                  <Button type="submit" size="sm" className="bg-amber-400 text-white hover:bg-amber-500">
                    {t("child.weeklyReadBtn")}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Sign out */}
      <form action={signOutChild} className="pt-2">
        <Button type="submit" variant="ghost" size="md" className="w-full text-stone-500">
          {t("child.signOut")}
        </Button>
      </form>
    </div>
  );
}
