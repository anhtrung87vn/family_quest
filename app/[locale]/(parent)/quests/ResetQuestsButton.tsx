"use client";

import { useState, useTransition } from "react";
import { resetAndRecloneQuests } from "./actions";
import { Button } from "@/components/ui/Button";

interface Props {
  label: string;
  desc: string;
  confirmLabel: string;
  cancelLabel: string;
}

export function ResetQuestsButton({ label, desc, confirmLabel, cancelLabel }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      await resetAndRecloneQuests();
      setConfirming(false);
    });
  }

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-3">
      <div className="mb-2">
        <div className="text-xs font-semibold text-orange-700">🔄 {label}</div>
        <div className="mt-0.5 text-[11px] text-stone-500">{desc}</div>
      </div>
      {!confirming ? (
        <Button
          size="sm"
          className="bg-orange-100 text-xs text-orange-600 hover:bg-orange-200"
          onClick={() => setConfirming(true)}
        >
          🔄 {label}
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button
            size="sm"
            className="bg-orange-500 text-xs text-white hover:bg-orange-600"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? "..." : confirmLabel}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs"
            onClick={() => setConfirming(false)}
          >
            {cancelLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
