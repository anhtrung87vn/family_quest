"use client";

import { useState } from "react";

type GuideLabels = {
  title: string;
  subtitle: string;
  hide: string;
  show: string;
  responsibilities: string;
  habitBuilding: string;
  coreQuests: string;
  character: string;
  choiceQuest: string;
  symbolsTitle: string;
  symbolCoin: string;
  symbolStar: string;
  symbolDone: string;
  symbolWaiting: string;
  symbolPhoto: string;
  symbolAudio: string;
  symbolText: string;
  symbolChoice: string;
  symbolParentObs: string;
  symbolRequired: string;
  symbolStreak: string;
};

type LevelEntry = {
  level: number;
  title: string;
  minStars: number;
  icon: string;
  current: boolean;
};

export function ChildGuide({ labels, levels }: { labels: GuideLabels; levels?: LevelEntry[] }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-white/80 px-3 py-1 text-xs font-medium text-stone-500 shadow-sm transition-colors hover:border-violet-300 hover:text-violet-600"
      >
        ❓ {labels.show}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-violet-700">❓ {labels.title}</h3>
          <p className="text-[11px] text-stone-400">{labels.subtitle}</p>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-600 hover:bg-violet-200"
        >
          {labels.hide}
        </button>
      </div>

      {/* Section explanations */}
      <div className="mb-4 space-y-2">
        <div className="rounded-xl bg-white/70 p-2.5">
          <div className="mb-0.5 text-xs font-bold text-emerald-700">🌱 {labels.responsibilities.split("—")[0]}</div>
          <p className="text-[11px] text-stone-500">{labels.responsibilities}</p>
        </div>
        <div className="rounded-xl bg-white/70 p-2.5">
          <div className="mb-0.5 text-xs font-bold text-amber-700">🌿 {labels.habitBuilding.split(".")[0]}</div>
          <p className="text-[11px] text-stone-500">{labels.habitBuilding}</p>
        </div>
        <div className="rounded-xl bg-white/70 p-2.5">
          <div className="mb-0.5 text-xs font-bold text-stone-800">🎯 {labels.coreQuests.split(".")[0]}</div>
          <p className="text-[11px] text-stone-500">{labels.coreQuests}</p>
        </div>
        <div className="rounded-xl bg-white/70 p-2.5">
          <div className="mb-0.5 text-xs font-bold text-purple-700">❤️ {labels.character.split(".")[0]}</div>
          <p className="text-[11px] text-stone-500">{labels.character}</p>
        </div>
        <div className="rounded-xl bg-white/70 p-2.5">
          <div className="mb-0.5 text-xs font-bold text-violet-700">✨ {labels.choiceQuest.split(".")[0]}</div>
          <p className="text-[11px] text-stone-500">{labels.choiceQuest}</p>
        </div>
      </div>

      {/* Level ladder */}
      {levels && levels.length > 0 && (
        <div className="mb-4">
          <h4 className="mb-2 text-xs font-bold text-stone-600">🏆 Level của con</h4>
          <div className="space-y-1.5">
            {levels.map((lv) => (
              <div
                key={lv.level}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                  lv.current
                    ? "bg-amber-100 ring-1 ring-amber-400"
                    : lv.minStars === 0 || levels.find(l => l.current)!.minStars >= lv.minStars
                    ? "bg-white/60 opacity-70"
                    : "bg-white/40 opacity-50"
                }`}
              >
                <span className="text-lg w-7 text-center">{lv.icon}</span>
                <div className="flex-1">
                  <div className={`text-xs font-bold ${lv.current ? "text-amber-700" : "text-stone-600"}`}>
                    Lv.{lv.level} — {lv.title}
                    {lv.current && <span className="ml-1.5 text-[10px] font-semibold text-amber-500">← Đang ở đây</span>}
                  </div>
                  <div className="text-[10px] text-stone-400">⭐ {lv.minStars} sao để đạt</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Symbols legend */}
      <div>
        <h4 className="mb-2 text-xs font-bold text-stone-600">{labels.symbolsTitle}</h4>
        <div className="grid grid-cols-1 gap-1.5">
          <SymbolRow emoji="🪙" text={labels.symbolCoin} />
          <SymbolRow emoji="⭐" text={labels.symbolStar} />
          <SymbolRow emoji="✅" text={labels.symbolDone} />
          <SymbolRow emoji="⏳" text={labels.symbolWaiting} />
          <SymbolRow emoji="📷" text={labels.symbolPhoto} />
          <SymbolRow emoji="🎤" text={labels.symbolAudio} />
          <SymbolRow emoji="💬" text={labels.symbolText} />
          <SymbolRow emoji="🌟" text={labels.symbolChoice} />
          <SymbolRow emoji="👀" text={labels.symbolParentObs} />
          <SymbolRow emoji="*" text={labels.symbolRequired} />
          <SymbolRow emoji="🔥" text={labels.symbolStreak} />
        </div>
      </div>
    </div>
  );
}

function SymbolRow({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-white/60 px-2.5 py-1.5">
      <span className="w-5 text-center text-sm">{emoji}</span>
      <span className="text-[11px] text-stone-600">{text}</span>
    </div>
  );
}
