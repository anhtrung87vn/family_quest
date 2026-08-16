"use client";

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
    <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-xl items-center justify-around border-t border-stone-100 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur-sm">
      {TABS.map((tab) => {
        const fullHref = `/${locale}${tab.href}`;
        const isActive = pathname.startsWith(fullHref);
        return (
          <a
            key={tab.key}
            href={fullHref}
            className={clsx(
              "flex flex-col items-center gap-0.5 rounded-2xl px-4 py-1.5 text-xs transition-all",
              isActive
                ? "bg-amber-100 font-semibold text-amber-700"
                : "text-stone-400 hover:text-stone-600",
            )}
          >
            <span className="text-[22px] leading-none">{tab.icon}</span>
            <span>{labels[tab.key]}</span>
          </a>
        );
      })}
    </nav>
  );
}
