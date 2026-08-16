"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 15_000; // 15 seconds

/**
 * Keeps child-facing pages fresh without a manual reload.
 *
 * Strategy (two layers):
 * 1. Visibility refresh — fires router.refresh() immediately when the tab
 *    becomes visible again (e.g. parent approved on another device/tab).
 * 2. Polling — fires router.refresh() every POLL_INTERVAL_MS while the tab
 *    is visible, so coins/stars/quest status update automatically.
 *
 * router.refresh() re-runs all RSC data fetches for the current page and
 * updates the UI in-place (no full navigation, scroll position preserved).
 */
export function RealtimeRefresher() {
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startPolling = () => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      router.refresh();
    }, POLL_INTERVAL_MS);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Immediate refresh when tab comes back into view
        router.refresh();
        startPolling();
      } else {
        stopPolling();
      }
    };

    // Start polling immediately on mount
    startPolling();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
