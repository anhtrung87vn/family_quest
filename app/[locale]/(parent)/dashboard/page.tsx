import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEV_BYPASS, DEV_FAMILY_ID } from "@/lib/dev-family";
import { getLevelInfo } from "@/lib/levels";
import { todayISO } from "@/lib/recurrence";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export default async function ParentDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const supabase = DEV_BYPASS ? createAdminClient() : await createClient();
  const today = todayISO();

  const childrenQ = supabase.from("children").select("id, name, grade, avatar_url, lifetime_stars, current_dream_reward_id");
  if (DEV_BYPASS) childrenQ.eq("family_id", DEV_FAMILY_ID);

  const [{ data: children }, { data: balances }, { count: pendingTasks }, { count: pendingRewards }] = await Promise.all([
    childrenQ,
    supabase.from("child_balances").select("child_id, coin_balance, star_balance"),
    supabase.from("task_completions").select("id", { count: "exact", head: true }).eq("status", "submitted"),
    supabase.from("reward_redemptions").select("id", { count: "exact", head: true }).eq("status", "requested"),
  ]);
  const balMap = new Map((balances ?? []).map((b) => [b.child_id, b]));
  const pendingTotal = (pendingTasks ?? 0) + (pendingRewards ?? 0);

  // Per-child today progress + streak + dream reward
  const childStats = await Promise.all(
    (children ?? []).map(async (c) => {
      const [todayResult, streakResult, dreamResult] = await Promise.all([
        supabase.from("task_assignments")
          .select("id, status")
          .eq("child_id", c.id)
          .lte("due_date", today)
          .in("status", ["todo", "rejected", "submitted", "approved"]),
        supabase.from("child_streaks")
          .select("current_streak, longest_streak")
          .eq("child_id", c.id)
          .maybeSingle(),
        c.current_dream_reward_id
          ? supabase.from("rewards").select("name, coin_cost").eq("id", c.current_dream_reward_id).single()
          : Promise.resolve({ data: null }),
      ]);
      const todayTasks = todayResult.data ?? [];
      const todayDone = todayTasks.filter((t) => t.status === "approved" || t.status === "submitted").length;
      return {
        child: c,
        todayTotal: todayTasks.length,
        todayDone,
        streak: streakResult.data?.current_streak ?? 0,
        dreamReward: dreamResult.data,
      };
    }),
  );

  // Active family quests
  const questsQ = supabase
    .from("family_quests")
    .select("id, title, current_count, target_count")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(3);
  if (DEV_BYPASS) questsQ.eq("family_id", DEV_FAMILY_ID);
  const { data: activeQuests } = await questsQ;

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greetingKey = hour < 12 ? "parent.goodMorning" : hour < 18 ? "parent.goodAfternoon" : "parent.goodEvening";

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <h1 className="text-2xl font-bold text-stone-800">
        {t(greetingKey)} 👋
      </h1>

      {/* No kids onboarding */}
      {(!children || children.length === 0) && (
        <Card className="border-amber-200 bg-amber-50">
          <EmptyState
            icon="👧"
            title={t("parent.noKidsYet")}
            description={t("parent.addKidsHint")}
          />
          <div className="mt-2 text-center">
            <a href={`/${locale}/kids`}>
              <Button size="sm">{t("kids.addChild")}</Button>
            </a>
          </div>
        </Card>
      )}

      {/* ⏳ Pending Approvals CTA */}
      {pendingTotal > 0 && (
        <a href={`/${locale}/approvals`} className="block">
          <Card className="border-blue-200 bg-blue-50 transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-xl">⏳</span>
                <div>
                  <div className="text-sm font-bold text-blue-800">{t("parent.pendingApprovals")}</div>
                  <div className="text-xs text-blue-600">
                    {pendingTasks ?? 0} {t("parent.pendingTasksCount")} · {pendingRewards ?? 0} {t("parent.pendingRewardsCount")}
                  </div>
                </div>
              </div>
              <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700">
                {t("parent.reviewAll")}
              </Button>
            </div>
          </Card>
        </a>
      )}

      {/* 👧 Children cards */}
      {children && children.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {childStats.map(({ child: c, todayTotal, todayDone, streak, dreamReward }) => {
            const b = balMap.get(c.id);
            const level = getLevelInfo(c.lifetime_stars ?? 0);
            const levelTitle = locale === "vi" ? level.title_vi : level.title_en;
            const coinBalance = b?.coin_balance ?? 0;
            return (
              <Card key={c.id} className="space-y-3">
                {/* Child header */}
                <div className="flex items-center gap-3">
                  {c.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-amber-200" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-400 text-lg font-bold text-white ring-2 ring-amber-200">
                      {c.name.slice(0, 1)}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-bold text-stone-800">{c.name}</div>
                    <div className="text-xs text-stone-500">Lv.{level.level} {levelTitle}</div>
                  </div>
                  {streak > 0 && (
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                      🔥 {streak}
                    </span>
                  )}
                </div>

                {/* Stat chips */}
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    🪙 {coinBalance}
                  </span>
                  <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700">
                    ⭐ {b?.star_balance ?? 0}
                  </span>
                </div>

                {/* Today progress */}
                {todayTotal > 0 && (
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-stone-500">
                      <span>🎯 {t("parent.todayProgress")}</span>
                      <span className="font-semibold text-stone-700">{todayDone} / {todayTotal}</span>
                    </div>
                    <ProgressBar value={todayDone} max={todayTotal} color="emerald" size="sm" />
                  </div>
                )}

                {/* Dream reward progress */}
                {dreamReward && (
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-stone-500">
                      <span>🌈 {dreamReward.name}</span>
                      <span className="font-semibold text-stone-700">
                        {Math.min(100, Math.round((coinBalance / dreamReward.coin_cost) * 100))}%
                      </span>
                    </div>
                    <ProgressBar value={coinBalance} max={dreamReward.coin_cost} color="purple" size="sm" />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* 👭 Family Quests */}
      {activeQuests && activeQuests.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-stone-800">
            👭 {t("parent.familyQuests")}
          </h2>
          <div className="space-y-3">
            {activeQuests.map((q) => (
              <Card key={q.id} className="border-pink-200 bg-pink-50">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-stone-800">{q.title}</div>
                  <span className="text-xs font-semibold text-pink-600">
                    {q.current_count} / {q.target_count}
                  </span>
                </div>
                <ProgressBar value={q.current_count} max={q.target_count} color="pink" size="sm" className="mt-2" />
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
