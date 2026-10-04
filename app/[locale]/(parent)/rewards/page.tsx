import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveContext } from "@/lib/dev-family";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Collapsible } from "@/components/ui/Collapsible";
import { CloneRewardsButton } from "./CloneRewardsButton";
import { ResetRewardsButton } from "./ResetRewardsButton";
import { RewardList } from "./RewardList";
import { CreateRewardForm } from "./CreateRewardForm";

export default async function RewardsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { familyId, supabase } = await resolveContext();
  const t = await getTranslations();
  const { data: rewards } = await supabase
    .from("rewards")
    .select("id, name, name_vi, description, description_vi, category, coin_cost, stock, active, requires_approval, dream_eligible, image_url, link_url, min_level, min_age, max_age")
    .eq("is_system_template", false)
    .eq("family_id", familyId)
    .order("coin_cost");

  const cats = {
    small: t("rewards.cat.small"),
    medium: t("rewards.cat.medium"),
    large: t("rewards.cat.large"),
    experience: t("rewards.cat.experience"),
    dream: t("rewards.cat.dream"),
  };

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
            minLevel: t("rewards.minLevel"),
            noLevel: t("rewards.noLevel"),
            requiresApproval: t("rewards.requiresApproval"),
            dreamEligible: t("rewards.dreamEligible"),
            create: t("rewards.create"),
            infoSection: t("tasks.infoSection"),
            costAndStock: t("rewards.costAndStock"),
            options: t("rewards.options"),
            imageUrl: t("rewards.imageUrl"),
            linkUrl: t("rewards.linkUrl"),
            upload: t("rewards.upload"),
            cats,
          }} />
        </Collapsible>
      </Card>

      {/* Rewards grouped by category, with one search across all sections */}
      {!rewards?.length ? (
        <Card>
          <EmptyState
            icon="🎁"
            title={t("rewards.emptyTitle")}
            description={t("rewards.emptyDesc")}
          />
        </Card>
      ) : (
        <RewardList
          rewards={rewards.map((r) => ({
            id: r.id,
            name: r.name,
            name_vi: r.name_vi ?? null,
            description: r.description ?? null,
            description_vi: r.description_vi ?? null,
            category: r.category ?? null,
            coin_cost: r.coin_cost,
            stock: r.stock ?? null,
            active: r.active,
            requires_approval: r.requires_approval ?? false,
            dream_eligible: r.dream_eligible,
            image_url: r.image_url ?? null,
            link_url: r.link_url ?? null,
            min_level: r.min_level ?? null,
            min_age: r.min_age ?? null,
            max_age: r.max_age ?? null,
          }))}
          labels={{
            search: t("rewards.search"),
            noResults: t("rewards.noResults"),
            clearSearch: t("rewards.clearSearch"),
            inactive: t("tasks.inactive"),
            disable: t("rewards.disable"),
            enable: t("rewards.enable"),
            edit: t("rewards.edit"),
            delete: t("rewards.delete"),
            deleteConfirm: t("rewards.deleteConfirm"),
            minLevel: t("rewards.minLevel"),
            noLevel: t("rewards.noLevel"),
            ages: t("rewards.ages"),
            dreamGoal: t("rewards.dreamGoal"),
            uncategorized: t("rewards.uncategorized"),
            name: t("rewards.name"),
            description: t("rewards.description"),
            category: t("rewards.category"),
            costPlaceholder: t("rewards.costPlaceholder"),
            stockPlaceholder: t("rewards.stockPlaceholder"),
            imageUrl: t("rewards.imageUrl"),
            linkUrl: t("rewards.linkUrl"),
            upload: t("rewards.upload"),
            requiresApproval: t("rewards.requiresApproval"),
            dreamEligible: t("rewards.dreamEligible"),
            save: t("common.save"),
            cancel: t("common.cancel"),
            cats,
          }}
        />
      )}

      {/* Rarely used, destructive actions — collapsed at the bottom */}
      <ResetRewardsButton
        manageLabel={t("parent.manage")}
        label={t("parent.dangerResetRecloneRewards")}
        desc={t("parent.dangerResetRecloneRewardsDesc")}
        confirmPrompt={t("parent.dangerConfirmPrompt")}
      />
    </div>
  );
}
