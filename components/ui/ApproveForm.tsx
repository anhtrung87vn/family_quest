"use client";

import { useState, useRef, useCallback, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { approveCompletion } from "@/app/[locale]/(parent)/approvals/actions";
import { compressImage } from "@/lib/compress-image";

interface ApproveFormProps {
  completionId: string;
  quickMessages: string[];
  labels: {
    celebration: string;
    approve: string;
    camera: string;
    gallery: string;
    record: string;
    stopRecord: string;
    capture: string;
    cancel: string;
  };
}

type MediaMode = "none" | "webcam" | "audio";

export function ApproveForm({ completionId, quickMessages, labels }: ApproveFormProps) {
  const [celebration, setCelebration] = useState("");
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

  const clearMedia = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setAudioBlob(null);
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null); }
    setRecSeconds(0);
    setMediaMode("none");
  };


  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const clearAudio = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecSeconds(0);
  };

  const handleApprove = () => {
    const fd = new FormData();
    fd.set("id", completionId);
    fd.set("celebration", celebration);
    if (photoFile) {
      fd.set("media_file", photoFile);
      fd.set("media_type", "photo");
    }
    if (audioBlob) {
      fd.set("audio_file", new File([audioBlob], `voice.${audioExt}`, { type: audioMime }));
      fd.set("audio_type", "audio");
    }
    startTransition(() => { approveCompletion(fd); });
  };

  return (
    <div className="space-y-1.5">
      {/* Quick message chips — compact */}
      <div className="flex flex-wrap gap-1">
        {quickMessages.map((msg) => (
          <button
            key={msg}
            type="button"
            onClick={() => setCelebration(msg)}
            className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0 text-[11px] text-amber-700 hover:bg-amber-100 transition-colors leading-5"
          >
            {msg}
          </button>
        ))}
      </div>

      {/* Text input + approve — compact */}
      <div className="flex gap-1.5">
        <input
          value={celebration}
          onChange={(e) => setCelebration(e.target.value)}
          placeholder={labels.celebration}
          className="h-8 flex-1 rounded-lg border border-stone-300 px-2.5 text-xs focus:border-emerald-400 focus:ring-1 focus:ring-emerald-300"
        />
        <Button
          size="sm"
          className="h-8 px-3 text-xs bg-emerald-500 text-white hover:bg-emerald-600 shrink-0"
          onClick={handleApprove}
          disabled={isPending}
        >
          {isPending ? "…" : `✅ ${labels.approve}`}
        </Button>
      </div>

      {/* Media action buttons — icon+label, compact row */}
      {mediaMode === "none" && (
        <div className="flex gap-1">
          {!photoFile && (
            <>
              <button
                type="button"
                onClick={openWebcam}
                className="rounded-md border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[11px] text-stone-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
              >
                📷 {labels.camera}
              </button>
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className="rounded-md border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[11px] text-stone-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
              >
                🖼 {labels.gallery}
              </button>
            </>
          )}
          {!audioBlob && (
            <button
              type="button"
              onClick={() => setMediaMode("audio")}
              className="rounded-md border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[11px] text-stone-500 hover:border-red-300 hover:text-red-600 transition-colors"
            >
              🎤 {labels.record}
            </button>
          )}
        </div>
      )}

      {/* Hidden inputs */}
      <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleGallery} />
      <canvas ref={canvasRef} className="hidden" />

      {/* Error */}
      {camError && <p className="text-[11px] text-red-500">{camError}</p>}

      {/* Webcam view */}
      {mediaMode === "webcam" && (
        <div className="space-y-1.5">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl max-h-40 object-cover" />
          <div className="flex gap-1.5">
            <Button size="sm" className="flex-1 h-8 text-[11px] bg-indigo-500 text-white hover:bg-indigo-600" onClick={captureWebcam}>
              📸 {labels.capture}
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-[11px]" onClick={() => setMediaMode("none")}>
              {labels.cancel}
            </Button>
          </div>
        </div>
      )}

      {/* Audio recorder */}
      {mediaMode === "audio" && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-2 py-1">
          <span className="text-xs font-mono text-stone-700">
            {String(Math.floor(recSeconds / 60)).padStart(1, "0")}:{String(recSeconds % 60).padStart(2, "0")}
          </span>
          {recording && <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />}
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
          <img src={photoPreview} alt="Preview" className="max-h-28 rounded-lg object-cover" />
          <button
            type="button"
            onClick={clearPhoto}
            className="absolute top-1 right-1 rounded-full bg-black/50 px-1 py-0 text-[10px] text-white hover:bg-black/70"
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
    </div>
  );
}
