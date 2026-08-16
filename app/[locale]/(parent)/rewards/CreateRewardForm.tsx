"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { createReward, uploadRewardImage } from "./actions";

interface CreateRewardFormProps {
  labels: {
    name: string;
    description: string;
    category: string;
    cost: string;
    stock: string;
    stockHint: string;
    requiresApproval: string;
    dreamEligible: string;
    create: string;
    infoSection: string;
    costAndStock: string;
    options: string;
    cats: { small: string; medium: string; large: string; experience: string; dream: string };
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
          placeholder="🖼 Image URL (optional)"
          className="h-11 flex-1 rounded-xl border border-stone-300 px-3 text-sm"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="shrink-0 rounded-xl border border-stone-300 bg-stone-50 px-3 text-xs text-stone-600 hover:bg-stone-100 disabled:opacity-50"
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
          <img src={value} alt="" className="h-20 w-32 rounded-xl object-cover ring-1 ring-stone-200" />
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

export function CreateRewardForm({ labels }: CreateRewardFormProps) {
  const [imageUrl, setImageUrl] = useState("");

  return (
    <form
      action={async (fd) => { fd.set("image_url", imageUrl); await createReward(fd); setImageUrl(""); }}
      className="space-y-4"
    >
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wider text-stone-400">
          {labels.infoSection}
        </legend>
        <input name="name" placeholder={labels.name} required
          className="h-11 w-full rounded-xl border border-stone-300 px-3 text-sm" />
        <input name="description" placeholder={labels.description}
          className="h-11 w-full rounded-xl border border-stone-300 px-3 text-sm" />
        <ImagePicker value={imageUrl} onChange={setImageUrl} />
        <input name="link_url" type="url" placeholder="🔗 Link URL (optional)"
          className="h-11 w-full rounded-xl border border-stone-300 px-3 text-sm" />
        <select name="category" className="h-11 w-full rounded-xl border border-stone-300 px-3 text-sm">
          <option value="">{labels.category}</option>
          <option value="small">🍬 {labels.cats.small}</option>
          <option value="medium">🎮 {labels.cats.medium}</option>
          <option value="large">🎁 {labels.cats.large}</option>
          <option value="experience">🎡 {labels.cats.experience}</option>
          <option value="dream">🌈 {labels.cats.dream}</option>
        </select>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wider text-stone-400">
          {labels.costAndStock}
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-amber-600">🪙</span>
            <span className="text-stone-600">{labels.cost}</span>
            <input name="coin_cost" type="number" min={1} defaultValue={30}
              className="h-10 w-24 rounded-xl border border-stone-300 px-3 text-sm" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-stone-500">📦</span>
            <span className="text-stone-600">{labels.stock}</span>
            <input name="stock" type="number" min={0}
              placeholder={labels.stockHint}
              className="h-10 w-24 rounded-xl border border-stone-300 px-3 text-sm" />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wider text-stone-400">
          {labels.options}
        </legend>
        <label className="flex items-center gap-2 text-sm">
          <input name="requires_approval" type="checkbox" defaultChecked className="h-4 w-4 rounded" />
          <span className="text-stone-600">{labels.requiresApproval}</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="dream_eligible" type="checkbox" className="h-4 w-4 rounded" />
          <span className="text-stone-600">🌈 {labels.dreamEligible}</span>
        </label>
      </fieldset>

      <Button type="submit" className="w-full sm:w-auto">{labels.create}</Button>
    </form>
  );
}
