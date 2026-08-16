"use client";

import { useState, useRef, useCallback, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { sendGeneralNote } from "@/app/[locale]/(parent)/approvals/actions";
import { compressImage } from "@/lib/compress-image";

interface Child {
  id: string;
  name: string;
  avatar_url?: string | null;
}

interface ParentNoteFormProps {
  child: Child;
  quickMessages: string[];
  labels: {
    placeholder: string;
    send: string;
    camera: string;
    gallery: string;
    record: string;
    stopRecord: string;
    capture: string;
    cancel: string;
    recording: string;
  };
}

type MediaMode = "none" | "webcam" | "gallery" | "audio";

export function ParentNoteForm({ child, quickMessages, labels }: ParentNoteFormProps) {
  const [message, setMessage] = useState("");
  const [mediaMode, setMediaMode] = useState<MediaMode>("none");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioMime, setAudioMime] = useState("audio/webm");
  const [audioExt, setAudioExt] = useState("webm");
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [camError, setCamError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const galleryRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stop webcam when mode changes away
  useEffect(() => {
    if (mediaMode !== "webcam" && streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, [mediaMode]);

  const openWebcam = async () => {
    setCamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      setMediaMode("webcam");
      setTimeout(() => {
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      }, 50);
    } catch {
      setCamError("Không thể mở camera. Kiểm tra quyền truy cập.");
    }
  };

  const captureWebcam = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const raw = new File([blob], "photo.jpg", { type: "image/jpeg" });
      const compressed = await compressImage(raw);
      setPhotoFile(compressed);
      setPhotoPreview(URL.createObjectURL(compressed));
      setMediaMode("none");
    }, "image/jpeg", 0.95);
  };

  const handleGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = "";
    const compressed = await compressImage(f);
    setPhotoFile(compressed);
    setPhotoPreview(URL.createObjectURL(compressed));
    setMediaMode("none");
  };

  const getBestAudioMime = () => {
    const candidates = ["audio/mp4", "audio/ogg;codecs=opus", "audio/webm;codecs=opus", "audio/webm"];
    for (const mt of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mt)) return mt;
    }
    return "";
  };

  const startAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getBestAudioMime();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const mt = recorder.mimeType || "audio/webm";
        const ext = mt.includes("mp4") ? "m4a" : mt.includes("ogg") ? "ogg" : "webm";
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setAudioMime(mt);
        setAudioExt(ext);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setRecSeconds(0);
      timerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch {
      setCamError("Không thể ghi âm. Kiểm tra quyền truy cập.");
    }
  }, []);

  const stopAudio = useCallback(() => {
    recorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const clearPhoto = () => { setPhotoFile(null); setPhotoPreview(null); };

  const clearAudio = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null); setAudioUrl(null); setRecSeconds(0);
  };

  const clearMedia = () => {
    clearPhoto(); clearAudio(); setMediaMode("none");
  };

  const handleSubmit = () => {
    const fd = new FormData();
    fd.set("child_id", child.id);
    fd.set("message", message.trim());
    if (photoFile) {
      fd.set("media_file", photoFile);
      fd.set("media_type", "photo");
    }
    if (audioBlob) {
      fd.set("audio_file", new File([audioBlob], `voice.${audioExt}`, { type: audioMime }));
      fd.set("audio_type", "audio");
    }
    startTransition(() => {
      sendGeneralNote(fd).then(() => {
        setMessage("");
        clearMedia();
      });
    });
  };

  const hasMedia = !!photoFile || !!audioBlob;
  const canSend = (message.trim() || hasMedia) && !isPending;

  return (
    <div className="space-y-2 rounded-xl border border-pink-100 bg-pink-50/50 p-3">
      {/* Child header */}
      <div className="flex items-center gap-2">
        {child.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={child.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-pink-200 text-xs font-bold text-pink-700">
            {child.name.slice(0, 1)}
          </div>
        )}
        <span className="text-sm font-semibold text-stone-700">{child.name}</span>
      </div>

      {/* Quick message chips */}
      <div className="flex flex-wrap gap-1">
        {quickMessages.map((msg) => (
          <button
            key={msg}
            type="button"
            onClick={() => setMessage(msg)}
            className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0 text-[11px] text-amber-700 hover:bg-amber-100 transition-colors leading-5"
          >
            {msg}
          </button>
        ))}
      </div>

      {/* Text input */}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder={labels.placeholder}
        className="w-full rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs resize-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400"
      />

      {/* Hidden inputs */}
      <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleGallery} />
      <canvas ref={canvasRef} className="hidden" />

      {/* Media area */}
      {camError && <p className="text-xs text-red-500">{camError}</p>}

      {mediaMode === "webcam" && (
        <div className="space-y-2">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl max-h-44 object-cover" />
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 bg-indigo-500 text-xs text-white hover:bg-indigo-600" onClick={captureWebcam}>
              📸 {labels.capture}
            </Button>
            <Button size="sm" variant="ghost" className="text-xs" onClick={() => setMediaMode("none")}>
              {labels.cancel}
            </Button>
          </div>
        </div>
      )}

      {mediaMode === "audio" && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-2 py-1">
          <span className="text-xs font-mono text-stone-700">
            {String(Math.floor(recSeconds / 60)).padStart(1, "0")}:{String(recSeconds % 60).padStart(2, "0")}
          </span>
          {recording && <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />}
          {!recording ? (
            <Button size="sm" className="h-7 px-2 text-[11px] bg-red-500 text-white hover:bg-red-600" onClick={startAudio}>
              🎤 {labels.record}
            </Button>
          ) : (
            <Button size="sm" className="h-7 px-2 text-[11px] bg-stone-600 text-white hover:bg-stone-700" onClick={stopAudio}>
              ⏹ {labels.stopRecord}
            </Button>
          )}
          {!recording && (
            <button type="button" className="text-[11px] text-stone-400 hover:text-stone-600" onClick={() => { clearMedia(); setMediaMode("none"); }}>
              {labels.cancel}
            </button>
          )}
        </div>
      )}

      {/* Photo preview */}
      {photoPreview && (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoPreview} alt="Preview" className="max-h-36 rounded-xl object-cover" />
          <button
            type="button"
            onClick={clearPhoto}
            className="absolute top-1 right-1 rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] text-white hover:bg-black/70"
          >
            ✕
          </button>
        </div>
      )}

      {/* Audio preview */}
      {audioUrl && !recording && (
        <div className="flex items-center gap-1.5">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio controls className="flex-1 h-8" src={audioUrl} />
          <button type="button" onClick={clearAudio} className="text-xs text-red-400 hover:text-red-600">🗑</button>
        </div>
      )}

      {/* Action row — compact icon+text buttons */}
      {mediaMode === "none" && (
        <div className="flex gap-1">
          {!photoFile && (
            <>
              <button type="button" onClick={openWebcam}
                className="rounded-md border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[11px] text-stone-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
                📷 {labels.camera}
              </button>
              <button type="button" onClick={() => galleryRef.current?.click()}
                className="rounded-md border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[11px] text-stone-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
                🖼 {labels.gallery}
              </button>
            </>
          )}
          {!audioBlob && (
            <button type="button" onClick={() => setMediaMode("audio")}
              className="rounded-md border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[11px] text-stone-500 hover:border-red-300 hover:text-red-600 transition-colors">
              🎤 {labels.record}
            </button>
          )}
        </div>
      )}

      <Button
        size="sm"
        className="h-8 w-full text-xs bg-pink-500 text-white hover:bg-pink-600"
        onClick={handleSubmit}
        disabled={!canSend}
      >
        {isPending ? "…" : `💌 ${labels.send}`}
      </Button>
    </div>
  );
}
