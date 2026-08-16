"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { deleteAllTasks } from "./actions";

interface DangerZoneProps {
  taskCount: number;
  labels: {
    deleteAll: string;
    deleteAllConfirm: string;
    deleteAllCancel: string;
    deleteAllDone: string;
    backup: string;
    backupDesc: string;
    restore: string;
    restoreDesc: string;
    restoreDone: string;
    restoreError: string;
  };
}

export function DangerZone({ taskCount, labels }: DangerZoneProps) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [restoreMsg, setRestoreMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleDeleteAll() {
    startTransition(async () => {
      await deleteAllTasks();
      setConfirmDelete(false);
      setOpen(false);
    });
  }

  function handleBackup() {
    window.location.href = "/api/backup";
  }

  async function handleRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const data = await res.json();
      if (data.success) {
        setRestoreMsg({ ok: true, msg: `${labels.restoreDone}: tasks +${data.restored?.tasks ?? 0}, rewards +${data.restored?.rewards ?? 0}` });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setRestoreMsg({ ok: false, msg: data.error ?? labels.restoreError });
      }
    } catch {
      setRestoreMsg({ ok: false, msg: labels.restoreError });
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-white/80 px-3 py-1 text-xs font-medium text-stone-400 shadow-sm transition-colors hover:border-red-300 hover:text-red-500"
      >
        ⚙️ Quản lý
      </button>

      {open && (
        <div className="mt-3 space-y-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">

          {/* Backup */}
          <div className="flex items-start justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
            <div>
              <div className="text-xs font-semibold text-blue-700">💾 {labels.backup}</div>
              <div className="mt-0.5 text-[11px] text-stone-500">{labels.backupDesc}</div>
            </div>
            <Button size="sm" onClick={handleBackup} className="shrink-0 bg-blue-500 text-xs text-white hover:bg-blue-600">
              ⬇️ Download
            </Button>
          </div>

          {/* Restore */}
          <div className="flex items-start justify-between gap-3 rounded-xl border border-green-100 bg-green-50/60 p-3">
            <div>
              <div className="text-xs font-semibold text-green-700">📤 {labels.restore}</div>
              <div className="mt-0.5 text-[11px] text-stone-500">{labels.restoreDesc}</div>
              {restoreMsg && (
                <div className={`mt-1.5 text-[11px] font-semibold ${restoreMsg.ok ? "text-green-600" : "text-red-600"}`}>
                  {restoreMsg.ok ? "✅" : "❌"} {restoreMsg.msg}
                </div>
              )}
            </div>
            <div>
              <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleRestore} />
              <Button size="sm" onClick={() => fileRef.current?.click()} className="shrink-0 bg-green-600 text-xs text-white hover:bg-green-700">
                ⬆️ Upload
              </Button>
            </div>
          </div>

          {/* Delete all */}
          <div className="rounded-xl border border-red-200 bg-red-50/60 p-3">
            <div className="mb-2">
              <div className="text-xs font-semibold text-red-700">🗑 {labels.deleteAll}</div>
              <div className="mt-0.5 text-[11px] text-stone-500">
                {taskCount} tasks đang active sẽ bị vô hiệu hoá.
              </div>
            </div>
            {!confirmDelete ? (
              <Button
                size="sm"
                className="bg-red-100 text-xs text-red-600 hover:bg-red-200"
                onClick={() => setConfirmDelete(true)}
                disabled={taskCount === 0}
              >
                {labels.deleteAll}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-red-500 text-xs text-white hover:bg-red-600"
                  onClick={handleDeleteAll}
                  disabled={isPending}
                >
                  {isPending ? "..." : labels.deleteAllConfirm}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={() => setConfirmDelete(false)}
                >
                  {labels.deleteAllCancel}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
