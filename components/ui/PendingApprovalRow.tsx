"use client";

import { useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";

/**
 * A pending-approval row: summary + always-visible one-tap actions, with the
 * richer review flow (evidence, notes, celebration media) behind a toggle.
 */
export function PendingApprovalRow({
  children,
  actions,
  details,
  detailsLabel,
}: {
  children: ReactNode;
  actions: ReactNode;
  details: ReactNode;
  detailsLabel: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      {children}
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {actions}
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="ml-auto inline-flex h-9 items-center gap-1 rounded-xl px-2.5 text-sm font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-700"
        >
          {detailsLabel}
          <span className={clsx("text-xs transition-transform duration-150", open && "rotate-180")}>▾</span>
        </button>
      </div>
      {open && <div className="mt-2 space-y-2 border-t border-stone-100 pt-2">{details}</div>}
    </div>
  );
}

/** Submit button for a server-action form; disabled while the action runs. */
export function PendingSubmitButton({ children, className }: { children: ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} aria-busy={pending} className={clsx("h-9 px-3.5", className)}>
      {pending ? "…" : children}
    </Button>
  );
}
