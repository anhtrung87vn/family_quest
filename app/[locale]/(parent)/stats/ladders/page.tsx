import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveContext } from "@/lib/dev-family";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { getSkillLadderProgress, getGraduatedHabits } from "@/lib/coverage";
import { SKILL_LADDERS } from "@/lib/ladders";
import { Link } from "@/lib/i18n/routing";

export const dynamic = "force-dynamic";

export default async function LaddersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ child?: string }>;
}) {
  const { locale } = await params;
  const { child: selectedChildId } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations();
  const isVi = locale === "vi";
  const { familyId, supabase } = await resolveContext();

  const { data: children } = await supabase
    .from("children")
    .select("id, name, avatar_url")
    .eq("family_id", familyId)
    .order("created_at");

  const childId = selectedChildId || children?.[0]?.id;
  const selectedChild = children?.find((c) => c.id === childId);

  const [ladders, graduated] = childId
    ? await Promise.all([getSkillLadderProgress(childId), getGraduatedHabits(childId)])
    : [[], []];

  const hasAnyProgress = ladders.some((l) => l.maxCompletedLevel > 0);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/stats" className="text-xs text-stone-400 hover:text-stone-600">
          ← {t("parent.statistics")}
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-stone-800">📈 {t("parent.laddersTitle")}</h1>
        <p className="mt-1 text-sm text-stone-500">{t("parent.laddersSubtitle")}</p>
      </div>

      {/* Child selector */}
      {children && children.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {children.map((c) => (
            <Link
              key={c.id}
              href={`/stats/ladders?child=${c.id}`}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                c.id === childId
                  ? "bg-amber-500 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      {!childId ? (
        <EmptyState icon="👧" title={t("parent.noChildren")} />
      ) : !hasAnyProgress ? (
        <Card className="py-10 text-center">
          <div className="text-3xl">📈</div>
          <p className="mt-2 text-sm text-stone-500">{t("parent.laddersEmpty")}</p>
          <Link
            href="/library"
            className="mt-3 inline-block rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
          >
            {t("parent.coverageExploreLibrary")}
          </Link>
        </Card>
      ) : (
        <>
          {selectedChild && (
            <p className="text-sm text-stone-500">
              {t("parent.laddersFor", { name: selectedChild.name })}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {ladders.map((ladder) => {
              const meta = SKILL_LADDERS[ladder.ladderKey];
              if (!meta) return null;
              const completed = ladder.maxCompletedLevel;
              const total = ladder.totalLevels;
              const nextLevel = completed < total ? completed + 1 : null;

              return (
                <Card key={ladder.ladderKey} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-stone-800">
                      {meta.icon} {isVi ? meta.label_vi : meta.label_en}
                    </span>
                    <span className="text-xs text-stone-400">
                      {t("parent.laddersLevel", { current: completed, total })}
                    </span>
                  </div>

                  {/* Progress dots */}
                  <div className="flex flex-wrap gap-1">
                    {Array.from({ length: total }).map((_, i) => {
                      const level = i + 1;
                      const isCompleted = level <= completed;
                      const isNext = level === nextLevel;
                      return (
                        <div
                          key={level}
                          className={`h-3.5 w-3.5 rounded-full border transition ${
                            isCompleted
                              ? "border-emerald-400 bg-emerald-400"
                              : isNext
                                ? "border-amber-400 bg-amber-100 ring-1 ring-amber-300"
                                : "border-stone-200 bg-stone-50"
                          }`}
                          title={`Level ${level}${isCompleted ? " ✓" : isNext ? " (next)" : ""}`}
                        />
                      );
                    })}
                  </div>

                  {/* Next level suggestion */}
                  {nextLevel && (
                    <p className="text-[11px] text-amber-600">
                      ↑ {t("parent.laddersNext", { level: nextLevel })}
                    </p>
                  )}
                  {completed === total && (
                    <p className="text-[11px] font-medium text-emerald-600">
                      🎓 {t("parent.laddersComplete")}
                    </p>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Graduated habits */}
          {graduated.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-stone-700">🎓 {t("parent.graduatedHabits")}</h2>
              <Card className="space-y-2">
                {graduated.map((h) => {
                  const daysSince = Math.floor(
                    (Date.now() - new Date(h.graduated_at).getTime()) / (1000 * 60 * 60 * 24)
                  );
                  const timeAgo =
                    daysSince < 30
                      ? t("parent.graduatedDaysAgo", { days: daysSince })
                      : t("parent.graduatedMonthsAgo", { months: Math.floor(daysSince / 30) });
                  return (
                    <div key={h.task_id} className="flex items-center gap-2 text-xs">
                      <span className="text-emerald-500">✓</span>
                      <span className="font-medium text-stone-700">
                        {isVi ? h.task_name_vi || h.task_name : h.task_name}
                      </span>
                      <span className="text-stone-400">— {timeAgo}</span>
                    </div>
                  );
                })}
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
