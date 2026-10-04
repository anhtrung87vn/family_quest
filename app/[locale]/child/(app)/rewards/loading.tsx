export default function RewardsLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-7 w-28 rounded-full bg-stone-200" />
      <div className="h-32 w-full rounded-2xl bg-stone-200" />
      {[4, 4].map((count, s) => (
        <div key={s} className="space-y-3">
          <div className="h-5 w-36 rounded-full bg-stone-200" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(count)].map((_, i) => (
              <div key={i} className="space-y-2 rounded-2xl bg-stone-100 p-3">
                <div className="flex items-start justify-between">
                  <div className="h-8 w-8 rounded-lg bg-stone-200" />
                  <div className="h-5 w-12 rounded-full bg-stone-200" />
                </div>
                <div className="h-4 w-3/4 rounded bg-stone-200" />
                <div className="h-2 w-full rounded-full bg-stone-200" />
                <div className="h-3 w-1/2 rounded bg-stone-200" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
