"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface RepairItem {
  id: string;
  taskName: string;
  eventType: string;
  occurredAt: string;
}

interface RepairSectionProps {
  items: RepairItem[];
  action: (formData: FormData) => Promise<void>;
  labels: {
    repairSection: string;
    repairPrompt: string;
    repairDone: string;
    repairResolved: string;
  };
}

export function RepairSection({ items, action, labels }: RepairSectionProps) {
  const [resolved, setResolved] = useState<Set<string>>(new Set());

  if (items.length === 0) return null;

  const pending = items.filter((i) => !resolved.has(i.id));
  if (pending.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-bold text-emerald-700">
        🌱 {labels.repairSection}
      </h2>
      <div className="space-y-2">
        {pending.map((item) => (
          <Card key={item.id} className="border-emerald-200 bg-emerald-50/50 !p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-stone-700 truncate">
                  {item.taskName}
                </p>
                <p className="text-[10px] text-stone-400 mt-0.5">
                  {labels.repairPrompt}
                </p>
              </div>
              <form
                action={async (fd) => {
                  await action(fd);
                  setResolved((prev) => new Set(prev).add(item.id));
                }}
              >
                <input type="hidden" name="event_id" value={item.id} />
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 shrink-0 bg-emerald-500 text-white hover:bg-emerald-600 text-xs"
                >
                  ✅ {labels.repairDone}
                </Button>
              </form>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
