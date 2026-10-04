export default function MeLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Profile card */}
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-stone-100 p-6">
        <div className="h-20 w-20 rounded-full bg-stone-200" />
        <div className="h-5 w-28 rounded bg-stone-200" />
        <div className="h-4 w-36 rounded bg-stone-200" />
        <div className="h-2 w-60 max-w-full rounded-full bg-stone-200" />
        <div className="mt-1 grid w-full grid-cols-3 gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-stone-200" />
          ))}
        </div>
      </div>
      {/* Level-up gifts, badges, collection */}
      {[...Array(3)].map((_, i) => (
        <div key={i} className="space-y-2 rounded-2xl bg-stone-100 p-4">
          <div className="h-5 w-1/2 rounded bg-stone-200" />
          <div className="h-4 w-3/4 rounded bg-stone-200" />
          <div className="h-4 w-2/3 rounded bg-stone-200" />
        </div>
      ))}
    </div>
  );
}
