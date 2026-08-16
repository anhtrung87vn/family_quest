"use client";

import { useState, useDeferredValue } from "react";

interface SearchFilterProps<T extends { name: string; description?: string | null; category?: string | null }> {
  placeholder: string;
  emptyIcon?: string;
  emptyLabel: string;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}

export function SearchFilter<T extends { name: string; description?: string | null; category?: string | null }>({
  placeholder,
  emptyIcon = "🔍",
  emptyLabel,
  items,
  renderItem,
}: SearchFilterProps<T>) {
  const [raw, setRaw] = useState("");
  const query = useDeferredValue(raw.trim().toLowerCase());

  const filtered = query
    ? items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          (item.description ?? "").toLowerCase().includes(query) ||
          (item.category ?? "").toLowerCase().includes(query)
      )
    : items;

  return (
    <div>
      <div className="relative mb-4">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400">
          🔍
        </span>
        <input
          type="search"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={placeholder}
          className="h-10 w-full rounded-xl border border-stone-300 bg-white pl-9 pr-4 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
        />
        {raw && (
          <button
            onClick={() => setRaw("")}
            className="absolute inset-y-0 right-3 flex items-center text-stone-400 hover:text-stone-600"
          >
            ✕
          </button>
        )}
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-stone-400">
          <div className="mb-1 text-2xl">{emptyIcon}</div>
          <div className="text-sm">{emptyLabel}</div>
        </div>
      ) : (
        filtered.map(renderItem)
      )}
    </div>
  );
}
