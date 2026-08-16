"use client";

import { cloneRewardTemplates } from "./actions";
import { Button } from "@/components/ui/Button";

export function CloneRewardsButton({ label }: { label: string }) {
  return (
    <form
      action={cloneRewardTemplates}
      onClick={(e) => e.stopPropagation()}
    >
      <Button type="submit" size="sm" variant="ghost" className="text-xs text-amber-600">
        📚 {label}
      </Button>
    </form>
  );
}
