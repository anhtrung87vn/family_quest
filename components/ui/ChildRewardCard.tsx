import { useTranslations } from "next-intl";
import { rewardStyle } from "@/lib/category-style";
import { setDreamRewardAction } from "@/app/[locale]/child/(app)/actions";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RedeemButton } from "@/components/ui/RedeemButton";
import { CoinIcon } from "@/components/ui/CoinIcon";

export interface ChildRewardCardProps {
  id: string;
  name: string;
  icon: string;
  category: string | null;
  cost: number;
  coin: number;
  inStock: boolean;
  dreamEligible: boolean;
  imageUrl?: string | null;
  linkUrl?: string | null;
  /** "Level X · title" when the reward is level-locked; hides progress and redeem. */
  lockedLabel?: string | null;
}

/** Compact reward tile for the child Gifts tab. */
export function ChildRewardCard({
  id,
  name,
  icon,
  category,
  cost,
  coin,
  inStock,
  dreamEligible,
  imageUrl,
  linkUrl,
  lockedLabel,
}: ChildRewardCardProps) {
  const t = useTranslations("child");
  const style = rewardStyle(category);
  const locked = !!lockedLabel;
  const canRedeem = !locked && inStock && coin >= cost;

  return (
    <div
      className={`flex flex-col gap-2 rounded-2xl border p-3 shadow-sm ${
        canRedeem ? `${style.border} ${style.bg}` : locked ? "border-stone-200 bg-stone-50" : "border-stone-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
        ) : (
          <span className={`text-3xl leading-none ${locked ? "opacity-60" : ""}`} aria-hidden="true">{icon}</span>
        )}
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
          <CoinIcon /> {cost.toLocaleString()}
        </span>
      </div>

      <div className="line-clamp-2 text-sm font-semibold leading-snug text-stone-800">{name}</div>

      {linkUrl && (
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] text-blue-600 hover:underline"
        >
          🔗 {t("viewDetails")}
        </a>
      )}

      {locked ? (
        <div className="self-start rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
          🔒 {lockedLabel}
        </div>
      ) : !inStock ? (
        <div className="text-[13px] text-red-500">{t("outOfStock")}</div>
      ) : !canRedeem ? (
        <div>
          <ProgressBar value={coin} max={cost} color="amber" size="sm" />
          <div className="mt-1 truncate text-[13px] text-stone-500">
            {t("moreCoins", { n: (cost - coin).toLocaleString() })}
          </div>
        </div>
      ) : null}

      {(canRedeem || dreamEligible) && (
        <div className="mt-auto flex w-full flex-col gap-1.5">
          {canRedeem && <RedeemButton rewardId={id} label={`🎁 ${t("redeem")}`} />}
          {dreamEligible && (
            <form action={setDreamRewardAction} className="w-full">
              <input type="hidden" name="reward_id" value={id} />
              <Button size="sm" type="submit" variant="ghost" className="w-full">
                ✨ {t("setDream")}
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
