import { clsx } from "clsx";

export function ProgressBar({
  value,
  max,
  className,
  color = "amber",
  size = "md",
  showPct = false,
}: {
  value: number;
  max: number;
  className?: string;
  color?: "amber" | "indigo" | "emerald" | "blue" | "pink" | "purple" | "orange";
  size?: "sm" | "md" | "lg";
  showPct?: boolean;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const colors = {
    amber: "bg-amber-400",
    indigo: "bg-indigo-400",
    emerald: "bg-emerald-400",
    blue: "bg-blue-400",
    pink: "bg-pink-400",
    purple: "bg-purple-400",
    orange: "bg-orange-400",
  };
  const sizes = { sm: "h-2", md: "h-3", lg: "h-4" };
  return (
    <div className={clsx("relative w-full overflow-hidden rounded-full bg-stone-200", sizes[size], className)}>
      <div
        className={clsx("h-full rounded-full transition-all duration-500", colors[color])}
        style={{ width: `${pct}%` }}
      />
      {showPct && (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-stone-700">
          {pct}%
        </span>
      )}
    </div>
  );
}
