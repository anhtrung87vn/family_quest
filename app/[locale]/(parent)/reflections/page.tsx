import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEV_BYPASS, DEV_FAMILY_ID } from "@/lib/dev-family";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Collapsible } from "@/components/ui/Collapsible";
import { saveReflection } from "./actions";

export const dynamic = "force-dynamic";

function currentWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().slice(0, 10);
}

export default async function ReflectionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const supabase = DEV_BYPASS ? createAdminClient() : await createClient();
  const weekStart = currentWeekStart();

  const childrenQ = supabase.from("children").select("id, name, avatar_url");
  if (DEV_BYPASS) childrenQ.eq("family_id", DEV_FAMILY_ID);
  const { data: children } = await childrenQ.order("created_at");

  const { data: existing } = await supabase
    .from("weekly_reflections")
    .select("*")
    .eq("week_start", weekStart);

  const reflectionMap = new Map(
    (existing ?? []).map((r) => [r.child_id, r]),
  );

  // Per-child badges earned this week
  const childBadges = await Promise.all(
    (children ?? []).map(async (c) => {
      const { data } = await supabase
        .from("child_badges")
        .select("badge:badges(icon, name_en, name_vi)")
        .eq("child_id", c.id)
        .gte("earned_at", weekStart)
        .limit(5);
      return { childId: c.id, badges: data ?? [] };
    }),
  );
  const badgeMap = new Map(childBadges.map((b) => [b.childId, b.badges]));

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2">
        <h1 className="text-xl font-bold text-stone-800">📖 {t("parent.weeklyReflection")}</h1>
        <span className="text-xs text-stone-400">{weekStart}</span>
      </div>

      {children?.map((c) => {
        const ref = reflectionMap.get(c.id);
        const weekBadges = badgeMap.get(c.id) ?? [];
        return (
          <Card key={c.id} className="!p-3">
            <Collapsible
              trigger={
                <div className="flex items-center gap-2">
                  {c.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover ring-2 ring-stone-200 shrink-0" />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-200 text-[11px] font-bold shrink-0">
                      {c.name.slice(0, 1)}
                    </div>
                  )}
                  <span className="font-semibold text-sm text-stone-800">{c.name}</span>
                  {ref && (
                    <div className="flex items-center gap-1.5 ml-1">
                      <span className="rounded-full bg-emerald-100 px-1.5 py-0 text-[10px] font-semibold text-emerald-700 leading-5">✅ {ref.tasks_completed}</span>
                      <span className="rounded-full bg-amber-100 px-1.5 py-0 text-[10px] font-semibold text-amber-700 leading-5">🪙 {ref.coins_earned}</span>
                      <span className="rounded-full bg-purple-100 px-1.5 py-0 text-[10px] font-semibold text-purple-700 leading-5">⭐ {ref.stars_earned}</span>
                    </div>
                  )}
                </div>
              }
            >
              <div className="space-y-3 pt-1">
                {/* Badges earned this week */}
                {weekBadges.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-semibold text-amber-600">🏆</span>
                    {weekBadges.map((b, i) => {
                      const badge = Array.isArray(b.badge) ? b.badge[0] : b.badge;
                      return (
                        <span key={i} className="rounded-full bg-amber-100 px-1.5 py-0 text-[10px] font-medium text-amber-700 leading-5">
                          {badge?.icon} {locale === "vi" ? badge?.name_vi : badge?.name_en}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Reflection form */}
                <form action={saveReflection} className="space-y-2">
                  <input type="hidden" name="child_id" value={c.id} />
                  <input type="hidden" name="week_start" value={weekStart} />
                  <div>
                    <label className="mb-0.5 flex items-center gap-1 text-xs font-medium text-stone-600">
                      🌟 {t("parent.highlightsLabel")}
                    </label>
                    <textarea name="highlights" rows={2}
                      defaultValue={ref?.highlights ?? ""}
                      className="w-full rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs"
                      placeholder={t("parent.highlightsPlaceholder")} />
                  </div>
                  <div>
                    <label className="mb-0.5 flex items-center gap-1 text-xs font-medium text-stone-600">
                      🌱 {t("parent.growthLabel")}
                    </label>
                    <textarea name="growth_note" rows={2}
                      defaultValue={(ref as Record<string, unknown>)?.growth_note as string ?? ""}
                      className="w-full rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs"
                      placeholder={t("parent.growthPlaceholder")} />
                  </div>
                  <div>
                    <label className="mb-0.5 flex items-center gap-1 text-xs font-medium text-stone-600">
                      ❤️ {t("parent.parentMessage")}
                    </label>
                    <textarea name="parent_message" rows={2}
                      defaultValue={ref?.parent_message ?? ""}
                      className="w-full rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs"
                      placeholder={t("parent.messagePlaceholder")} />
                  </div>
                  <Button type="submit" size="sm" className="h-8 text-xs">{t("parent.saveReflection")}</Button>
                </form>
              </div>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
}
