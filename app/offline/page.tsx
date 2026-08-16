"use client";

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-6xl">📵</div>
      <h1 className="text-2xl font-bold">You&apos;re offline</h1>
      <p className="text-sm text-stone-500">
        Check your internet connection and try again.
      </p>
      <button
        onClick={() => typeof window !== "undefined" && window.location.reload()}
        className="mt-4 rounded-xl bg-amber-500 px-6 py-3 font-medium text-white"
      >
        Retry
      </button>
    </main>
  );
}
