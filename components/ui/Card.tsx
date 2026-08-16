import { clsx } from "clsx";
import * as React from "react";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-stone-200 bg-white p-5 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
