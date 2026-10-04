export default function LibraryLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div>
        <div className="h-8 w-48 rounded bg-stone-200" />
        <div className="mt-2 h-4 w-80 rounded bg-stone-100" />
      </div>
      {/* Filter bar */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-3">
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-7 w-20 rounded-full bg-stone-100" />
          ))}
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-7 w-24 rounded-full bg-stone-100" />
          ))}
        </div>
        <div className="h-10 w-full rounded-xl bg-stone-100" />
      </div>
      {/* Cards grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-2">
            <div className="h-5 w-3/4 rounded bg-stone-200" />
            <div className="flex gap-1">
              <div className="h-4 w-14 rounded-full bg-stone-100" />
              <div className="h-4 w-10 rounded-full bg-stone-100" />
              <div className="h-4 w-16 rounded-full bg-stone-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
