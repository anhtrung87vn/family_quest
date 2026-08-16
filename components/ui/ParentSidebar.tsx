"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

interface NavItem {
  href: string;
  icon: string;
  label: string;
  badge?: number;
}

interface ParentSidebarProps {
  locale: string;
  appName: string;
  navItems: NavItem[];
  bottomItems: NavItem[];
  signOutLabel: string;
}

export function ParentSidebar({
  locale,
  appName,
  navItems,
  bottomItems,
  signOutLabel,
}: ParentSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    const full = `/${locale}${href}`;
    return pathname === full || pathname.startsWith(full + "/");
  };

  const renderLink = (item: NavItem) => (
    <a
      key={item.href}
      href={`/${locale}${item.href}`}
      onClick={() => setOpen(false)}
      className={clsx(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        isActive(item.href)
          ? "bg-amber-100 text-amber-800"
          : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
      )}
    >
      <span className="text-lg leading-none">{item.icon}</span>
      <span className="flex-1">{item.label}</span>
      {item.badge != null && item.badge > 0 && (
        <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
          {item.badge}
        </span>
      )}
    </a>
  );

  const sidebarContent = (
    <>
      {/* Brand */}
      <a href={`/${locale}/dashboard`} className="mb-6 flex items-center gap-2 px-3">
        <span className="text-2xl">🌱</span>
        <span className="text-base font-bold text-stone-800">{appName}</span>
      </a>

      {/* Main nav */}
      <nav className="flex-1 space-y-1">
        {navItems.map(renderLink)}
      </nav>

      {/* Bottom section */}
      <div className="mt-auto border-t border-stone-200 pt-3 space-y-1">
        {bottomItems.map(renderLink)}
        <a
          href={`/${locale}/signout`}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
        >
          <span className="text-lg leading-none">↪</span>
          <span>{signOutLabel}</span>
        </a>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-stone-200 bg-white px-3 py-5 lg:flex">
        {sidebarContent}
      </aside>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-20 flex h-14 items-center justify-between border-b border-stone-200 bg-white px-4 lg:hidden">
        <a href={`/${locale}/dashboard`} className="flex items-center gap-2">
          <span className="text-xl">🌱</span>
          <span className="text-sm font-bold text-stone-800">{appName}</span>
        </a>
        <button
          onClick={() => setOpen(!open)}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-xl text-stone-600 hover:bg-stone-100"
          aria-label="Menu"
        >
          {open ? "✕" : "☰"}
        </button>
      </header>

      {/* Mobile drawer overlay */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/30 lg:hidden"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-stone-200 bg-white px-3 py-5 lg:hidden">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
