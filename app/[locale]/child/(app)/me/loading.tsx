export default function MeLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="rounded-2xl bg-stone-100 p-4 flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-stone-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 rounded bg-stone-200" />
          <div className="h-3 w-32 rounded bg-stone-200" />
          <div className="h-2 w-full rounded-full bg-stone-200" />
        </div>
      </div>
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl bg-stone-100 p-4 space-y-2">
            <div className="h-4 w-1/2 rounded bg-stone-200" />
            <div className="h-3 w-3/4 rounded bg-stone-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
