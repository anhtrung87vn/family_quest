export default function ApprovalsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-8 w-40 rounded-full bg-stone-200" />
        <div className="h-6 w-8 rounded-full bg-blue-100" />
      </div>
      {/* Pending task cards */}
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-blue-100 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-blue-100" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-24 rounded bg-stone-200" />
                <div className="h-3 w-32 rounded bg-stone-100" />
              </div>
              <div className="h-5 w-10 rounded-full bg-amber-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
