"use client";

import { useState, useTransition } from "react";
import { resetAndRecloneRewards } from "./actions";
import { Button } from "@/components/ui/Button";

interface Props {
  manageLabel: string;
  label: string;
  desc: string;
  confirmPrompt: string;
}

/** Collapsed "Manage" section holding the destructive reset & reimport action. */
export function ResetRewardsButton({ manageLabel, label, desc, confirmPrompt }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleReset() {
    if (!window.confirm(`${label}\n\n${desc}\n\n${confirmPrompt}`)) return;
    startTransition(async () => {
      await resetAndRecloneRewards();
      setOpen(false);
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-white/80 px-3 py-1 text-xs font-medium text-stone-500 shadow-sm transition-colors hover:border-red-300 hover:text-red-500"
      >
        ⚙️ {manageLabel}
        <span className={`text-[11px] transition-transform duration-150 ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="mt-3 rounded-2xl border border-red-200 bg-red-50/40 p-4">
          <div className="text-xs font-semibold text-red-700">🔄 {label}</div>
          <div className="mt-0.5 text-[11px] text-stone-500">{desc}</div>
          <Button
            size="sm"
            variant="ghost"
            className="mt-3 border border-red-300 bg-white text-xs font-semibold text-red-600 hover:bg-red-50"
            onClick={handleReset}
            disabled={isPending}
          >
            {isPending ? "⏳" : `🔄 ${label}`}
          </Button>
        </div>
      )}
    </div>
  );
}
