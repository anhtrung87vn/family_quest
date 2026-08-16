import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEV_BYPASS, DEV_FAMILY_ID } from "@/lib/dev-family";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Collapsible } from "@/components/ui/Collapsible";
import { createFamilyQuest, contributeToQuest, cancelQuest } from "./actions";
import { CloneQuestsButton } from "./CloneQuestsButton";

export const dynamic = "force-dynamic";

export default async function FamilyQuestsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const supabase = DEV_BYPASS ? createAdminClient() : await createClient();

  const questsQ = supabase
    .from("family_quests")
    .select("*, members:family_quest_members(child_id, contributions, child:children(name))")
    .in("status", ["active", "completed"])
    .order("created_at", { ascending: false });
  if (DEV_BYPASS) questsQ.eq("family_id", DEV_FAMILY_ID);

  const childrenQ = supabase.from("children").select("id, name");
  if (DEV_BYPASS) childrenQ.eq("family_id", DEV_FAMILY_ID);

  const [{ data: quests }, { data: children }] = await Promise.all([
    questsQ,
    childrenQ.order("created_at"),
  ]);

  const activeQuests = (quests ?? []).filter((q) => q.status === "active");
  const completedQuests = (quests ?? []).filter((q) => q.status === "completed");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">👭 {t("parent.familyQuests")}</h1>

      {/* Create quest — collapsible */}
      <Card>
        <Collapsible
          trigger={
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-stone-700">+ {t("parent.newQuest")}</span>
              <CloneQuestsButton label={t("parent.cloneQuestTemplates")} />
            </div>
          }
        >
          <form action={createFamilyQuest} className="space-y-4">
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                {t("tasks.infoSection")}
              </legend>
              <input name="title" required placeholder={t("parent.questTitle")}
                className="h-11 w-full rounded-xl border border-stone-300 px-3 text-sm" />
              <textarea name="description" placeholder={t("parent.questDescription")}
                className="w-full rounded-xl border border-stone-300 p-3 text-sm" rows={2} />
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                {t("parent.questGoal")}
              </legend>
              <div className="grid grid-cols-3 gap-3">
                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-stone-500">🎯 {t("parent.questTargetLabel")}</span>
                  <input name="target_count" type="number" min="1" defaultValue="10"
                    className="h-10 rounded-xl border border-stone-300 px-3 text-sm" />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-amber-600">🪙 {t("common.coins")}</span>
                  <input name="coin_reward" type="number" min="0" defaultValue="20"
                    className="h-10 rounded-xl border border-stone-300 px-3 text-sm" />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-purple-600">⭐ {t("common.stars")}</span>
                  <input name="star_reward" type="number" min="0" defaultValue="5"
                    className="h-10 rounded-xl border border-stone-300 px-3 text-sm" />
                </label>
              </div>
              <label className="flex flex-col gap-1 text-xs">
                <span className="text-stone-500">📅 {t("parent.questEndDate")}</span>
                <input name="end_date" type="date"
                  className="h-10 w-full rounded-xl border border-stone-300 px-3 text-sm" />
              </label>
            </fieldset>

            <Button type="submit" className="w-full sm:w-auto">{t("parent.createQuest")}</Button>
          </form>
        </Collapsible>
      </Card>

      {/* Active quests */}
      {activeQuests.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-pink-700">
            🚀 {t("parent.activeQuests")}
          </h2>
          <div className="space-y-3">
            {activeQuests.map((q) => {
              const pct = Math.round((q.current_count / q.target_count) * 100);
              return (
                <Card key={q.id} className="border-pink-200 bg-pink-50 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-stone-800">{q.title}</h3>
                      {q.description && <p className="mt-0.5 text-xs text-stone-500">{q.description}</p>}
                    </div>
                    <form action={cancelQuest}>
                      <input type="hidden" name="quest_id" value={q.id} />
                      <Button size="sm" variant="ghost" type="submit" className="text-xs text-stone-400 hover:text-stone-600">✕</Button>
                    </form>
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-stone-500">{q.current_count} / {q.target_count}</span>
                      <span className="font-semibold text-pink-600">{pct}%</span>
                    </div>
                    <ProgressBar value={q.current_count} max={q.target_count} color="pink" />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {q.coin_reward > 0 && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">🪙 {q.coin_reward}</span>
                    )}
                    {q.star_reward > 0 && (
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-700">⭐ {q.star_reward}</span>
                    )}
                    {q.end_date && (
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-500">📅 {q.end_date}</span>
                    )}
                  </div>

                  {/* Member contributions */}
                  {q.members?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {q.members.map((m: { child_id: string; contributions: number; child: { name: string } | { name: string }[] }) => {
                        const child = Array.isArray(m.child) ? m.child[0] : m.child;
                        return (
                          <span key={m.child_id} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-stone-700 shadow-sm">
                            {child?.name}: {m.contributions}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Contribute buttons */}
                  {children?.length && (
                    <div className="flex flex-wrap gap-2 border-t border-pink-200 pt-3">
                      {children.map((c) => (
                        <form key={c.id} action={contributeToQuest}>
                          <input type="hidden" name="quest_id" value={q.id} />
                          <input type="hidden" name="child_id" value={c.id} />
                          <Button size="sm" variant="secondary" type="submit" className="text-xs">+1 {c.name}</Button>
                        </form>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Completed quests */}
      {completedQuests.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-emerald-700">
            ✅ {t("parent.completedQuests")}
          </h2>
          <div className="space-y-3">
            {completedQuests.map((q) => (
              <Card key={q.id} className="border-emerald-100 bg-emerald-50 opacity-80">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-stone-800">{q.title}</h3>
                    <div className="mt-0.5 text-xs text-stone-400">
                      {q.target_count} / {q.target_count}
                      {q.coin_reward > 0 && ` · 🪙 ${q.coin_reward}`}
                      {q.star_reward > 0 && ` · ⭐ ${q.star_reward}`}
                    </div>
                  </div>
                  <span className="text-lg">🎉</span>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!quests?.length && (
        <Card>
          <EmptyState
            icon="👭"
            title={t("parent.noQuestsTitle")}
            description={t("parent.noQuestsDesc")}
          />
        </Card>
      )}
    </div>
  );
}
