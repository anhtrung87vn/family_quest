export default function HomeLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 w-40 rounded-full bg-stone-200" />
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl bg-stone-100 p-4 space-y-2">
            <div className="h-4 w-3/4 rounded bg-stone-200" />
            <div className="h-3 w-1/2 rounded bg-stone-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
