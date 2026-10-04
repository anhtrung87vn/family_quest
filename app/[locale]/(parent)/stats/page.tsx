import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveContext } from "@/lib/dev-family";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getLevelInfo } from "@/lib/levels";
import { Link } from "@/lib/i18n/routing";
import { getIndependenceTrend, type IndependenceTrend } from "@/lib/responsibility";

export const dynamic = "force-dynamic";

export default async function StatsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const { familyId, supabase } = await resolveContext();

  const { data: children } = await supabase.from("children").select("id, name, avatar_url, lifetime_stars").eq("family_id", familyId).order("created_at");

  const childIds = (children ?? []).map((c) => c.id);

  // Batch: fetch all stats for all children in parallel (instead of N+1 per child)
  const [
    { data: allCoinTxs },
    { data: allStreaks },
    { data: allBadgeCounts },
    { data: allBalances },
  ] = childIds.length
    ? await Promise.all([
        // Fetch only child_id + amount (no SELECT *), used for earned/spent totals
        supabase.from("coin_transactions").select("child_id, amount").in("child_id", childIds),
        supabase.from("child_streaks").select("child_id, current_streak, longest_streak").in("child_id", childIds),
        supabase.from("child_badges").select("child_id").in("child_id", childIds),
        supabase.from("child_balances").select("child_id, coin_balance").in("child_id", childIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

  // Index results by child_id
  const coinsByChild = new Map<string, { earned: number; spent: number }>();
  for (const tx of allCoinTxs ?? []) {
    const entry = coinsByChild.get(tx.child_id) ?? { earned: 0, spent: 0 };
    if (tx.amount > 0) entry.earned += tx.amount;
    else entry.spent += Math.abs(tx.amount);
    coinsByChild.set(tx.child_id, entry);
  }
  const streakByChild = new Map((allStreaks ?? []).map((s) => [s.child_id, s]));
  const badgeCountByChild = new Map<string, number>();
  for (const b of allBadgeCounts ?? []) {
    badgeCountByChild.set(b.child_id, (badgeCountByChild.get(b.child_id) ?? 0) + 1);
  }
  const balanceByChild = new Map((allBalances ?? []).map((b) => [b.child_id, b.coin_balance ?? 0]));

  // Fetch approved task counts per child in one query
  const { data: approvedCounts } = childIds.length
    ? await supabase.from("task_assignments").select("child_id").in("child_id", childIds).eq("status", "approved")
    : { data: [] };
  const approvedByChild = new Map<string, number>();
  for (const a of approvedCounts ?? []) {
    approvedByChild.set(a.child_id, (approvedByChild.get(a.child_id) ?? 0) + 1);
  }

  const stats = (children ?? []).map((c) => {
    const coins = coinsByChild.get(c.id) ?? { earned: 0, spent: 0 };
    const streak = streakByChild.get(c.id);
    const level = getLevelInfo(c.lifetime_stars ?? 0);
    return {
      child: c,
      tasksCompleted: approvedByChild.get(c.id) ?? 0,
      totalCoinsEarned: coins.earned,
      totalCoinsSpent: coins.spent,
      coinBalance: balanceByChild.get(c.id) ?? 0,
      streak: streak?.current_streak ?? 0,
      longestStreak: streak?.longest_streak ?? 0,
      badgesCount: badgeCountByChild.get(c.id) ?? 0,
      level,
    };
  });

  // Fetch independence trends per child
  let independenceTrends: IndependenceTrend[] = [];
  try {
    independenceTrends = await Promise.all(
      (children ?? []).map((c) => getIndependenceTrend(familyId, c.id)),
    );
  } catch (e) {
    console.error("[stats] independence trends error:", e);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">📊 {t("parent.statistics")}</h1>

      {/* Development insights links */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/stats/coverage">
          <Card className="flex items-center gap-3 transition hover:border-amber-200 hover:shadow-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 text-xl">🧭</div>
            <div>
              <div className="text-sm font-semibold text-stone-800">{t("parent.coverageTitle")}</div>
              <div className="text-xs text-stone-400">{t("parent.coverageDesc")}</div>
            </div>
          </Card>
        </Link>
        <Link href="/stats/ladders">
          <Card className="flex items-center gap-3 transition hover:border-amber-200 hover:shadow-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 text-xl">📈</div>
            <div>
              <div className="text-sm font-semibold text-stone-800">{t("parent.laddersTitle")}</div>
              <div className="text-xs text-stone-400">{t("parent.laddersDesc")}</div>
            </div>
          </Card>
        </Link>
      </div>

      {/* 🌱 Growing Independence */}
      {independenceTrends.some((tr) => tr.forgottenCount > 0 || tr.repairsCompleted > 0 || tr.habitsGraduated > 0) && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-emerald-700">
            🌱 {t("parent.independenceTitle")}
          </h2>
          <div className="space-y-3">
            {independenceTrends.map((tr) => {
              const hasData = tr.forgottenCount > 0 || tr.repairsCompleted > 0 || tr.habitsGraduated > 0;
              if (!hasData) return null;
              const reminderTrend = tr.remindersThisWeek < tr.remindersPrevWeek
                ? "fewer" : tr.remindersThisWeek > tr.remindersPrevWeek
                ? "more" : "same";
              return (
                <Card key={tr.childId} className="border-emerald-100">
                  <div className="font-semibold text-stone-800 mb-3">{tr.childName}</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-emerald-50 p-2.5 text-center">
                      <div className="text-lg font-bold text-emerald-600">{tr.independentCompletions}</div>
                      <div className="text-[10px] text-stone-500">{t("parent.independentDays")}</div>
                    </div>
                    <div className="rounded-xl bg-amber-50 p-2.5 text-center">
                      <div className="text-lg font-bold text-amber-600">{tr.remindersThisWeek}</div>
                      <div className="text-[10px] text-stone-500">{t("parent.remindersThisWeek")}</div>
                    </div>
                    <div className="rounded-xl bg-blue-50 p-2.5 text-center">
                      <div className="text-lg font-bold text-blue-600">{tr.repairsCompleted}</div>
                      <div className="text-[10px] text-stone-500">{t("parent.repairsCompleted")}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className={`rounded-full px-2.5 py-1 ${
                      reminderTrend === "fewer" ? "bg-emerald-100 text-emerald-700" :
                      reminderTrend === "more" ? "bg-amber-100 text-amber-700" :
                      "bg-stone-100 text-stone-500"
                    }`}>
                      {reminderTrend === "fewer" ? `📉 ${t("parent.fewerReminders")}` :
                       reminderTrend === "more" ? `📈 ${t("parent.moreReminders")}` :
                       `➡️ ${t("parent.sameReminders")}`}
                    </span>
                    {tr.habitsGraduated > 0 && (
                      <span className="rounded-full bg-purple-100 px-2.5 py-1 text-purple-700">
                        🎓 {tr.habitsGraduated} {t("parent.habitsGraduated")}
                      </span>
                    )}
                  </div>
                  {tr.topNeedSupport.length > 0 && (
                    <div className="mt-2 text-xs text-stone-500">
                      <span className="font-medium text-stone-600">{t("parent.mayNeedSupport")}:</span>{" "}
                      {tr.topNeedSupport.map((ns) => {
                        const name = (locale === "vi" && ns.taskNameVi) ? ns.taskNameVi : ns.taskName;
                        return name;
                      }).join(", ")}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {stats.map((s) => {
        const levelTitle = locale === "vi" ? s.level.title_vi : s.level.title_en;
        return (
          <Card key={s.child.id} className="space-y-4">
            <div className="flex items-center gap-3">
              {s.child.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.child.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-amber-200" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-400 text-lg font-bold text-white ring-2 ring-amber-200">
                  {s.child.name.slice(0, 1)}
                </div>
              )}
              <div className="flex-1">
                <div className="font-bold text-stone-800">{s.child.name}</div>
                <div className="text-xs text-indigo-500">Lv.{s.level.level} {levelTitle}</div>
              </div>
            </div>

            {s.level.nextLevelStars && (
              <div>
                <ProgressBar
                  value={s.child.lifetime_stars - s.level.minStars}
                  max={s.level.nextLevelStars - s.level.minStars}
                  color="indigo"
                  size="sm"
                />
                <div className="mt-0.5 text-[10px] text-stone-400">
                  {s.child.lifetime_stars} / {s.level.nextLevelStars} ⭐ → Lv.{s.level.level + 1}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-amber-50 p-3 text-center">
                <div className="text-xl font-bold text-amber-600">🪙 {s.coinBalance}</div>
                <div className="text-[11px] text-stone-500">{t("parent.currentBalance")}</div>
              </div>
              <div className="rounded-xl bg-purple-50 p-3 text-center">
                <div className="text-xl font-bold text-purple-600">⭐ {s.child.lifetime_stars}</div>
                <div className="text-[11px] text-stone-500">{t("common.stars")}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-emerald-50 p-2.5 text-center">
                <div className="text-lg font-bold text-emerald-600">{s.tasksCompleted}</div>
                <div className="text-[10px] text-stone-500">✅ {t("parent.tasksCompleted")}</div>
              </div>
              <div className="rounded-xl bg-amber-50 p-2.5 text-center">
                <div className="text-lg font-bold text-amber-600">{s.badgesCount}</div>
                <div className="text-[10px] text-stone-500">🏅 {t("child.badges")}</div>
              </div>
              <div className="rounded-xl bg-orange-50 p-2.5 text-center">
                <div className="text-lg font-bold text-orange-600">{s.streak}</div>
                <div className="text-[10px] text-stone-500">� {t("parent.currentStreak")}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-stone-500">
              <span className="rounded-full bg-stone-100 px-2.5 py-1">� {t("parent.earned")}: <strong className="text-stone-700">{s.totalCoinsEarned}</strong></span>
              <span className="rounded-full bg-stone-100 px-2.5 py-1">� {t("parent.spent")}: <strong className="text-stone-700">{s.totalCoinsSpent}</strong></span>
              <span className="rounded-full bg-stone-100 px-2.5 py-1">🏆 {t("parent.longestStreak")}: <strong className="text-stone-700">{s.longestStreak}</strong></span>
            </div>
          </Card>
        );
      })}

      {!stats.length && (
        <Card>
          <div className="py-6 text-center">
            <div className="text-3xl">📊</div>
            <p className="mt-2 text-sm text-stone-400">{t("parent.noChildren")}</p>
          </div>
        </Card>
      )}
    </div>
  );
}
