"use client";

import { cloneSystemTemplates } from "./actions";
import { Button } from "@/components/ui/Button";

export function CloneTemplatesButton({ label }: { label: string }) {
  return (
    <form
      action={cloneSystemTemplates}
      onClick={(e) => e.stopPropagation()}
    >
      <Button type="submit" size="sm" variant="ghost" className="text-xs text-amber-600">
        📚 {label}
      </Button>
    </form>
  );
}
