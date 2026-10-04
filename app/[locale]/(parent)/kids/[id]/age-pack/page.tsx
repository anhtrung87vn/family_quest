import { getTranslations, setRequestLocale } from "next-intl/server";
import { z } from "zod";
import { resolveContext } from "@/lib/dev-family";
import { assertChildInFamily } from "@/lib/authz";
import { loadAgeSuggestions } from "@/lib/age-provisioning";
import { behaviorStyle, rewardStyle } from "@/lib/category-style";
import { Link } from "@/lib/i18n/routing";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { sendAgePack } from "../../actions";
import { CoinIcon } from "@/components/ui/CoinIcon";

export const dynamic = "force-dynamic";

interface Item {
  id: string;
  name: string;
  name_vi?: string | null;
}

export default async function AgePackPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const childId = z.string().uuid().parse(id);
  const { familyId, supabase } = await resolveContext();
  await assertChildInFamily(childId, familyId);

  const [{ data: child }, s] = await Promise.all([
    supabase.from("children").select("name").eq("id", childId).single(),
    loadAgeSuggestions(childId, familyId),
  ]);
  const name = child?.name ?? "";
  const label = (i: Item) => (locale === "vi" && i.name_vi ? i.name_vi : i.name);
  const vnd = new Intl.NumberFormat("vi-VN");

  const back = (
    <Link href="/kids" className="text-sm text-stone-500 hover:text-stone-700">← {t("parent.kids")}</Link>
  );

  if (s.age == null) {
    return (
      <div className="space-y-4">
        {back}
        <Card className="border-amber-200 bg-amber-50">
          <EmptyState icon="🎂" title={t("kids.agePackNeedsBirthday", { name })} />
        </Card>
      </div>
    );
  }

  const nothing = s.pool.length + s.core.length + s.rewards.length === 0;

  return (
    <div className="space-y-5">
      {back}
      <div>
        <h1 className="text-2xl font-bold text-stone-800">🎁 {t("kids.agePackTitle", { name, age: s.age })}</h1>
        <p className="mt-1 text-sm text-stone-500">{t("kids.agePackIntro", { name })}</p>
      </div>

      {nothing ? (
        <Card>
          <EmptyState icon="✅" title={t("kids.agePackEmpty")} />
        </Card>
      ) : (
        <form action={sendAgePack} className="space-y-5">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="child_id" value={childId} />

          {[
            { key: "pool", items: s.pool, title: t("kids.agePackPool"), hint: t("kids.agePackPoolHint", { name }) },
            { key: "core", items: s.core, title: t("kids.agePackCore"), hint: t("kids.agePackCoreHint", { name }) },
          ].map((group) => group.items.length > 0 && (
            <Card key={group.key} className="space-y-3">
              <div>
                <h2 className="font-semibold text-stone-800">{group.title} ({group.items.length})</h2>
                <p className="text-xs text-stone-500">{group.hint}</p>
              </div>
              <ul className="space-y-2">
                {group.items.map((q) => {
                  const b = behaviorStyle(q.behavior_type ?? "challenge");
                  return (
                    <li key={q.id}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-200 px-3 py-2 hover:bg-stone-50">
                        <input type="checkbox" name="task_template_ids" value={q.id} defaultChecked className="h-4 w-4 accent-amber-500" />
                        <span className="text-lg">{b.icon}</span>
                        <span className="min-w-0 flex-1 truncate text-sm text-stone-800">{label(q)}</span>
                        <span className="text-[11px] text-stone-400">{q.min_age}–{q.max_age}</span>
                        {q.coin_reward > 0 && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700"><CoinIcon /> {q.coin_reward}</span>
                        )}
                        {q.star_reward > 0 && (
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-700">⭐ {q.star_reward}</span>
                        )}
                        {q.behavior_type === "responsibility" && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700" title={t("tasks.weeklyStarsHint")}>🌱 {t("tasks.weeklyStars")}</span>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}

          {s.rewards.length > 0 && (
            <Card className="space-y-3">
              <div>
                <h2 className="font-semibold text-stone-800">{t("kids.agePackRewards")} ({s.rewards.length})</h2>
                <p className="text-xs text-stone-500">{t("kids.agePackRewardsHint")}</p>
              </div>
              <ul className="space-y-2">
                {s.rewards.map((r) => (
                  <li key={r.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-200 px-3 py-2 hover:bg-stone-50">
                      <input type="checkbox" name="reward_template_ids" value={r.id} defaultChecked className="h-4 w-4 accent-amber-500" />
                      <span className="text-lg">{rewardStyle(r.category).icon}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-stone-800">{label(r)}</span>
                      {r.reference_price_vnd ? (
                        <span className="text-[11px] text-stone-400">{t("kids.agePackPrice", { price: vnd.format(r.reference_price_vnd) })}</span>
                      ) : null}
                      {r.min_level ? (
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-600">🔒 Lv.{r.min_level}</span>
                      ) : null}
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700"><CoinIcon /> {r.coin_cost}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Button type="submit" size="lg">{t("kids.agePackSend", { name })}</Button>
        </form>
      )}
    </div>
  );
}
