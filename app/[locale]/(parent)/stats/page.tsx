import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEV_BYPASS, DEV_FAMILY_ID } from "@/lib/dev-family";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getLevelInfo } from "@/lib/levels";

export const dynamic = "force-dynamic";

export default async function StatsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const supabase = DEV_BYPASS ? createAdminClient() : await createClient();

  const childrenQ = supabase.from("children").select("id, name, avatar_url, lifetime_stars");
  if (DEV_BYPASS) childrenQ.eq("family_id", DEV_FAMILY_ID);
  const { data: children } = await childrenQ.order("created_at");

  // Fetch stats per child
  const stats = await Promise.all(
    (children ?? []).map(async (c) => {
      const [tasksResult, coinsResult, streakResult, badgesResult] = await Promise.all([
        supabase.from("task_assignments").select("id", { count: "exact", head: true })
          .eq("child_id", c.id).eq("status", "approved"),
        supabase.from("coin_transactions").select("amount").eq("child_id", c.id),
        supabase.from("child_streaks").select("current_streak, longest_streak")
          .eq("child_id", c.id).maybeSingle(),
        supabase.from("child_badges").select("id", { count: "exact", head: true })
          .eq("child_id", c.id),
      ]);
      const totalCoinsEarned = (coinsResult.data ?? [])
        .filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);
      const totalCoinsSpent = Math.abs(
        (coinsResult.data ?? []).filter((r) => r.amount < 0).reduce((s, r) => s + r.amount, 0)
      );
      const coinBalance = (coinsResult.data ?? []).reduce((s, r) => s + r.amount, 0);
      const level = getLevelInfo(c.lifetime_stars ?? 0);
      return {
        child: c,
        tasksCompleted: tasksResult.count ?? 0,
        totalCoinsEarned,
        totalCoinsSpent,
        coinBalance,
        streak: streakResult.data?.current_streak ?? 0,
        longestStreak: streakResult.data?.longest_streak ?? 0,
        badgesCount: badgesResult.count ?? 0,
        level,
      };
    }),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">📊 {t("parent.statistics")}</h1>

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
