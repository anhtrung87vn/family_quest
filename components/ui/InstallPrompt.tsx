"use client";

import { useEffect, useState } from "react";
import { Button } from "./Button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Only show if not already installed
      if (!window.matchMedia("(display-mode: standalone)").matches) {
        setShow(true);
      }
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!show || !deferredPrompt) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    }
    setDeferredPrompt(null);
  }

  return (
    <div className="fixed bottom-20 left-1/2 z-40 w-[90%] max-w-sm -translate-x-1/2 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-lg">
      <div className="mb-2 text-center text-sm font-medium">
        📲 Install BloomQuest for the best experience!
      </div>
      <div className="flex gap-2">
        <Button onClick={handleInstall} size="sm" className="flex-1">
          Install
        </Button>
        <Button onClick={() => setShow(false)} size="sm" variant="ghost" className="flex-1">
          Later
        </Button>
      </div>
    </div>
  );
}
