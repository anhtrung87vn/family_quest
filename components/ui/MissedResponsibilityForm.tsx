"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface MissedResponsibilityFormProps {
  taskId: string;
  childId: string;
  assignmentId?: string | null;
  action: (formData: FormData) => Promise<void>;
  labels: {
    whatHappened: string;
    forgot: string;
    neededHelp: string;
    excused: string;
    refused: string;
    skip: string;
    parentNote: string;
    submit: string;
    handled: string;
  };
}

export function MissedResponsibilityForm({
  taskId,
  childId,
  assignmentId,
  action,
  labels,
}: MissedResponsibilityFormProps) {
  const [expanded, setExpanded] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700 font-medium">
        ✅ {labels.handled}
      </div>
    );
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-100 transition-colors"
      >
        🌱 {labels.whatHappened}
      </button>
    );
  }

  return (
    <form
      action={async (fd) => {
        await action(fd);
        setSubmitted(true);
      }}
      className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3"
    >
      <input type="hidden" name="task_id" value={taskId} />
      <input type="hidden" name="child_id" value={childId} />
      {assignmentId && <input type="hidden" name="task_assignment_id" value={assignmentId} />}

      <div className="text-xs font-semibold text-stone-700 mb-1">{labels.whatHappened}</div>

      <div className="space-y-1">
        {([
          { value: "forgot", label: labels.forgot, icon: "💭" },
          { value: "needed_help", label: labels.neededHelp, icon: "🤝" },
          { value: "excused", label: labels.excused, icon: "📅" },
          { value: "refused", label: labels.refused, icon: "🚫" },
          { value: "skip", label: labels.skip, icon: "⏭️" },
        ] as const).map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-emerald-100/50 cursor-pointer">
            <input
              type="radio"
              name="reason"
              value={opt.value}
              required
              className="accent-emerald-600"
            />
            <span className="text-sm">{opt.icon}</span>
            <span className="text-xs text-stone-700">{opt.label}</span>
          </label>
        ))}
      </div>

      <textarea
        name="parent_note"
        placeholder={labels.parentNote}
        maxLength={500}
        rows={2}
        className="w-full rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs resize-none focus:border-emerald-300 focus:outline-none"
      />

      <div className="flex gap-2">
        <Button type="submit" size="sm" className="flex-1 bg-emerald-500 text-white hover:bg-emerald-600">
          {labels.submit}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setExpanded(false)}
          className="text-stone-400"
        >
          ✕
        </Button>
      </div>
    </form>
  );
}
