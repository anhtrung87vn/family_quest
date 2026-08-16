"use client";

import { useRef } from "react";

export function QuickMessages({
  messages,
  inputName,
}: {
  messages: string[];
  inputName: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = (msg: string) => {
    const form = containerRef.current?.closest("form");
    const input = form?.querySelector<HTMLInputElement>(`[name="${inputName}"]`);
    if (input) input.value = msg;
  };

  return (
    <div ref={containerRef} className="flex w-full flex-wrap gap-1">
      {messages.map((msg) => (
        <button
          key={msg}
          type="button"
          className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700 hover:bg-amber-100"
          onClick={() => handleClick(msg)}
        >
          {msg}
        </button>
      ))}
    </div>
  );
}
