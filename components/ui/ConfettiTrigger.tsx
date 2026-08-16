"use client";

import { useEffect, useState } from "react";
import { ConfettiOverlay } from "./ConfettiOverlay";

function checkConfettiCookie() {
  const match = document.cookie.match(/(?:^|;\s*)confetti=1/);
  if (match) {
    document.cookie = "confetti=; path=/; max-age=0";
    return true;
  }
  return false;
}

export function ConfettiTrigger() {
  const [fire, setFire] = useState(false);

  useEffect(() => {
    // Check on mount and on every focus/visibilitychange (covers post-refresh)
    const check = () => {
      if (checkConfettiCookie()) setFire(true);
    };

    check();
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, []);

  return <ConfettiOverlay trigger={fire} />;
}
