import { getTranslations, setRequestLocale } from "next-intl/server";
import { getChildSession } from "@/lib/auth/child-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getChildBalance } from "@/lib/ledger";
import { rewardStyle, rewardIcon } from "@/lib/category-style";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { setDreamRewardAction } from "../actions";
import { RedeemButton } from "@/components/ui/RedeemButton";
import { CookieToast } from "@/components/ui/CookieToast";
import { redirect } from "@/lib/i18n/routing";

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

  const [{ data: rewards }, { data: redemptions }, { coin }, { data: childRow }] = await Promise.all([
    admin.from("rewards")
      .select("id, name, description, coin_cost, category, dream_eligible, stock, image_url, link_url")
      .eq("family_id", session.familyId)
      .eq("active", true)
      .order("coin_cost"),
    admin.from("reward_redemptions")
      .select("id, status, coin_cost, requested_at, reward:rewards(id,name)")
      .eq("child_id", session.childId)
      .order("requested_at", { ascending: false })
      .limit(30),
    getChildBalance(session.childId),
    admin.from("children")
      .select("current_dream_reward_id")
      .eq("id", session.childId)
      .single(),
  ]);

  // Dream reward
  let dreamReward: { id: string; name: string; coin_cost: number } | null = null;
  if (childRow?.current_dream_reward_id) {
    const { data: dr } = await admin.from("rewards")
      .select("id, name, coin_cost")
      .eq("id", childRow.current_dream_reward_id)
      .single();
    if (dr) dreamReward = dr;
  }

  // Almost unlocked: rewards the child can almost afford (>= 70% of cost)
  const almostUnlocked = (rewards ?? []).filter(
    (r) => coin < r.coin_cost && coin >= r.coin_cost * 0.7 && (r.stock == null || r.stock > 0)
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
        message={locale === "vi" ? "Đã đặt ước mơ! Tiếp tục cố gắng nhé 💪" : "Dream set! Keep earning! 💪"}
      />
      {/* 🌈 Dream Reward Hero */}
      {dreamReward && (
        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-5 text-white shadow-lg">
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-indigo-200">
            🌈 {t("child.myDream")}
          </div>
          <div className="mb-3 text-lg font-bold">{dreamReward.name}</div>
          <ProgressBar value={coin} max={dreamReward.coin_cost} color="amber" size="lg" showPct />
          <div className="mt-2 flex items-center justify-between text-sm">
            <span>🪙 {coin.toLocaleString()}</span>
            <span className="font-semibold">
              {coin >= dreamReward.coin_cost
                ? `🎉 ${t("child.dreamReady")}!`
                : `${(dreamReward.coin_cost - coin).toLocaleString()} ${t("child.dreamMore")}`
              }
            </span>
            <span>🪙 {dreamReward.coin_cost.toLocaleString()}</span>
          </div>
        </section>
      )}

      {/* 🔓 Almost Unlocked */}
      {almostUnlocked.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-amber-700">
            🔓 {t("child.almostUnlocked")}
          </h2>
          <ul className="space-y-3">
            {almostUnlocked.map((r) => {
              const style = rewardStyle(r.category);
              const icon = rewardIcon(r.name);
              return (
                <li key={r.id} className={`rounded-2xl border ${style.border} ${style.bg} p-4 shadow-sm`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-stone-800">{r.name}</div>
                      <ProgressBar value={coin} max={r.coin_cost} color="amber" size="sm" className="mt-1.5" />
                      <div className="mt-1 text-xs text-stone-500">
                        🪙 {coin.toLocaleString()} / {r.coin_cost.toLocaleString()} — {(r.coin_cost - coin).toLocaleString()} {t("child.dreamMore")}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* 🎁 Available Rewards — Card Grid */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-stone-800">
            🎁 {t("child.available")}
          </h2>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            🪙 {coin.toLocaleString()}
          </span>
        </div>
        {!rewards?.length ? (
          <Card>
            <EmptyState
              icon="🎁"
              title={t("child.emptyRewardsTitle")}
              description={t("child.emptyRewardsDesc")}
            />
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {rewards.map((r) => {
              const canAfford = coin >= r.coin_cost;
              const inStock = r.stock == null || r.stock > 0;
              const style = rewardStyle(r.category);
              const coinsLeft = r.coin_cost - coin;
              const icon = rewardIcon(r.name);
              const hasProgress = coin > 0 && !canAfford;
              return (
                <div
                  key={r.id}
                  className={`flex flex-col overflow-hidden rounded-2xl border text-center shadow-sm ${
                    canAfford && inStock ? `${style.border} ${style.bg}` : "border-stone-200 bg-white"
                  }`}
                >
                  {/* Category accent stripe or image */}
                  {(r as any).image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={(r as any).image_url} alt={r.name} className="h-24 w-full object-cover" />
                  ) : (
                    <div className={`h-1.5 w-full ${style.accent}`} />
                  )}

                  <div className="flex flex-1 flex-col items-center p-3">
                    {!(r as any).image_url && <span className="mb-1.5 text-3xl">{icon}</span>}
                    <div className="mb-0.5 text-sm font-semibold leading-tight text-stone-800">{r.name}</div>
                    <div className="mb-1 text-xs font-bold text-amber-600">🪙 {r.coin_cost.toLocaleString()}</div>
                    {(r as any).link_url && (
                      <a href={(r as any).link_url} target="_blank" rel="noopener noreferrer"
                        className="mb-1 text-[10px] text-blue-500 hover:underline">🔗 Xem chi tiết</a>
                    )}

                    {/* Progress / affordability state */}
                    {canAfford && inStock ? (
                      <div className="mb-2 text-xs font-semibold text-emerald-600">🎉 {t("child.dreamReady")}!</div>
                    ) : !inStock ? (
                      <div className="mb-2 text-xs text-red-400">{t("child.outOfStock")}</div>
                    ) : (
                      <div className="mb-2 w-full">
                        <ProgressBar value={coin} max={r.coin_cost} color="amber" size="sm" />
                        <div className="mt-0.5 text-[10px] text-stone-400">
                          {hasProgress
                            ? `🪙 ${coin.toLocaleString()} / ${r.coin_cost.toLocaleString()} · ${t("child.coinsToGo", { n: coinsLeft.toLocaleString() })}`
                            : `🔒 ${t("child.coinsToGo", { n: coinsLeft.toLocaleString() })}`}
                        </div>
                      </div>
                    )}

                    <div className="mt-auto flex w-full gap-1">
                      {r.dream_eligible && (
                        <form action={setDreamRewardAction} className={canAfford && inStock ? "flex-1" : "w-full"}>
                          <input type="hidden" name="reward_id" value={r.id} />
                          <Button size="sm" type="submit" variant="ghost" className="w-full text-xs">
                            ✨ {t("child.setDream")}
                          </Button>
                        </form>
                      )}
                      {canAfford && inStock && (
                        <RedeemButton rewardId={r.id} label={`🎁 ${t("child.redeem")}`} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

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
                    <span className="text-sm font-medium">{reward?.name}</span>
                  </div>
                  <span className="text-xs text-amber-600">🪙 {r.coin_cost} · {t("child.waiting")}</span>
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
                    <span className="text-sm font-medium text-stone-600">{reward?.name}</span>
                  </div>
                  <span className="text-xs text-emerald-600">🪙 {r.coin_cost}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
