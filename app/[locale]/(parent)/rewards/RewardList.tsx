"use client";

import { useState, useDeferredValue, useRef, useTransition } from "react";
import { rewardStyle } from "@/lib/category-style";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { toggleRewardActive, updateReward, deleteReward, uploadRewardImage } from "./actions";
import { CoinIcon } from "@/components/ui/CoinIcon";
import { compressImage } from "@/lib/compress-image";
import { useLocale } from "next-intl";
import { localName, localDesc } from "@/lib/localize";

type Reward = {
  id: string;
  name: string;
  name_vi: string | null;
  description: string | null;
  description_vi: string | null;
  category: string | null;
  coin_cost: number;
  stock: number | null;
  active: boolean;
  requires_approval: boolean;
  dream_eligible: boolean;
  image_url: string | null;
  link_url: string | null;
  min_level: number | null;
  min_age: number | null;
  max_age: number | null;
};

const CATEGORY_ORDER = ["small", "medium", "large", "experience", "dream"] as const;
type Category = (typeof CATEGORY_ORDER)[number];
const UNCATEGORIZED = "other";

interface RewardListProps {
  rewards: Reward[];
  labels: {
    search: string;
    noResults: string;
    inactive: string;
    disable: string;
    enable: string;
    edit: string;
    delete: string;
    deleteConfirm: string;
    minLevel: string;
    noLevel: string;
    ages: string;
    dreamGoal: string;
    uncategorized: string;
    name: string;
    description: string;
    category: string;
    costPlaceholder: string;
    stockPlaceholder: string;
    imageUrl: string;
    linkUrl: string;
    upload: string;
    requiresApproval: string;
    dreamEligible: string;
    save: string;
    cancel: string;
    clearSearch: string;
    cats: Record<Category, string>;
  };
}

type Labels = RewardListProps["labels"];

function isCategory(c: string | null): c is Category {
  return (CATEGORY_ORDER as readonly string[]).includes(c ?? "");
}

/** "6–10", "6+", "≤10", or null when the reward has no age bounds. */
function ageRange(min: number | null, max: number | null): string | null {
  if (min != null && max != null) return `${min}–${max}`;
  if (min != null) return `${min}+`;
  if (max != null) return `≤${max}`;
  return null;
}

function ImagePicker({
  value,
  onChange,
  placeholder,
  uploadLabel,
}: {
  value: string;
  onChange: (url: string) => void;
  placeholder: string;
  uploadLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, startUpload] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setError(null);
    startUpload(async () => {
      const fd = new FormData();
      // Phone photos exceed the 1 MB server action limit — compress first.
      fd.append("file", await compressImage(file));
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
          placeholder={`🖼 ${placeholder}`}
          className="h-9 min-w-0 flex-1 rounded-lg border border-stone-300 px-3 text-sm"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="shrink-0 rounded-lg border border-stone-300 bg-stone-50 px-3 text-xs text-stone-600 hover:bg-stone-100 disabled:opacity-50"
        >
          {uploading ? "⏳" : `📁 ${uploadLabel}`}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>
      {error && <div className="text-[11px] text-red-500">{error}</div>}
      {value && (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-20 w-32 rounded-lg object-cover ring-1 ring-stone-200" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] text-white hover:bg-red-600"
          >✕</button>
        </div>
      )}
    </div>
  );
}

function RewardCard({ r, labels }: { r: Reward; labels: Labels }) {
  const [editing, setEditing] = useState(false);
  const locale = useLocale();
  // In Vietnamese, edit the Vietnamese text the parent actually sees.
  const editVi = locale === "vi" && !!r.name_vi;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [imageUrl, setImageUrl] = useState(r.image_url ?? "");
  const style = rewardStyle(r.category);
  const ages = ageRange(r.min_age, r.max_age);

  if (editing) {
    return (
      <Card className="border-amber-200 bg-amber-50/40 sm:col-span-2">
        <form
          action={async (fd) => { fd.set("image_url", imageUrl); await updateReward(fd); setEditing(false); }}
          className="space-y-2.5"
        >
          <input type="hidden" name="id" value={r.id} />
          <input name={editVi ? "name_vi" : "name"} defaultValue={editVi ? r.name_vi ?? "" : r.name} required placeholder={labels.name}
            className="h-9 w-full rounded-lg border border-stone-300 px-3 text-sm" />
          <input name={editVi ? "description_vi" : "description"} defaultValue={(editVi ? r.description_vi : r.description) ?? ""} placeholder={labels.description}
            className="h-9 w-full rounded-lg border border-stone-300 px-3 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <select name="category" defaultValue={r.category ?? ""}
              className="h-9 rounded-lg border border-stone-300 px-2 text-xs">
              <option value="">{labels.category}</option>
              <option value="small">🍬 {labels.cats.small}</option>
              <option value="medium">🎮 {labels.cats.medium}</option>
              <option value="large">🎁 {labels.cats.large}</option>
              <option value="experience">🎡 {labels.cats.experience}</option>
              <option value="dream">🌈 {labels.cats.dream}</option>
            </select>
            <input name="coin_cost" type="number" min={1} defaultValue={r.coin_cost} placeholder={labels.costPlaceholder}
              className="h-9 min-w-0 rounded-lg border border-stone-300 px-3 text-sm" />
          </div>
          <input name="stock" type="number" min={0} defaultValue={r.stock ?? ""} placeholder={`📦 ${labels.stockPlaceholder}`}
            className="h-9 w-full rounded-lg border border-stone-300 px-3 text-sm" />
          <label className="flex items-center gap-2 text-xs text-stone-600">
            🔒 {labels.minLevel}
            <select name="min_level" defaultValue={r.min_level ?? ""}
              className="h-9 flex-1 rounded-lg border border-stone-300 px-2 text-xs">
              <option value="">{labels.noLevel}</option>
              {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((lv) => (
                <option key={lv} value={lv}>⭐ Lv.{lv}</option>
              ))}
            </select>
          </label>
          <ImagePicker value={imageUrl} onChange={setImageUrl} placeholder={labels.imageUrl} uploadLabel={labels.upload} />
          <input name="link_url" type="url" defaultValue={r.link_url ?? ""} placeholder={`🔗 ${labels.linkUrl}`}
            className="h-9 w-full rounded-lg border border-stone-300 px-3 text-sm" />
          <div className="flex flex-wrap gap-3 text-xs">
            <label className="flex items-center gap-1.5">
              <input name="requires_approval" type="checkbox" defaultChecked={r.requires_approval} className="h-3.5 w-3.5 rounded" />
              {labels.requiresApproval}
            </label>
            <label className="flex items-center gap-1.5">
              <input name="dream_eligible" type="checkbox" defaultChecked={r.dream_eligible} className="h-3.5 w-3.5 rounded" />
              🌈 {labels.dreamEligible}
            </label>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" size="sm" className="flex-1 bg-amber-500 text-white hover:bg-amber-600">💾 {labels.save}</Button>
            <button type="button" onClick={() => setEditing(false)}
              className="flex-1 rounded-xl border border-stone-300 px-3 py-1.5 text-xs text-stone-500 hover:bg-stone-50">
              {labels.cancel}
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
          <img src={r.image_url} alt={localName(r, locale)} className="h-32 w-full object-cover" />
        </div>
      )}
      <div className="flex items-start gap-2">
        <span className="text-xl">{style.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0 break-words text-sm font-semibold leading-snug text-stone-800">{localName(r, locale)}</div>
            <div className="flex shrink-0 items-center gap-0.5">
              <button type="button" onClick={() => setEditing(true)} title={labels.edit} aria-label={labels.edit}
                className="rounded-lg px-1.5 py-1 text-[11px] text-stone-400 hover:bg-stone-100 hover:text-stone-600">
                ✏️
              </button>
              <form action={toggleRewardActive} className="inline">
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="active" value={String(r.active)} />
                <button type="submit"
                  title={r.active ? labels.disable : labels.enable}
                  aria-label={r.active ? labels.disable : labels.enable}
                  className="rounded-lg px-1.5 py-1 text-[11px] text-stone-400 hover:bg-stone-100">
                  {r.active ? "⏸" : "▶"}
                </button>
              </form>
              {confirmDelete ? (
                <form action={deleteReward} className="inline" onSubmit={() => setConfirmDelete(false)}>
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" className="rounded-lg px-1.5 py-1 text-[11px] text-red-500 hover:bg-red-50">✓ {labels.deleteConfirm}</button>
                  <button type="button" onClick={() => setConfirmDelete(false)} aria-label={labels.cancel}
                    className="rounded-lg px-1 py-1 text-[11px] text-stone-400">✕</button>
                </form>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} title={labels.delete} aria-label={labels.delete}
                  className="rounded-lg px-1.5 py-1 text-[11px] text-stone-300 hover:bg-red-50 hover:text-red-400">
                  🗑
                </button>
              )}
            </div>
          </div>
          {localDesc(r, locale) && <div className="mt-0.5 text-xs text-stone-500">{localDesc(r, locale)}</div>}
          {r.link_url && (
            <a href={r.link_url} target="_blank" rel="noopener noreferrer"
              className="mt-0.5 block truncate text-xs text-blue-500 hover:underline">
              🔗 {r.link_url}
            </a>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
              <CoinIcon /> {r.coin_cost.toLocaleString()}
            </span>
            {isCategory(r.category) && (
              <span className={`rounded-full ${style.bg} px-2 py-0.5 text-[11px] font-medium ${style.color}`}>
                {labels.cats[r.category]}
              </span>
            )}
            {ages && (
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                🎂 {labels.ages} {ages}
              </span>
            )}
            {r.min_level != null && (
              <span title={`${labels.minLevel} ${r.min_level}`}
                className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-600">
                🔒 Lv.{r.min_level}
              </span>
            )}
            {r.dream_eligible && (
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-medium text-purple-600">
                🌈 {labels.dreamGoal}
              </span>
            )}
            {r.stock != null && (
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">📦 {r.stock}</span>
            )}
            {!r.active && (
              <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] text-stone-600">⏸ {labels.inactive}</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

/** One search box over every reward; results are grouped into category sections. */
export function RewardList({ rewards, labels }: RewardListProps) {
  const [raw, setRaw] = useState("");
  const query = useDeferredValue(raw.trim().toLowerCase());

  const filtered = query
    ? rewards.filter((r) =>
        [r.name, r.name_vi ?? "", r.description ?? "", isCategory(r.category) ? labels.cats[r.category] : r.category ?? ""]
          .some((field) => field.toLowerCase().includes(query))
      )
    : rewards;

  const sections = [...CATEGORY_ORDER, UNCATEGORIZED]
    .map((key) => ({
      key,
      items: filtered.filter((r) => (isCategory(r.category) ? r.category : UNCATEGORIZED) === key),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="space-y-6">
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400">🔍</span>
        <input
          type="search"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={labels.search}
          className="h-10 w-full rounded-xl border border-stone-300 bg-white pl-9 pr-4 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
        />
        {raw && (
          <button onClick={() => setRaw("")} aria-label={labels.clearSearch}
            className="absolute inset-y-0 right-3 flex items-center text-stone-400 hover:text-stone-600">✕</button>
        )}
      </div>

      {sections.length === 0 ? (
        <Card><EmptyState icon="🔍" title={labels.noResults} description="" /></Card>
      ) : (
        sections.map(({ key, items }) => {
          const known = isCategory(key);
          const style = rewardStyle(known ? key : null);
          return (
            <section key={key}>
              <h2 className={`mb-3 flex items-center gap-2 text-base font-bold ${known ? style.color : "text-stone-700"}`}>
                <span>{known ? style.icon : "🎁"}</span>
                {known ? labels.cats[key] : labels.uncategorized}
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-500">
                  {items.length}
                </span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((r) => <RewardCard key={r.id} r={r} labels={labels} />)}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
