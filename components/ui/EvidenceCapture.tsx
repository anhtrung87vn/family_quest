"use client";

import { useState, useRef, useCallback, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { submitTaskAction } from "@/app/[locale]/child/(app)/actions";
import { compressImage } from "@/lib/compress-image";

type EvidenceType = "none" | "photo" | "audio" | "text" | "choice" | "parent_observation";

interface ChoiceOption {
  value: string;
  emoji: string;
  label: string;
}

interface EvidenceCaptureProps {
  assignmentId: string;
  evidenceType: EvidenceType;
  evidenceRequired: boolean;
  maxAudioSeconds: number;
  evidenceBadgeLabel?: string | null;
  labels: {
    done: string;
    photoPrompt: string;
    audioPrompt: string;
    textPrompt: string;
    choicePrompt: string;
    skip: string;
    submit: string;
    recording: string;
    stopRecord: string;
    startRecord: string;
  };
  choices: ChoiceOption[];
}

export function EvidenceCapture({
  assignmentId,
  evidenceType,
  evidenceRequired,
  maxAudioSeconds,
  evidenceBadgeLabel,
  labels,
  choices,
}: EvidenceCaptureProps) {
  const [showCapture, setShowCapture] = useState(false);
  const [isPending, startTransition] = useTransition();

  // For tasks with no evidence or parent_observation, render simple Done button
  if (evidenceType === "none" || evidenceType === "parent_observation") {
    return (
      <form action={submitTaskAction}>
        <input type="hidden" name="assignment_id" value={assignmentId} />
        <Button
          type="submit"
          size="sm"
          className="bg-emerald-500 px-4 text-xs font-bold text-white hover:bg-emerald-600"
        >
          {labels.done}
        </Button>
      </form>
    );
  }

  const capturePanel = showCapture ? (
    <div className="mt-3 w-full rounded-2xl border border-indigo-100 bg-white p-4 shadow-lg">
      {evidenceType === "photo" && (
        <PhotoCapture
          assignmentId={assignmentId}
          labels={labels}
          evidenceRequired={evidenceRequired}
          isPending={isPending}
          startTransition={startTransition}
          onCancel={() => setShowCapture(false)}
        />
      )}
      {evidenceType === "audio" && (
        <AudioCapture
          assignmentId={assignmentId}
          labels={labels}
          maxSeconds={maxAudioSeconds}
          evidenceRequired={evidenceRequired}
          isPending={isPending}
          startTransition={startTransition}
          onCancel={() => setShowCapture(false)}
        />
      )}
      {evidenceType === "text" && (
        <TextCapture
          assignmentId={assignmentId}
          labels={labels}
          evidenceRequired={evidenceRequired}
          isPending={isPending}
          startTransition={startTransition}
          onCancel={() => setShowCapture(false)}
        />
      )}
      {evidenceType === "choice" && (
        <ChoiceCapture
          assignmentId={assignmentId}
          labels={labels}
          choices={choices}
          evidenceRequired={evidenceRequired}
          isPending={isPending}
          startTransition={startTransition}
          onCancel={() => setShowCapture(false)}
        />
      )}
    </div>
  ) : null;

  // Render: top row has badge (clickable) + Done button; panel expands full-width below
  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-2">
        {evidenceBadgeLabel && (
          <button
            type="button"
            onClick={() => setShowCapture((v) => !v)}
            className={`rounded-full px-2 py-1 text-[11px] font-semibold transition-colors ${
              showCapture
                ? "bg-indigo-500 text-white"
                : "bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
            }`}
          >
            {evidenceBadgeLabel}
          </button>
        )}
        <Button
          size="sm"
          className="ml-auto shrink-0 bg-emerald-500 px-4 text-xs font-bold text-white hover:bg-emerald-600"
          onClick={() => setShowCapture((v) => !v)}
          disabled={isPending}
        >
          {isPending ? "..." : labels.done}
        </Button>
      </div>
      {capturePanel}
    </div>
  );
}

// ─── Photo Capture ──────────────────────────────────────────

function PhotoCapture({
  assignmentId,
  labels,
  evidenceRequired,
  isPending,
  startTransition,
  onCancel,
}: {
  assignmentId: string;
  labels: EvidenceCaptureProps["labels"];
  evidenceRequired: boolean;
  isPending: boolean;
  startTransition: (fn: () => void) => void;
  onCancel: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop webcam stream when component unmounts or showWebcam = false
  useEffect(() => {
    if (!showWebcam && streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, [showWebcam]);

  const openWebcam = async () => {
    setCamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      setShowWebcam(true);
      // Assign stream to video after state update
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 50);
    } catch {
      setCamError("Không thể mở camera. Hãy kiểm tra quyền truy cập.");
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
      const f = new File([blob], "webcam.jpg", { type: "image/jpeg" });
      const compressed = await compressImage(f);
      setFile(compressed);
      setPreview(URL.createObjectURL(compressed));
      setShowWebcam(false);
    }, "image/jpeg", 0.9);
  };

  const handleGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = "";
    const compressed = await compressImage(f);
    setFile(compressed);
    setPreview(URL.createObjectURL(compressed));
  };

  const handleSubmit = () => {
    const fd = new FormData();
    fd.set("assignment_id", assignmentId);
    fd.set("evidence_type", "photo");
    if (file) fd.set("evidence_file", file);
    startTransition(() => { submitTaskAction(fd); });
  };

  const handleSkip = () => {
    const fd = new FormData();
    fd.set("assignment_id", assignmentId);
    startTransition(() => { submitTaskAction(fd); });
  };

  return (
    <div className="space-y-3">
      <p className="text-center text-sm font-semibold text-stone-700">
        📸 {labels.photoPrompt}
      </p>
      {/* Hidden gallery file input */}
      <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleGallery} />
      {/* Hidden canvas for webcam capture */}
      <canvas ref={canvasRef} className="hidden" />

      {showWebcam ? (
        <div className="space-y-2">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl object-cover max-h-48" />
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 bg-indigo-500 text-xs font-bold text-white hover:bg-indigo-600" onClick={captureWebcam}>
              📸 Chụp
            </Button>
            <Button size="sm" variant="ghost" className="text-xs text-stone-400" onClick={() => setShowWebcam(false)}>
              Hủy
            </Button>
          </div>
        </div>
      ) : preview ? (
        <div className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Preview" className="max-h-40 w-full rounded-xl object-cover" />
          <button
            type="button"
            onClick={() => { setFile(null); setPreview(null); }}
            className="text-[11px] text-red-400 hover:text-red-600"
          >
            🗑 Xóa ảnh
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {camError && <p className="text-xs text-red-500 text-center">{camError}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={openWebcam}
              className="flex flex-col items-center justify-center gap-1 h-24 rounded-xl border-2 border-dashed border-stone-300 text-stone-500 hover:border-indigo-400 hover:text-indigo-500 transition-colors text-xs font-medium"
            >
              <span className="text-2xl">📷</span>
              Camera
            </button>
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              className="flex flex-col items-center justify-center gap-1 h-24 rounded-xl border-2 border-dashed border-stone-300 text-stone-500 hover:border-indigo-400 hover:text-indigo-500 transition-colors text-xs font-medium"
            >
              <span className="text-2xl">🖼️</span>
              Thư viện
            </button>
          </div>
        </div>
      )}
      <div className="flex gap-2">
        {!evidenceRequired && (
          <Button size="sm" variant="ghost" className="flex-1 text-xs text-stone-400" onClick={handleSkip} disabled={isPending}>
            {labels.skip}
          </Button>
        )}
        <Button
          size="sm"
          className="flex-1 bg-emerald-500 text-xs font-bold text-white hover:bg-emerald-600"
          onClick={file ? handleSubmit : undefined}
          disabled={isPending || !file}
        >
          {isPending ? "..." : file ? labels.submit : labels.photoPrompt}
        </Button>
      </div>
      {!file && !showWebcam && (
        <button type="button" onClick={onCancel} className="w-full text-xs text-stone-400 hover:text-stone-600">
          {labels.skip}
        </button>
      )}
    </div>
  );
}

// ─── Audio Capture ──────────────────────────────────────────

function AudioCapture({
  assignmentId,
  labels,
  maxSeconds,
  evidenceRequired,
  isPending,
  startTransition,
  onCancel,
}: {
  assignmentId: string;
  labels: EvidenceCaptureProps["labels"];
  maxSeconds: number;
  evidenceRequired: boolean;
  isPending: boolean;
  startTransition: (fn: () => void) => void;
  onCancel: () => void;
}) {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pick best supported mimeType for cross-platform compatibility
  const getBestMimeType = () => {
    const candidates = ["audio/mp4", "audio/ogg;codecs=opus", "audio/webm;codecs=opus", "audio/webm"];
    for (const mt of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mt)) return mt;
    }
    return "";
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getBestMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= maxSeconds) {
            recorder.stop();
            setRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return maxSeconds;
          }
          return s + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("[AudioCapture] microphone error:", err);
    }
  }, [maxSeconds]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const handleSubmit = () => {
    const fd = new FormData();
    fd.set("assignment_id", assignmentId);
    fd.set("evidence_type", "audio");
    if (audioBlob) {
      // Choose extension based on actual mimeType for cross-platform playback
      const ext = audioBlob.type.includes("mp4") ? "m4a" : audioBlob.type.includes("ogg") ? "ogg" : "webm";
      fd.set("evidence_file", new File([audioBlob], `recording.${ext}`, { type: audioBlob.type }));
      fd.set("audio_duration", String(seconds));
    }
    startTransition(() => { submitTaskAction(fd); });
  };

  const handleSkip = () => {
    const fd = new FormData();
    fd.set("assignment_id", assignmentId);
    startTransition(() => { submitTaskAction(fd); });
  };

  return (
    <div className="space-y-3">
      <p className="text-center text-sm font-semibold text-stone-700">
        🎤 {labels.audioPrompt}
      </p>
      <div className="flex flex-col items-center gap-2">
        <div className="text-2xl font-mono text-stone-600">
          {String(Math.floor(seconds / 60)).padStart(1, "0")}:{String(seconds % 60).padStart(2, "0")}
          <span className="text-xs text-stone-400 ml-1">/ {maxSeconds}s</span>
        </div>
        {recording && (
          <div className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            {labels.recording}
          </div>
        )}
      </div>
      <div className="flex justify-center gap-2">
        {!audioBlob && !recording && (
          <Button
            size="sm"
            className="bg-red-500 text-xs font-bold text-white hover:bg-red-600"
            onClick={startRecording}
          >
            🎤 {labels.startRecord}
          </Button>
        )}
        {recording && (
          <Button
            size="sm"
            className="bg-stone-600 text-xs font-bold text-white hover:bg-stone-700"
            onClick={stopRecording}
          >
            ⏹ {labels.stopRecord}
          </Button>
        )}
      </div>
      {audioBlob && (
        <>
          <audio controls className="w-full" src={URL.createObjectURL(audioBlob)} />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 text-xs text-stone-400"
              onClick={() => { setAudioBlob(null); setSeconds(0); }}
              disabled={isPending}
            >
              🔄 {labels.startRecord}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-red-400"
              onClick={() => { setAudioBlob(null); setSeconds(0); }}
              disabled={isPending}
            >
              🗑
            </Button>
          </div>
          <div className="flex gap-2">
            {!evidenceRequired && (
              <Button
                size="sm"
                variant="ghost"
                className="flex-1 text-xs text-stone-400"
                onClick={handleSkip}
                disabled={isPending}
              >
                {labels.skip}
              </Button>
            )}
            <Button
              size="sm"
              className="flex-1 bg-emerald-500 text-xs font-bold text-white hover:bg-emerald-600"
              onClick={handleSubmit}
              disabled={isPending}
            >
              {isPending ? "..." : labels.submit}
            </Button>
          </div>
        </>
      )}
      {!audioBlob && !recording && (
        <button type="button" onClick={onCancel} className="w-full text-xs text-stone-400 hover:text-stone-600">
          {labels.skip}
        </button>
      )}
    </div>
  );
}

// ─── Text Capture ──────────────────────────────────────────

function TextCapture({
  assignmentId,
  labels,
  evidenceRequired,
  isPending,
  startTransition,
  onCancel,
}: {
  assignmentId: string;
  labels: EvidenceCaptureProps["labels"];
  evidenceRequired: boolean;
  isPending: boolean;
  startTransition: (fn: () => void) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");

  const handleSubmit = () => {
    const fd = new FormData();
    fd.set("assignment_id", assignmentId);
    fd.set("evidence_type", "text");
    fd.set("evidence_text", text);
    startTransition(() => { submitTaskAction(fd); });
  };

  const handleSkip = () => {
    const fd = new FormData();
    fd.set("assignment_id", assignmentId);
    startTransition(() => { submitTaskAction(fd); });
  };

  return (
    <div className="space-y-3">
      <p className="text-center text-sm font-semibold text-stone-700">
        💡 {labels.textPrompt}
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={500}
        rows={3}
        className="w-full rounded-xl border border-stone-300 p-3 text-sm resize-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
        placeholder="..."
      />
      <div className="text-right text-[10px] text-stone-400">{text.length}/500</div>
      <div className="flex gap-2">
        {!evidenceRequired && (
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 text-xs text-stone-400"
            onClick={handleSkip}
            disabled={isPending}
          >
            {labels.skip}
          </Button>
        )}
        <Button
          size="sm"
          className="flex-1 bg-emerald-500 text-xs font-bold text-white hover:bg-emerald-600"
          onClick={handleSubmit}
          disabled={isPending || (evidenceRequired && !text.trim())}
        >
          {isPending ? "..." : labels.submit}
        </Button>
      </div>
    </div>
  );
}

// ─── Choice Capture ──────────────────────────────────────────

function ChoiceCapture({
  assignmentId,
  labels,
  choices,
  evidenceRequired,
  isPending,
  startTransition,
  onCancel,
}: {
  assignmentId: string;
  labels: EvidenceCaptureProps["labels"];
  choices: ChoiceOption[];
  evidenceRequired: boolean;
  isPending: boolean;
  startTransition: (fn: () => void) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSubmit = (choiceValue: string) => {
    const fd = new FormData();
    fd.set("assignment_id", assignmentId);
    fd.set("evidence_type", "choice");
    fd.set("evidence_choice", choiceValue);
    startTransition(() => { submitTaskAction(fd); });
  };

  const handleSkip = () => {
    const fd = new FormData();
    fd.set("assignment_id", assignmentId);
    startTransition(() => { submitTaskAction(fd); });
  };

  return (
    <div className="space-y-3">
      <p className="text-center text-sm font-semibold text-stone-700">
        🌟 {labels.choicePrompt}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {choices.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => {
              setSelected(c.value);
              handleSubmit(c.value);
            }}
            disabled={isPending}
            className={`rounded-xl border-2 p-3 text-center text-xs font-medium transition-all ${
              selected === c.value
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-stone-200 bg-stone-50 text-stone-600 hover:border-emerald-300"
            }`}
          >
            <span className="text-lg block mb-0.5">{c.emoji}</span>
            {c.label}
          </button>
        ))}
      </div>
      {!evidenceRequired && (
        <button
          type="button"
          onClick={handleSkip}
          disabled={isPending}
          className="w-full text-xs text-stone-400 hover:text-stone-600"
        >
          {labels.skip}
        </button>
      )}
    </div>
  );
}
