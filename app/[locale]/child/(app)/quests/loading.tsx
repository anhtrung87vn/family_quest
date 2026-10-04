export default function QuestsLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 w-36 rounded-full bg-stone-200" />
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl bg-stone-100 p-4 space-y-2">
            <div className="h-4 w-2/3 rounded bg-stone-200" />
            <div className="h-3 w-1/3 rounded bg-stone-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
