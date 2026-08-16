"use client";

import { cloneQuestTemplates } from "./actions";
import { Button } from "@/components/ui/Button";

export function CloneQuestsButton({ label }: { label: string }) {
  return (
    <form
      action={cloneQuestTemplates}
      onClick={(e) => e.stopPropagation()}
    >
      <Button type="submit" size="sm" variant="ghost" className="text-xs text-purple-600">
        📚 {label}
      </Button>
    </form>
  );
}
