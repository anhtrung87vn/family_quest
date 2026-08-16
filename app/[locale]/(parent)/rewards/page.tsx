import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEV_BYPASS, DEV_FAMILY_ID } from "@/lib/dev-family";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Collapsible } from "@/components/ui/Collapsible";
import { CloneRewardsButton } from "./CloneRewardsButton";
import { RewardList } from "./RewardList";
import { CreateRewardForm } from "./CreateRewardForm";

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
          <CreateRewardForm labels={{
            name: t("rewards.name"),
            description: t("rewards.description"),
            category: t("rewards.category"),
            cost: t("rewards.cost"),
            stock: t("rewards.stock"),
            stockHint: t("rewards.stockHint"),
            requiresApproval: t("rewards.requiresApproval"),
            dreamEligible: t("rewards.dreamEligible"),
            create: t("rewards.create"),
            infoSection: t("tasks.infoSection"),
            costAndStock: t("rewards.costAndStock"),
            options: t("rewards.options"),
            cats: {
              small: t("rewards.cat.small"),
              medium: t("rewards.cat.medium"),
              large: t("rewards.cat.large"),
              experience: t("rewards.cat.experience"),
              dream: t("rewards.cat.dream"),
            },
          }} />
        </Collapsible>
      </Card>

      {/* Dream rewards section */}
      {dreamRewards.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-purple-700">
            🌈 {t("rewards.dreamRewards")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <RewardList
              rewards={dreamRewards.map((r) => ({
                id: r.id,
                name: r.name,
                description: r.description ?? null,
                category: r.category ?? null,
                coin_cost: r.coin_cost,
                stock: r.stock ?? null,
                active: r.active,
                dream_eligible: r.dream_eligible,
                image_url: (r as any).image_url ?? null,
                link_url: (r as any).link_url ?? null,
              }))}
              labels={{
                search: "",
                noResults: "",
                inactive: t("tasks.inactive"),
                disable: t("rewards.disable"),
                enable: t("rewards.enable"),
              }}
              hideSearch
            />
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
              image_url: (r as any).image_url ?? null,
              link_url: (r as any).link_url ?? null,
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
