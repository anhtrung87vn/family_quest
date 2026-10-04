import { getTranslations, setRequestLocale } from "next-intl/server";
import { getChildSession } from "@/lib/auth/child-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getChildBalance } from "@/lib/ledger";
import { rewardStyle, rewardIcon } from "@/lib/category-style";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChildRewardCard } from "@/components/ui/ChildRewardCard";
import { CookieToast } from "@/components/ui/CookieToast";
import { redirect } from "@/lib/i18n/routing";
import { ageFromDob, isAgeEligible } from "@/lib/age";
import { getLevelInfo, levelTitle } from "@/lib/levels";
import { CoinIcon } from "@/components/ui/CoinIcon";

export const dynamic = "force-dynamic";

export default async function ChildRewards({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const sessionOrNull = await getChildSession();
  if (!sessionOrNull) redirect({ href: "/child/select", locale });
  const session = sessionOrNull!;
  const admin = createAdminClient();

  const [{ data: allRewards }, { data: redemptions }, { coin }, { data: childRow }] = await Promise.all([
    admin.from("rewards")
      .select("id, name, name_vi, description, description_vi, coin_cost, category, dream_eligible, stock, image_url, link_url, min_age, max_age, min_level")
      .eq("family_id", session.familyId)
      .eq("active", true)
      .order("coin_cost"),
    admin.from("reward_redemptions")
      .select("id, status, coin_cost, requested_at, reward:rewards(id,name,name_vi)")
      .eq("child_id", session.childId)
      .order("requested_at", { ascending: false })
      .limit(30),
    getChildBalance(session.childId),
    admin.from("children")
      .select("current_dream_reward_id, date_of_birth, lifetime_stars")
      .eq("id", session.childId)
      .single(),
  ]);

  // Only show rewards whose age range fits this child (no birthday → all).
  const childAge = ageFromDob(childRow?.date_of_birth);
  const rewards = (allRewards ?? []).filter((r) => isAgeEligible(r, childAge));
  // Level-gated rewards stay visible (a goal to grow into) but can't be redeemed yet.
  const childLevel = getLevelInfo(childRow?.lifetime_stars ?? 0).level;

  // Helper: pick localized reward name
  const localRewardName = (r: any): string =>
    (locale === "vi" && r?.name_vi) ? r.name_vi : (r?.name ?? "");

  // Dream reward
  let dreamReward: { id: string; name: string; name_vi?: string | null; coin_cost: number } | null = null;
  if (childRow?.current_dream_reward_id) {
    const { data: dr } = await admin.from("rewards")
      .select("id, name, name_vi, coin_cost")
      .eq("id", childRow.current_dream_reward_id)
      .single();
    if (dr) dreamReward = dr;
  }

  // Rewards still level-gated go to their own section at the bottom.
  const isLocked = (r: (typeof rewards)[number]) => (r.min_level ?? 1) > childLevel;
  const inStock = (r: (typeof rewards)[number]) => r.stock == null || r.stock > 0;
  const unlocked = rewards.filter((r) => !isLocked(r));
  const locked = rewards.filter(isLocked);

  // Almost there: affordable now or at least 70% of the way, closest first.
  const ALMOST_THERE_MAX = 4;
  const almostThere = unlocked
    .filter((r) => inStock(r) && coin >= r.coin_cost * 0.7)
    .sort((a, b) =>
      Math.min(1, coin / b.coin_cost) - Math.min(1, coin / a.coin_cost) || b.coin_cost - a.coin_cost)
    .slice(0, ALMOST_THERE_MAX);
  const almostIds = new Set(almostThere.map((r) => r.id));

  // Remaining unlocked rewards, grouped by category (unknown categories fall back to small).
  const CATEGORY_ORDER = ["small", "medium", "large", "experience", "dream"] as const;
  const byCategory = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: unlocked.filter((r) => {
      if (almostIds.has(r.id)) return false;
      const c = (CATEGORY_ORDER as readonly string[]).includes(r.category) ? r.category : "small";
      return c === cat;
    }),
  })).filter((g) => g.items.length > 0);

  const renderCard = (r: (typeof rewards)[number]) => (
    <ChildRewardCard
      key={r.id}
      id={r.id}
      name={localRewardName(r)}
      icon={rewardIcon(r.name)}
      category={r.category}
      cost={r.coin_cost}
      coin={coin}
      inStock={inStock(r)}
      dreamEligible={!!r.dream_eligible}
      imageUrl={r.image_url}
      linkUrl={r.link_url}
      lockedLabel={isLocked(r)
        ? `${t("child.unlockAtLevel", { level: r.min_level! })} · ${levelTitle(r.min_level!, locale)}`
        : null}
    />
  );

  // Redeemed (approved/fulfilled)
  const redeemed = (redemptions ?? []).filter(
    (r) => r.status === "approved" || r.status === "fulfilled"
  );
  // Pending requests
  const pending = (redemptions ?? []).filter(
    (r) => r.status === "requested"
  );

  return (
    <div className="space-y-5">
      <CookieToast
        cookieName="dream_set"
        icon="🌈"
        message={t("child.dreamSetToast")}
      />
      <h1 className="text-xl font-bold text-stone-800">🎁 {t("child.tabs.rewards")}</h1>
      {!rewards.length && (
        <Card>
          <EmptyState
            icon="🎁"
            title={t("child.emptyRewardsTitle")}
            description={t("child.emptyRewardsDesc")}
          />
        </Card>
      )}

      {/* 🌈 Dream Reward Hero */}
      {dreamReward && (
        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-5 text-white shadow-lg">
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-indigo-200">
            🌈 {t("child.myDream")}
          </div>
          <div className="mb-3 text-lg font-bold">{localRewardName(dreamReward)}</div>
          <ProgressBar value={coin} max={dreamReward.coin_cost} color="amber" size="lg" showPct />
          <div className="mt-2 flex items-center justify-between text-sm">
            <span><CoinIcon /> {coin.toLocaleString()}</span>
            <span className="font-semibold">
              {coin >= dreamReward.coin_cost
                ? `🎉 ${t("child.dreamReady")}!`
                : `${(dreamReward.coin_cost - coin).toLocaleString()} ${t("child.dreamMore")}`
              }
            </span>
            <span><CoinIcon /> {dreamReward.coin_cost.toLocaleString()}</span>
          </div>
        </section>
      )}

      {/* ✨ Almost there */}
      {almostThere.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-bold text-amber-700">✨ {t("child.almostThere")}</h2>
          <div className="grid grid-cols-2 gap-3">{almostThere.map(renderCard)}</div>
        </section>
      )}

      {/* 🎁 Remaining unlocked rewards by category */}
      {byCategory.map(({ cat, items }) => (
        <section key={cat}>
          <h2 className={`mb-3 text-base font-bold ${rewardStyle(cat).color}`}>
            {rewardStyle(cat).icon} {t(`rewards.cat.${cat}`)}
          </h2>
          <div className="grid grid-cols-2 gap-3">{items.map(renderCard)}</div>
        </section>
      ))}

      {/* 🔒 Level-locked rewards */}
      {locked.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-bold text-purple-700">🔒 {t("child.unlockWithStars")}</h2>
          <div className="grid grid-cols-2 gap-3">{locked.map(renderCard)}</div>
        </section>
      )}

      {/* ⏳ Pending Requests */}
      {pending.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-stone-800">
            ⏳ {t("child.myRequests")}
          </h2>
          <ul className="space-y-2">
            {pending.map((r) => {
              const reward = Array.isArray(r.reward) ? r.reward[0] : r.reward;
              return (
                <li key={r.id} className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⏳</span>
                    <span className="text-sm font-medium">{localRewardName(reward)}</span>
                  </div>
                  <span className="text-xs text-amber-600"><CoinIcon /> {r.coin_cost} · {t("child.waiting")}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ✅ Redeemed Rewards */}
      {redeemed.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-stone-800">
            ✅ {t("child.redeemed")}
          </h2>
          <ul className="space-y-2">
            {redeemed.map((r) => {
              const reward = Array.isArray(r.reward) ? r.reward[0] : r.reward;
              return (
                <li key={r.id} className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎉</span>
                    <span className="text-sm font-medium text-stone-600">{localRewardName(reward)}</span>
                  </div>
                  <span className="text-xs text-emerald-600"><CoinIcon /> {r.coin_cost}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
