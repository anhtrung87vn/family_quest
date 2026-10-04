export default function StatsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-36 rounded-full bg-stone-200" />
      {/* Insight links */}
      <div className="grid gap-3 sm:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-stone-100" />
              <div className="space-y-1.5">
                <div className="h-4 w-28 rounded bg-stone-200" />
                <div className="h-3 w-36 rounded bg-stone-100" />
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Child stat cards */}
      {[...Array(2)].map((_, i) => (
        <div key={i} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-stone-200" />
            <div className="space-y-1.5">
              <div className="h-4 w-24 rounded bg-stone-200" />
              <div className="h-3 w-20 rounded bg-stone-100" />
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-stone-100" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 rounded-xl bg-amber-50" />
            <div className="h-16 rounded-xl bg-purple-50" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="h-14 rounded-xl bg-stone-50" />
            <div className="h-14 rounded-xl bg-stone-50" />
            <div className="h-14 rounded-xl bg-stone-50" />
          </div>
        </div>
      ))}
    </div>
  );
}
