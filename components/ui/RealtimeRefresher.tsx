"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 15_000;
const PULL_THRESHOLD = 72; // px to pull before triggering refresh

export function RealtimeRefresher() {
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [pullY, setPullY] = useState(0); // 0..PULL_THRESHOLD
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);

  const startPolling = () => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
  };

  const stopPolling = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  const doRefresh = () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    router.refresh();
    setTimeout(() => { setRefreshing(false); refreshingRef.current = false; }, 1000);
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") { router.refresh(); startPolling(); }
      else stopPolling();
    };
    startPolling();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => { stopPolling(); document.removeEventListener("visibilitychange", handleVisibilityChange); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      // Only start pull if at top of page
      if (window.scrollY <= 0) {
        touchStartY.current = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (touchStartY.current === null) return;
      const dy = e.touches[0].clientY - touchStartY.current;
      if (dy > 0) {
        setPullY(Math.min(dy, PULL_THRESHOLD));
      }
    };

    const onTouchEnd = () => {
      if (pullY >= PULL_THRESHOLD) doRefresh();
      setPullY(0);
      touchStartY.current = null;
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pullY]);

  // Indicator — only visible when pulling or refreshing
  const visible = pullY > 8 || refreshing;
  const progress = Math.min(pullY / PULL_THRESHOLD, 1);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 top-0 z-50 flex justify-center transition-all"
      style={{ paddingTop: `max(env(safe-area-inset-top), ${pullY * 0.6}px)` }}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-stone-200">
        {refreshing ? (
          <svg className="h-5 w-5 animate-spin text-amber-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a10 10 0 100 10z" />
          </svg>
        ) : (
          <svg
            className="h-5 w-5 text-amber-400 transition-transform"
            style={{ transform: `rotate(${progress * 180}deg)` }}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          >
            <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </div>
  );
}
