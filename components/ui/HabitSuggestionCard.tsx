"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface HabitSuggestionCardProps {
  taskId: string;
  childId: string;
  message: string;
  action: (formData: FormData) => Promise<void>;
  labels: {
    startHabitBuilding: string;
    dismissSuggestion: string;
  };
}

export function HabitSuggestionCard({
  taskId,
  childId,
  message,
  action,
  labels,
}: HabitSuggestionCardProps) {
  const [dismissed, setDismissed] = useState(false);
  const [started, setStarted] = useState(false);

  if (dismissed || started) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/60 !p-3">
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">🌿</span>
        <div className="flex-1">
          <p className="text-xs text-stone-700">{message}</p>
          <div className="mt-2 flex gap-2">
            <form
              action={async (fd) => {
                await action(fd);
                setStarted(true);
              }}
            >
              <input type="hidden" name="task_id" value={taskId} />
              <input type="hidden" name="child_id" value={childId} />
              <Button type="submit" size="sm" className="bg-amber-500 text-white hover:bg-amber-600 text-xs">
                {labels.startHabitBuilding}
              </Button>
            </form>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setDismissed(true)}
              className="text-stone-400 text-xs"
            >
              {labels.dismissSuggestion}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
