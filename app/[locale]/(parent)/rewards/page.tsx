import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEV_BYPASS, DEV_FAMILY_ID } from "@/lib/dev-family";
import { rewardStyle } from "@/lib/category-style";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Collapsible } from "@/components/ui/Collapsible";
import { createReward, toggleRewardActive } from "./actions";
import { CloneRewardsButton } from "./CloneRewardsButton";
import { RewardList } from "./RewardList";

export default async function RewardsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = DEV_BYPASS ? createAdminClient() : await createClient();
  const t = await getTranslations();
  const rewardsQ = supabase.from("rewards").select("*").eq("is_system_template", false);
  if (DEV_BYPASS) rewardsQ.eq("family_id", DEV_FAMILY_ID);
  const { data: rewards } = await rewardsQ.order("coin_cost");

  // Separate dream-eligible from normal
  const dreamRewards = (rewards ?? []).filter((r) => r.dream_eligible);
  const normalRewards = (rewards ?? []).filter((r) => !r.dream_eligible);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">🎁 {t("parent.rewards")}</h1>

      {/* Create reward — collapsible */}
      <Card>
        <Collapsible
          trigger={
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-stone-700">+ {t("rewards.newReward")}</span>
              <CloneRewardsButton label={t("rewards.cloneTemplates")} />
            </div>
          }
        >
          <form action={createReward} className="space-y-4">
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                {t("tasks.infoSection")}
              </legend>
              <input name="name" placeholder={t("rewards.name")} required
                className="h-11 w-full rounded-xl border border-stone-300 px-3 text-sm" />
              <input name="description" placeholder={t("rewards.description")}
                className="h-11 w-full rounded-xl border border-stone-300 px-3 text-sm" />
              <select name="category" className="h-11 w-full rounded-xl border border-stone-300 px-3 text-sm">
                <option value="">{t("rewards.category")}</option>
                <option value="small">🍬 {t("rewards.cat.small")}</option>
                <option value="medium">🎮 {t("rewards.cat.medium")}</option>
                <option value="large">🎁 {t("rewards.cat.large")}</option>
                <option value="experience">🎡 {t("rewards.cat.experience")}</option>
                <option value="dream">🌈 {t("rewards.cat.dream")}</option>
              </select>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                {t("rewards.costAndStock")}
              </legend>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-amber-600">🪙</span>
                  <span className="text-stone-600">{t("rewards.cost")}</span>
                  <input name="coin_cost" type="number" min={1} defaultValue={30}
                    className="h-10 w-24 rounded-xl border border-stone-300 px-3 text-sm" />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-stone-500">📦</span>
                  <span className="text-stone-600">{t("rewards.stock")}</span>
                  <input name="stock" type="number" min={0}
                    placeholder={t("rewards.stockHint")}
                    className="h-10 w-24 rounded-xl border border-stone-300 px-3 text-sm" />
                </label>
              </div>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                {t("rewards.options")}
              </legend>
              <label className="flex items-center gap-2 text-sm">
                <input name="requires_approval" type="checkbox" defaultChecked className="h-4 w-4 rounded" />
                <span className="text-stone-600">{t("rewards.requiresApproval")}</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input name="dream_eligible" type="checkbox" className="h-4 w-4 rounded" />
                <span className="text-stone-600">🌈 {t("rewards.dreamEligible")}</span>
              </label>
            </fieldset>

            <Button type="submit" className="w-full sm:w-auto">{t("rewards.create")}</Button>
          </form>
        </Collapsible>
      </Card>

      {/* Dream rewards section */}
      {dreamRewards.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-purple-700">
            🌈 {t("rewards.dreamRewards")}
          </h2>
          <div className="space-y-3">
            {dreamRewards.map((r) => {
              const style = rewardStyle(r.category);
              return (
                <Card key={r.id} className={`border-purple-200 bg-purple-50 ${!r.active ? "opacity-50" : ""}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{style.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-stone-800">
                          {r.name}
                          {!r.active && <span className="ml-2 text-xs text-stone-400">({t("tasks.inactive")})</span>}
                        </div>
                        <form action={toggleRewardActive}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="active" value={String(r.active)} />
                          <Button type="submit" size="sm" variant="ghost" className="text-xs">
                            {r.active ? t("rewards.disable") : t("rewards.enable")}
                          </Button>
                        </form>
                      </div>
                      {r.description && <div className="mt-0.5 text-xs text-stone-500">{r.description}</div>}
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                          🪙 {r.coin_cost.toLocaleString()}
                        </span>
                        <span className="rounded-full bg-purple-200 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
                          ✨ Dream
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Available rewards */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-stone-800">
          🎁 {t("rewards.available")}
        </h2>
        {!normalRewards.length && !dreamRewards.length ? (
          <Card>
            <EmptyState
              icon="🎁"
              title={t("rewards.emptyTitle")}
              description={t("rewards.emptyDesc")}
            />
          </Card>
        ) : !normalRewards.length ? (
          <Card>
            <p className="text-center text-sm text-stone-400">{t("rewards.onlyDreams")}</p>
          </Card>
        ) : (
          <RewardList
            rewards={normalRewards.map((r) => ({
              id: r.id,
              name: r.name,
              description: r.description ?? null,
              category: r.category ?? null,
              coin_cost: r.coin_cost,
              stock: r.stock ?? null,
              active: r.active,
              dream_eligible: r.dream_eligible,
            }))}
            labels={{
              search: t("rewards.search"),
              noResults: t("rewards.noResults"),
              inactive: t("tasks.inactive"),
              disable: t("rewards.disable"),
              enable: t("rewards.enable"),
            }}
          />
        )}
      </section>
    </div>
  );
}
