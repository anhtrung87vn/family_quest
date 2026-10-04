"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const TABS = [
  { href: "/child/home",    icon: "🏠", key: "home" },
  { href: "/child/quests",  icon: "🎯", key: "quests" },
  { href: "/child/rewards", icon: "🎁", key: "rewards" },
  { href: "/child/me",      icon: "👧", key: "me" },
] as const;

export function BottomNav({ labels, locale }: { labels: Record<string, string>; locale: string }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-xl items-center justify-around gap-1 border-t border-stone-100 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur-sm">
      {TABS.map((tab) => {
        const fullHref = `/${locale}${tab.href}`;
        const isActive = pathname.startsWith(fullHref);
        return (
          <Link
            key={tab.key}
            href={fullHref as any}
            prefetch
            aria-current={isActive ? "page" : undefined}
            className={clsx(
              // Focus ring only for keyboard users; no tap highlight or click outline
              "flex min-h-12 min-w-16 flex-col items-center justify-center gap-0.5 rounded-2xl px-4 py-1.5 text-xs transition-colors",
              "outline-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2",
              isActive
                ? "bg-amber-100 font-semibold text-amber-700"
                : "text-stone-500 hover:text-stone-700",
            )}
          >
            <span aria-hidden className="text-[22px] leading-none">{tab.icon}</span>
            <span>{labels[tab.key]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
