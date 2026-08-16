"use client";

import { useEffect, useState } from "react";

interface CookieToastProps {
  cookieName: string;
  message: string;
  icon?: string;
}

export function CookieToast({ cookieName, message, icon = "🎉" }: CookieToastProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const has = document.cookie.split(";").some((c) => c.trim().startsWith(cookieName + "="));
    if (!has) return;
    // Clear the cookie
    document.cookie = `${cookieName}=; path=/; max-age=0`;
    setShow(true);
    const t = setTimeout(() => setShow(false), 3000);
    return () => clearTimeout(t);
  }, [cookieName]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto animate-bounce-in rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-500 to-purple-600 px-8 py-6 text-center text-white shadow-2xl">
        <div className="mb-2 text-4xl">{icon}</div>
        <div className="text-lg font-bold">{message}</div>
      </div>
    </div>
  );
}
