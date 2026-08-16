"use client";

import { useEffect, useRef, useState } from "react";

interface ParentMessageMediaProps {
  mediaType: "photo" | "audio";
  signedUrl: string;
  autoPlay?: boolean;
}

export function ParentMessageMedia({ mediaType, signedUrl, autoPlay }: ParentMessageMediaProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const didAutoPlay = useRef(false);

  useEffect(() => {
    if (autoPlay && mediaType === "audio" && audioRef.current && !didAutoPlay.current) {
      didAutoPlay.current = true;
      const t = setTimeout(() => {
        audioRef.current?.play().catch(() => {});
      }, 600);
      return () => clearTimeout(t);
    }
  }, [autoPlay, mediaType]);

  if (mediaType === "photo") {
    return (
      <>
        {/* Thumbnail — click to open lightbox */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={signedUrl}
          alt="Ảnh từ ba/mẹ"
          onClick={() => setLightboxOpen(true)}
          className="mt-2 w-full max-h-52 rounded-xl object-cover shadow-sm cursor-zoom-in"
        />

        {/* Lightbox */}
        {lightboxOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setLightboxOpen(false)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={signedUrl}
              alt="Ảnh từ ba/mẹ"
              className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40 text-lg"
              onClick={() => setLightboxOpen(false)}
            >
              ✕
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-2 rounded-xl bg-pink-100/60 px-3 py-2">
      <span className="text-xl">🎤</span>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        controls
        src={signedUrl}
        className="flex-1 h-9"
        style={{ colorScheme: "light" }}
      />
    </div>
  );
}
