"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { requestRewardAction, cancelRedemptionAction } from "@/app/[locale]/child/(app)/actions";

interface RedeemButtonProps {
  rewardId: string;
  label: string;
}

export function RedeemButton({ rewardId, label }: RedeemButtonProps) {
  const [requestState, requestAction, isRequesting] = useActionState(requestRewardAction, null);
  const [cancelState, cancelAction, isCancelling] = useActionState(cancelRedemptionAction, null);
  const t = useTranslations("child");

  // After cancel succeeded — reset back to initial
  if (cancelState?.ok) {
    return (
      <div className="w-full rounded-xl bg-stone-50 px-3 py-2 text-center text-sm text-stone-500">
        {t("redeemCancelled")}
      </div>
    );
  }

  // Pending approval — show with undo option
  if (requestState?.ok && requestState.needsApproval && requestState.redemptionId) {
    return (
      <div className="w-full space-y-1.5">
        <div className="rounded-xl bg-amber-50 px-3 py-2 text-center text-sm font-semibold text-amber-600">
          {t("redeemWaiting")}
        </div>
        <form action={cancelAction} className="w-full">
          <input type="hidden" name="redemption_id" value={requestState.redemptionId} />
          {cancelState?.error && (
            <div className="mb-1 text-center text-xs text-red-500">❌ {cancelState.error}</div>
          )}
          <button
            type="submit"
            disabled={isCancelling}
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-500 hover:border-red-200 hover:text-red-400 disabled:opacity-50 transition-colors"
          >
            {isCancelling ? "⏳..." : t("redeemCancel")}
          </button>
        </form>
      </div>
    );
  }

  // Auto-approved success
  if (requestState?.ok && !requestState.needsApproval) {
    return (
      <div className="w-full rounded-xl bg-emerald-50 px-3 py-2 text-center text-sm font-semibold text-emerald-600">
        {t("redeemDone")}
      </div>
    );
  }

  // Default — request button
  return (
    <form action={requestAction} className="flex-1 w-full">
      <input type="hidden" name="reward_id" value={rewardId} />
      {requestState?.error && (
        <div className="mb-1 rounded-lg bg-red-50 px-2 py-1 text-center text-xs text-red-500">
          ❌ {requestState.error}
        </div>
      )}
      <button
        type="submit"
        disabled={isRequesting}
        className="w-full rounded-xl bg-emerald-500 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
      >
        {isRequesting ? t("processing") : label}
      </button>
    </form>
  );
}
