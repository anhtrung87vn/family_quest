"use client";

import { useState, type ReactNode } from "react";

export function Collapsible({
  trigger,
  children,
  defaultOpen = false,
}: {
  trigger: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <div onClick={() => setOpen(!open)} className="cursor-pointer flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">{trigger}</div>
        <span className={`text-stone-400 text-xs transition-transform duration-150 shrink-0 ${open ? "rotate-180" : ""}`}>▾</span>
      </div>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}
