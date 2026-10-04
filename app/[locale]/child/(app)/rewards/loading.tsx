export default function RewardsLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 w-32 rounded-full bg-stone-200" />
      <div className="grid grid-cols-2 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-2xl bg-stone-100 overflow-hidden">
            <div className="h-1.5 w-full bg-stone-200" />
            <div className="p-3 space-y-2">
              <div className="h-4 w-full rounded bg-stone-200" />
              <div className="h-3 w-1/2 mx-auto rounded bg-stone-200" />
              <div className="h-8 w-full rounded-xl bg-stone-200 mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
