"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { promoteEvidence, deleteEvidence } from "@/app/[locale]/(parent)/approvals/actions";

export interface EvidenceItem {
  id: string;
  evidence_type: string;
  storage_path: string | null;
  signed_url: string | null;
  text_content: string | null;
  choice_value: string | null;
  audio_duration: number | null;
  mime_type: string | null;
  status: string;
  expires_at: string | null;
}

interface EvidenceReviewProps {
  evidence: EvidenceItem[];
  labels: {
    evidenceLabel: string;
    noEvidence: string;
    keepAsMemory: string;
    deleteEvidence: string;
    saveToDevice: string;
    promoted: string;
    deleted: string;
    deleteConfirmTitle: string;
    deleteConfirmBody: string;
    deleteConfirmCancel: string;
    deleteConfirmOk: string;
    autoDeleteIn: string;
    recordingExpired: string;
    recordingDeleted: string;
    savedToMemories: string;
  };
  choiceLabels: Record<string, string>;
}

export function EvidenceReview({ evidence, labels, choiceLabels }: EvidenceReviewProps) {
  if (!evidence.length) return null;

  return (
    <div className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
        📎 {labels.evidenceLabel}
      </h4>
      <div className="space-y-2">
        {evidence.map((ev) => (
          <EvidenceItemCard key={ev.id} item={ev} labels={labels} choiceLabels={choiceLabels} />
        ))}
      </div>
    </div>
  );
}

function daysUntilExpiry(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function EvidenceItemCard({
  item,
  labels,
  choiceLabels,
}: {
  item: EvidenceItem;
  labels: EvidenceReviewProps["labels"];
  choiceLabels: Record<string, string>;
}) {
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handlePromote = () => {
    const fd = new FormData();
    fd.set("evidence_id", item.id);
    startTransition(() => { promoteEvidence(fd); });
  };

  const handleDeleteConfirmed = () => {
    const fd = new FormData();
    fd.set("evidence_id", item.id);
    setShowDeleteConfirm(false);
    startTransition(() => { deleteEvidence(fd); });
  };

  // Already promoted
  if (item.status === "promoted") {
    return (
      <div className="flex flex-col gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
        <div className="flex items-center gap-2">
          <span>❤️</span>
          <span className="font-medium">{labels.savedToMemories}</span>
        </div>
        <EvidenceContent item={item} choiceLabels={choiceLabels} />
      </div>
    );
  }

  // Deleted or expired
  if (item.status === "deleted") {
    const isMedia = item.evidence_type === "photo" || item.evidence_type === "audio";
    return (
      <div className="flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-400">
        <span>{isMedia ? (item.evidence_type === "audio" ? "🎤" : "📷") : "📝"}</span>
        <span>{labels.recordingDeleted}</span>
      </div>
    );
  }
  if (item.status === "expired") {
    const isAudio = item.evidence_type === "audio";
    return (
      <div className="flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-400">
        <span>{isAudio ? "🎤" : "📷"}</span>
        <span>{labels.recordingExpired}</span>
      </div>
    );
  }

  const isMedia = item.evidence_type === "photo" || item.evidence_type === "audio";
  const daysLeft = item.expires_at ? daysUntilExpiry(item.expires_at) : null;

  // Active evidence
  return (
    <div className="rounded-lg border border-indigo-200 bg-white p-2.5">
      <EvidenceContent item={item} choiceLabels={choiceLabels} />

      {/* Countdown label */}
      {daysLeft !== null && (
        <div className="mt-1.5 text-[10px] text-amber-600 font-medium">
          ⏳ {labels.autoDeleteIn.replace("{days}", String(daysLeft))}
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {/* Save to device — via API route for human-readable filename */}
        {isMedia && (
          <a
            href={`/api/evidence/${item.id}/download`}
            download
            className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-600 hover:bg-stone-200 transition-colors"
          >
            ⬇️ {labels.saveToDevice}
          </a>
        )}

        {/* Keep as Memory */}
        <Button
          size="sm"
          variant="ghost"
          className="text-[11px] text-pink-600 hover:bg-pink-50"
          onClick={handlePromote}
          disabled={isPending}
        >
          ❤️ {labels.keepAsMemory}
        </Button>

        {/* Delete — opens confirmation */}
        <Button
          size="sm"
          variant="ghost"
          className="text-[11px] text-red-400 hover:bg-red-50 hover:text-red-600"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isPending}
        >
          🗑️ {labels.deleteEvidence}
        </Button>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3 space-y-2">
          <p className="text-xs font-semibold text-red-700">{labels.deleteConfirmTitle}</p>
          <p className="text-[11px] text-red-600 leading-relaxed">{labels.deleteConfirmBody}</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 text-xs text-stone-500"
              onClick={() => setShowDeleteConfirm(false)}
            >
              {labels.deleteConfirmCancel}
            </Button>
            <Button
              size="sm"
              variant="danger"
              className="flex-1 text-xs"
              onClick={handleDeleteConfirmed}
              disabled={isPending}
            >
              {isPending ? "..." : labels.deleteConfirmOk}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function EvidenceContent({
  item,
  choiceLabels,
}: {
  item: EvidenceItem;
  choiceLabels: Record<string, string>;
}) {
  if (item.evidence_type === "photo" && item.signed_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.signed_url}
        alt="Evidence"
        className="max-h-48 rounded-lg object-cover"
      />
    );
  }

  if (item.evidence_type === "audio" && item.signed_url) {
    return (
      <div className="space-y-1">
        <audio controls className="w-full h-8" src={item.signed_url} />
        {item.audio_duration && (
          <span className="text-[10px] text-stone-400">{item.audio_duration}s</span>
        )}
      </div>
    );
  }

  if (item.evidence_type === "text" && item.text_content) {
    return (
      <p className="text-sm text-stone-700 italic">
        &ldquo;{item.text_content}&rdquo;
      </p>
    );
  }

  if (item.evidence_type === "choice" && item.choice_value) {
    const label = choiceLabels[item.choice_value] || item.choice_value;
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">
        🌟 {label}
      </span>
    );
  }

  if (item.evidence_type === "parent_observation" && item.text_content) {
    return (
      <p className="text-sm text-stone-600">
        👀 {item.text_content}
      </p>
    );
  }

  return null;
}
