import { clsx } from "clsx";

export function EmptyState({
  icon,
  title,
  description,
  className,
}: {
  icon: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-col items-center gap-2 py-6 text-center", className)}>
      <span className="text-4xl">{icon}</span>
      <p className="text-sm font-medium text-stone-600">{title}</p>
      {description && <p className="text-xs text-stone-400">{description}</p>}
    </div>
  );
}
