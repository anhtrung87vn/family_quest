"use client";

import { useState, useDeferredValue } from "react";
import { rewardStyle } from "@/lib/category-style";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { toggleRewardActive } from "./actions";

type Reward = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  coin_cost: number;
  stock: number | null;
  active: boolean;
  dream_eligible: boolean;
};

interface RewardListProps {
  rewards: Reward[];
  labels: {
    search: string;
    noResults: string;
    inactive: string;
    disable: string;
    enable: string;
  };
}

export function RewardList({ rewards, labels }: RewardListProps) {
  const [raw, setRaw] = useState("");
  const query = useDeferredValue(raw.trim().toLowerCase());

  const filtered = query
    ? rewards.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          (r.description ?? "").toLowerCase().includes(query) ||
          (r.category ?? "").toLowerCase().includes(query)
      )
    : rewards;

  return (
    <div>
      <div className="relative mb-4">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400">🔍</span>
        <input
          type="search"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={labels.search}
          className="h-10 w-full rounded-xl border border-stone-300 bg-white pl-9 pr-4 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
        />
        {raw && (
          <button onClick={() => setRaw("")} className="absolute inset-y-0 right-3 flex items-center text-stone-400 hover:text-stone-600">
            ✕
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState icon="🔍" title={labels.noResults} description="" />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((r) => {
            const style = rewardStyle(r.category);
            return (
              <Card key={r.id} className={`${!r.active ? "opacity-50" : ""}`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl">{style.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-stone-800">{r.name}</div>
                      <form action={toggleRewardActive}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="active" value={String(r.active)} />
                        <Button type="submit" size="sm" variant="ghost" className="text-xs">
                          {r.active ? labels.disable : labels.enable}
                        </Button>
                      </form>
                    </div>
                    {r.description && (
                      <div className="mt-0.5 text-xs text-stone-500">{r.description}</div>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                        🪙 {r.coin_cost.toLocaleString()}
                      </span>
                      {r.stock != null && (
                        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">
                          📦 {r.stock}
                        </span>
                      )}
                      {r.category && (
                        <span className={`rounded-full ${style.bg} px-2 py-0.5 text-[11px] font-medium ${style.color}`}>
                          {r.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
