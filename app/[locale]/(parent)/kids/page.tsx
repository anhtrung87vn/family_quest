import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEV_BYPASS, DEV_FAMILY_ID } from "@/lib/dev-family";
import { getLevelInfo } from "@/lib/levels";
import { levelIcon } from "@/lib/category-style";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Collapsible } from "@/components/ui/Collapsible";
import { createChild, uploadAvatar, setPin, revokeAssignment } from "./actions";

export default async function KidsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const supabase = DEV_BYPASS ? createAdminClient() : await createClient();

  const q = supabase.from("children").select("id, name, grade, avatar_url, preferred_language, lifetime_stars, current_dream_reward_id");
  if (DEV_BYPASS) q.eq("family_id", DEV_FAMILY_ID);
  const { data: children } = await q.order("created_at", { ascending: true });

  // Fetch balances, streaks, dream rewards, assigned tasks per child
  const childDetails = await Promise.all(
    (children ?? []).map(async (c) => {
      const [balResult, streakResult, dreamResult, assignResult] = await Promise.all([
        supabase.from("child_balances").select("coin_balance, star_balance").eq("child_id", c.id).maybeSingle(),
        supabase.from("child_streaks").select("current_streak, longest_streak").eq("child_id", c.id).maybeSingle(),
        c.current_dream_reward_id
          ? supabase.from("rewards").select("name, coin_cost").eq("id", c.current_dream_reward_id).single()
          : Promise.resolve({ data: null }),
        supabase
          .from("task_assignments")
          .select("id, status, due_date, task:tasks(name, coin_reward, star_reward)")
          .eq("child_id", c.id)
          .in("status", ["todo", "submitted", "rejected"])
          .order("created_at", { ascending: false }),
      ]);
      return {
        child: c,
        coin: balResult.data?.coin_balance ?? 0,
        star: balResult.data?.star_balance ?? 0,
        streak: streakResult.data?.current_streak ?? 0,
        longestStreak: streakResult.data?.longest_streak ?? 0,
        dreamReward: dreamResult.data,
        assignments: assignResult.data ?? [],
      };
    }),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">👧 {t("parent.kids")}</h1>
      </div>

      {/* Add child — collapsible */}
      <Card>
        <Collapsible
          trigger={
            <span className="text-sm font-semibold text-stone-700">+ {t("kids.addChild")}</span>
          }
        >
          <form action={createChild} className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-stone-500">{t("kids.name")}</span>
              <input name="name" required className="h-11 rounded-xl border border-stone-300 px-3 text-sm" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-stone-500">{t("kids.grade")}</span>
              <input name="grade" type="number" min="1" max="12" className="h-11 rounded-xl border border-stone-300 px-3 text-sm" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-stone-500">{t("kids.language")}</span>
              <select name="preferred_language" defaultValue="en" className="h-11 rounded-xl border border-stone-300 px-3 text-sm">
                <option value="en">English</option>
                <option value="vi">Tiếng Việt</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-stone-500">🔐 {t("kids.pin")}</span>
              <input name="pin" inputMode="numeric" pattern="\d{6}" maxLength={6} minLength={6} required
                className="h-11 rounded-xl border border-stone-300 px-3 text-sm" placeholder="••••••" />
            </label>
            <div className="sm:col-span-2">
              <Button type="submit">{t("kids.addChild")}</Button>
            </div>
          </form>
        </Collapsible>
      </Card>

      {/* No children state */}
      {(!children || children.length === 0) && (
        <Card className="border-amber-200 bg-amber-50">
          <EmptyState
            icon="👧"
            title={t("parent.noKidsYet")}
            description={t("parent.addKidsHint")}
          />
        </Card>
      )}

      {/* Child profile cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {childDetails.map(({ child: c, coin, star, streak, longestStreak, dreamReward, assignments }) => {
          const level = getLevelInfo(c.lifetime_stars ?? 0);
          const levelTitle = locale === "vi" ? level.title_vi : level.title_en;
          const lvIcon = levelIcon(level.level);
          return (
            <Card key={c.id} className="space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3">
                {c.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.avatar_url} alt={c.name} className="h-14 w-14 rounded-full object-cover ring-2 ring-amber-200" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-400 text-lg font-bold text-white ring-2 ring-amber-200">
                    {c.name.slice(0, 1)}
                  </div>
                )}
                <div className="flex-1">
                  <div className="text-lg font-bold text-stone-800">{c.name}</div>
                  <div className="text-xs text-stone-500">
                    {c.grade != null ? `Grade ${c.grade} · ` : ""}
                    {c.preferred_language === "vi" ? "Tiếng Việt" : "English"}
                  </div>
                  <div className="mt-0.5 text-xs text-indigo-500">{lvIcon} Lv.{level.level} {levelTitle}</div>
                </div>
              </div>

              {/* Stat chips */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">🪙 {coin}</span>
                <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700">⭐ {star}</span>
                {streak > 0 && (
                  <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">🔥 {streak}</span>
                )}
              </div>

              {/* Level progress */}
              {level.nextLevelStars && (
                <div>
                  <ProgressBar
                    value={c.lifetime_stars - level.minStars}
                    max={level.nextLevelStars - level.minStars}
                    color="indigo"
                    size="sm"
                  />
                  <div className="mt-0.5 text-[10px] text-stone-400">
                    {c.lifetime_stars} / {level.nextLevelStars} ⭐ → Lv.{level.level + 1}
                  </div>
                </div>
              )}

              {/* Dream reward */}
              {dreamReward && (
                <div className="rounded-xl bg-purple-50 p-3">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-purple-700">🌈 {dreamReward.name}</span>
                    <span className="font-semibold text-purple-700">
                      {Math.min(100, Math.round((coin / dreamReward.coin_cost) * 100))}%
                    </span>
                  </div>
                  <ProgressBar value={coin} max={dreamReward.coin_cost} color="purple" size="sm" />
                </div>
              )}

              {/* Assigned tasks */}
              {assignments.length > 0 && (
                <div className="border-t border-stone-100 pt-3">
                  <Collapsible
                    trigger={
                      <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100">
                        📋 Nhiệm vụ đang giao ({assignments.length})
                      </span>
                    }
                  >
                    <ul className="mt-2 space-y-1.5">
                      {assignments.map((a) => {
                        const task = Array.isArray(a.task) ? a.task[0] : a.task;
                        const statusColor =
                          a.status === "submitted" ? "text-amber-600 bg-amber-50" :
                          a.status === "rejected"  ? "text-red-500 bg-red-50" :
                          "text-stone-500 bg-stone-100";
                        const statusLabel =
                          a.status === "submitted" ? "Chờ duyệt" :
                          a.status === "rejected"  ? "Bị từ chối" : "Đang làm";
                        return (
                          <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-stone-100 bg-stone-50 px-3 py-2">
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-xs font-medium text-stone-800">{task?.name}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${statusColor}`}>{statusLabel}</span>
                                {task?.coin_reward ? <span className="text-[10px] text-amber-600">🪙 {task.coin_reward}</span> : null}
                                {a.due_date && <span className="text-[10px] text-stone-400">{a.due_date}</span>}
                              </div>
                            </div>
                            {a.status !== "submitted" && (
                              <form action={revokeAssignment}>
                                <input type="hidden" name="assignment_id" value={a.id} />
                                <button
                                  type="submit"
                                  title="Rút lại nhiệm vụ"
                                  className="rounded-full p-1 text-stone-300 hover:bg-red-50 hover:text-red-400 transition-colors"
                                >
                                  ✕
                                </button>
                              </form>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </Collapsible>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 border-t border-stone-100 pt-3">
                <Collapsible
                  trigger={
                    <span className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-200">
                      📷 {t("kids.changeAvatar")}
                    </span>
                  }
                >
                  <form action={uploadAvatar} className="flex items-center gap-2">
                    <input type="hidden" name="child_id" value={c.id} />
                    <input type="file" name="avatar" accept="image/*" required className="text-xs" />
                    <Button type="submit" size="sm" variant="secondary">{t("common.save")}</Button>
                  </form>
                </Collapsible>

                <Collapsible
                  trigger={
                    <span className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-200">
                      🔐 {t("kids.changePin")}
                    </span>
                  }
                >
                  <form action={setPin} className="flex items-center gap-2">
                    <input type="hidden" name="child_id" value={c.id} />
                    <input name="pin" inputMode="numeric" pattern="\d{6}" maxLength={6} minLength={6} required
                      placeholder="••••••" className="h-9 w-28 rounded-xl border border-stone-300 px-3 text-sm" />
                    <Button type="submit" size="sm" variant="secondary">{t("kids.setPin")}</Button>
                  </form>
                </Collapsible>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
