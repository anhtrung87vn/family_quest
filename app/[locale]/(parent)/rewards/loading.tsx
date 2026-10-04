export default function RewardsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-32 rounded-full bg-stone-200" />
      {/* Create reward placeholder */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="h-4 w-36 rounded bg-stone-200" />
      </div>
      {/* Reward cards */}
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-stone-200 bg-white p-4 space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-stone-200" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-32 rounded bg-stone-200" />
                <div className="h-3 w-20 rounded bg-stone-100" />
              </div>
              <div className="h-6 w-14 rounded-full bg-amber-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
