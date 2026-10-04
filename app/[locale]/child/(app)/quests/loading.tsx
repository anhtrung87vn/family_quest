export default function QuestsLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Today's quests */}
      <div className="space-y-3">
        <div className="h-6 w-36 rounded-full bg-stone-200" />
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-2xl bg-stone-100 p-4 space-y-2">
            <div className="h-4 w-2/3 rounded bg-stone-200" />
            <div className="h-3 w-1/3 rounded bg-stone-200" />
          </div>
        ))}
      </div>
      {/* Quest Pool */}
      <div className="space-y-3">
        <div className="h-6 w-32 rounded-full bg-stone-200" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-stone-100" />
          ))}
        </div>
      </div>
      {/* Waiting + completed */}
      <div className="space-y-2">
        <div className="h-6 w-40 rounded-full bg-stone-200" />
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-stone-100" />
        ))}
      </div>
    </div>
  );
}
