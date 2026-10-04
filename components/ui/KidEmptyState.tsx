import { clsx } from "clsx";
import type * as React from "react";
import { Link } from "@/lib/i18n/routing";
import { Card } from "@/components/ui/Card";

/** Empty state sized for young readers: 16px title, 14px description. */
export function KidEmptyState({
  icon,
  title,
  description,
  children,
  className,
}: {
  icon: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-col items-center gap-2 py-5 text-center", className)}>
      <span className="text-4xl">{icon}</span>
      <p className="text-base font-semibold text-stone-700">{title}</p>
      {description && <p className="text-sm text-stone-500">{description}</p>}
      {children}
    </div>
  );
}

/**
 * "Today's quests" empty state for a child.
 * - celebrate: the child already submitted something today and nothing is left to do.
 * - otherwise nothing was assigned: offer the Quest Pool when it has quests,
 *   or suggest asking a parent when it is empty.
 */
export function TodayEmptyState({
  celebrate,
  poolHref,
  labels,
}: {
  celebrate: boolean;
  /** Where the "pick from the pool" button goes; null when the pool has nothing to pick. */
  poolHref: string | null;
  labels: {
    celebrateTitle: string;
    celebrateDesc: string;
    noQuestsTitle: string;
    pickFromPool: string;
    askParent: string;
  };
}) {
  if (celebrate) {
    return (
      <Card className="border-emerald-200 bg-emerald-50">
        <KidEmptyState icon="🎉" title={labels.celebrateTitle} description={labels.celebrateDesc} />
      </Card>
    );
  }
  return (
    <Card className="border-violet-200 bg-violet-50/60">
      <KidEmptyState
        icon="🌤️"
        title={labels.noQuestsTitle}
        description={poolHref ? undefined : labels.askParent}
      >
        {poolHref && (
          <Link
            href={poolHref}
            className="mt-2 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-violet-500 px-5 text-base font-bold text-white shadow-sm transition-colors hover:bg-violet-600"
          >
            🎯 {labels.pickFromPool}
          </Link>
        )}
      </KidEmptyState>
    </Card>
  );
}
