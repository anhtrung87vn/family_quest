"use client";

import { useEffect, useRef, useState } from "react";

interface SwipeToRevokeProps {
  assignmentId: string;
  revokeAction: (formData: FormData) => Promise<void>;
  label?: string;
  children: React.ReactNode;
}

export function SwipeToRevoke({ assignmentId, revokeAction, label = "Bỏ qua", children }: SwipeToRevokeProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const isSwipingH = useRef<boolean | null>(null);
  const offsetRef = useRef(0);
  const THRESHOLD = 80;

  useEffect(() => {
    const el = containerRef.current;
    console.log("[SwipeToRevoke] mounted, el=", el);
    if (!el) return;

    function onStart(e: TouchEvent) {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      isSwipingH.current = null;
      console.log("[SwipeToRevoke] touchstart", { x: startX.current, y: startY.current });
    }

    function onMove(e: TouchEvent) {
      if (startX.current === null || startY.current === null) return;
      const dx = e.touches[0].clientX - startX.current;
      const dy = e.touches[0].clientY - startY.current;

      if (isSwipingH.current === null) {
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
        isSwipingH.current = Math.abs(dx) > Math.abs(dy) * 1.5;
        console.log("[SwipeToRevoke] direction decided", { dx, dy, isH: isSwipingH.current });
      }

      if (isSwipingH.current && dx < 0) {
        e.preventDefault();
        const next = Math.max(dx, -THRESHOLD * 1.5);
        offsetRef.current = next;
        setOffsetX(next);
        console.log("[SwipeToRevoke] sliding", { offsetX: next });
      }
    }

    function onEnd() {
      console.log("[SwipeToRevoke] touchend", { isH: isSwipingH.current, offset: offsetRef.current, threshold: THRESHOLD });
      if (isSwipingH.current && offsetRef.current < -THRESHOLD) {
        console.log("[SwipeToRevoke] confirmed!");
        setConfirmed(true);
      }
      offsetRef.current = 0;
      setOffsetX(0);
      startX.current = null;
      startY.current = null;
      isSwipingH.current = null;
    }

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, []);

  if (confirmed) {
    return (
      <div className="relative overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
          <span className="text-xs font-semibold text-red-600">⚠️ Bỏ qua nhiệm vụ này?</span>
          <div className="flex gap-2">
            <form action={revokeAction}>
              <input type="hidden" name="assignment_id" value={assignmentId} />
              <button
                type="submit"
                className="rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600"
              >
                {label}
              </button>
            </form>
            <button
              onClick={() => setConfirmed(false)}
              className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-500 hover:bg-stone-200"
            >
              Giữ lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-2xl">
      {/* Red hint behind */}
      <div className="absolute inset-y-0 right-0 flex items-center rounded-r-2xl bg-red-400 px-4">
        <span className="text-xs font-bold text-white">← {label}</span>
      </div>
      {/* Content slides left on swipe */}
      <div
        style={{ transform: `translateX(${offsetX}px)`, transition: offsetX === 0 ? "transform 0.2s ease" : "none" }}
        className="relative"
      >
        {children}
      </div>
    </div>
  );
}
