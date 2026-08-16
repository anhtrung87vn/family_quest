"use client";

import { useState, useDeferredValue, useRef, useTransition } from "react";
import { rewardStyle } from "@/lib/category-style";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { toggleRewardActive, updateReward, deleteReward, uploadRewardImage } from "./actions";

type Reward = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  coin_cost: number;
  stock: number | null;
  active: boolean;
  dream_eligible: boolean;
  image_url: string | null;
  link_url: string | null;
};

interface RewardListProps {
  rewards: Reward[];
  hideSearch?: boolean;
  labels: {
    search: string;
    noResults: string;
    inactive: string;
    disable: string;
    enable: string;
  };
}

function ImagePicker({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, startUpload] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setError(null);
    startUpload(async () => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadRewardImage(fd);
      if ("error" in res) { setError(res.error); return; }
      onChange(res.url);
    });
  };

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="🖼 Image URL (https://...)"
          className="h-9 flex-1 rounded-lg border border-stone-300 px-3 text-sm"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="shrink-0 rounded-lg border border-stone-300 bg-stone-50 px-3 text-xs text-stone-600 hover:bg-stone-100 disabled:opacity-50"
        >
          {uploading ? "⏳" : "📁 Upload"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>
      {error && <div className="text-[10px] text-red-500">{error}</div>}
      {value && (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-20 w-32 rounded-lg object-cover ring-1 ring-stone-200" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white hover:bg-red-600"
          >✕</button>
        </div>
      )}
    </div>
  );
}

function RewardCard({ r, labels }: { r: Reward; labels: RewardListProps["labels"] }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [imageUrl, setImageUrl] = useState(r.image_url ?? "");
  const style = rewardStyle(r.category);

  if (editing) {
    return (
      <Card className="border-amber-200 bg-amber-50/40">
        <form
          action={async (fd) => { fd.set("image_url", imageUrl); await updateReward(fd); setEditing(false); }}
          className="space-y-2.5"
        >
          <input type="hidden" name="id" value={r.id} />
          <input name="name" defaultValue={r.name} required placeholder="Name"
            className="h-9 w-full rounded-lg border border-stone-300 px-3 text-sm" />
          <input name="description" defaultValue={r.description ?? ""} placeholder="Description"
            className="h-9 w-full rounded-lg border border-stone-300 px-3 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <select name="category" defaultValue={r.category ?? ""}
              className="h-9 rounded-lg border border-stone-300 px-2 text-xs">
              <option value="">Category</option>
              <option value="small">🍬 Small</option>
              <option value="medium">🎮 Medium</option>
              <option value="large">🎁 Large</option>
              <option value="experience">🎡 Experience</option>
              <option value="dream">🌈 Dream</option>
            </select>
            <input name="coin_cost" type="number" min={1} defaultValue={r.coin_cost} placeholder="🪙 Cost"
              className="h-9 rounded-lg border border-stone-300 px-3 text-sm" />
          </div>
          <input name="stock" type="number" min={0} defaultValue={r.stock ?? ""} placeholder="📦 Stock (blank = unlimited)"
            className="h-9 w-full rounded-lg border border-stone-300 px-3 text-sm" />
          <ImagePicker value={imageUrl} onChange={setImageUrl} />
          <input name="link_url" type="url" defaultValue={r.link_url ?? ""} placeholder="🔗 Link URL (https://...)"
            className="h-9 w-full rounded-lg border border-stone-300 px-3 text-sm" />
          <div className="flex gap-3 text-xs">
            <label className="flex items-center gap-1.5">
              <input name="requires_approval" type="checkbox" defaultChecked={r.active} className="h-3.5 w-3.5 rounded" />
              Needs approval
            </label>
            <label className="flex items-center gap-1.5">
              <input name="dream_eligible" type="checkbox" defaultChecked={r.dream_eligible} className="h-3.5 w-3.5 rounded" />
              🌈 Dream
            </label>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" size="sm" className="flex-1 bg-amber-500 text-white hover:bg-amber-600">💾 Save</Button>
            <button type="button" onClick={() => setEditing(false)}
              className="flex-1 rounded-xl border border-stone-300 px-3 py-1.5 text-xs text-stone-500 hover:bg-stone-50">
              Cancel
            </button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <Card className={`${!r.active ? "opacity-50" : ""}`}>
      {/* Image */}
      {r.image_url && (
        <div className="mb-2 -mx-4 -mt-4 overflow-hidden rounded-t-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={r.image_url} alt={r.name} className="h-32 w-full object-cover" />
        </div>
      )}
      <div className="flex items-start gap-2">
        <span className="text-xl">{style.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <div className="text-sm font-semibold text-stone-800 leading-snug">{r.name}</div>
            <div className="flex shrink-0 items-center gap-0.5">
              <button type="button" onClick={() => setEditing(true)}
                className="rounded-lg px-1.5 py-1 text-[11px] text-stone-400 hover:bg-stone-100 hover:text-stone-600">
                ✏️
              </button>
              <form action={toggleRewardActive} className="inline">
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="active" value={String(r.active)} />
                <button type="submit" className="rounded-lg px-1.5 py-1 text-[11px] text-stone-400 hover:bg-stone-100">
                  {r.active ? "⏸" : "▶"}
                </button>
              </form>
              {confirmDelete ? (
                <form action={deleteReward} className="inline" onSubmit={() => setConfirmDelete(false)}>
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" className="rounded-lg px-1.5 py-1 text-[11px] text-red-500 hover:bg-red-50">✓ Del</button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-lg px-1 py-1 text-[11px] text-stone-400">✕</button>
                </form>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)}
                  className="rounded-lg px-1.5 py-1 text-[11px] text-stone-300 hover:bg-red-50 hover:text-red-400">
                  🗑
                </button>
              )}
            </div>
          </div>
          {r.description && <div className="mt-0.5 text-xs text-stone-500">{r.description}</div>}
          {r.link_url && (
            <a href={r.link_url} target="_blank" rel="noopener noreferrer"
              className="mt-0.5 block truncate text-xs text-blue-500 hover:underline">
              🔗 {r.link_url}
            </a>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
              🪙 {r.coin_cost.toLocaleString()}
            </span>
            {r.stock != null && (
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">📦 {r.stock}</span>
            )}
            {r.category && (
              <span className={`rounded-full ${style.bg} px-2 py-0.5 text-[11px] font-medium ${style.color}`}>
                {r.category}
              </span>
            )}
            {r.dream_eligible && (
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-medium text-purple-600">🌈 Dream</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function RewardList({ rewards, labels, hideSearch }: RewardListProps) {
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
      {!hideSearch && (
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
            <button onClick={() => setRaw("")} className="absolute inset-y-0 right-3 flex items-center text-stone-400 hover:text-stone-600">✕</button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <Card><EmptyState icon="🔍" title={labels.noResults} description="" /></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((r) => <RewardCard key={r.id} r={r} labels={labels} />)}
        </div>
      )}
    </div>
  );
}
