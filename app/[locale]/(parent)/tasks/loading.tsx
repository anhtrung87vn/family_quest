export default function TasksLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 rounded-full bg-stone-200" />
        <div className="h-8 w-8 rounded-full bg-stone-100" />
      </div>
      {/* Create task placeholder */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="h-4 w-32 rounded bg-stone-200" />
      </div>
      {/* Task list */}
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-stone-200 bg-white p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded bg-stone-200" />
              <div className="h-4 w-40 rounded bg-stone-200" />
              <div className="ml-auto h-5 w-12 rounded-full bg-amber-100" />
            </div>
            <div className="h-3 w-2/3 rounded bg-stone-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
