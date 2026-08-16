"use client";

import { useState, useDeferredValue } from "react";
import { taskStyle } from "@/lib/category-style";
import { parseRule, ruleLabel } from "@/lib/recurrence";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { toggleTaskActive, toggleTaskPool, assignTask, updateBehaviorType, updateRewardStage, deleteTask, updateTask } from "./actions";

type Task = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  coin_reward: number;
  star_reward: number;
  active: boolean;
  recurrence_rule: string | null;
  in_pool?: boolean;
  behavior_type?: string;
  availability_type?: string;
};

const BEHAVIOR_LABELS: Record<string, { icon: string; label: string; color: string }> = {
  responsibility: { icon: "🌱", label: "Responsibility", color: "text-emerald-600 bg-emerald-50" },
  habit_building: { icon: "🌟", label: "Habit", color: "text-amber-600 bg-amber-50" },
  challenge: { icon: "🎯", label: "Challenge", color: "text-blue-600 bg-blue-50" },
  character: { icon: "💎", label: "Character", color: "text-purple-600 bg-purple-50" },
  family: { icon: "👨‍👩‍👧‍👦", label: "Family", color: "text-pink-600 bg-pink-50" },
};

type Child = { id: string; name: string };

interface TaskListProps {
  tasks: Task[];
  children: Child[];
  labels: {
    search: string;
    noResults: string;
    inactive: string;
    inPool: string;
    disable: string;
    enable: string;
    assign: string;
  };
}

function TaskCard({ task, childList, labels }: { task: Task; childList: Child[]; labels: TaskListProps["labels"] }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const rule = parseRule(task.recurrence_rule);
  const style = taskStyle(task.category);

  return (
    <Card className={`${!task.active ? "opacity-50" : ""}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-xl">{style.icon}</span>
        <div className="flex-1">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div className="font-semibold text-stone-800">
              {task.name}
              {!task.active && <span className="ml-2 text-xs text-stone-400">({labels.inactive})</span>}
            </div>
            <div className="flex items-center gap-1">
              <form action={toggleTaskPool}>
                <input type="hidden" name="id" value={task.id} />
                <input type="hidden" name="in_pool" value={String(!!task.in_pool)} />
                <Button type="submit" size="sm" variant="ghost" className={`text-xs ${task.in_pool ? "text-violet-600" : "text-stone-400"}`}>✨</Button>
              </form>
              <form action={toggleTaskActive}>
                <input type="hidden" name="id" value={task.id} />
                <input type="hidden" name="active" value={String(task.active)} />
                <Button type="submit" size="sm" variant="ghost" className="text-xs">{task.active ? labels.disable : labels.enable}</Button>
              </form>
              <Button
                size="sm" variant="ghost"
                className="text-xs text-indigo-500 hover:text-indigo-700"
                onClick={() => { setEditing((v) => !v); setConfirmDelete(false); }}
              >
                ✏️
              </Button>
              <Button
                size="sm" variant="ghost"
                className="text-xs text-red-400 hover:text-red-600"
                onClick={() => { setConfirmDelete((v) => !v); setEditing(false); }}
              >
                🗑
              </Button>
            </div>
          </div>

          {task.description && <div className="mt-0.5 text-xs text-stone-500">{task.description}</div>}

          {/* Badges */}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">🪙 {task.coin_reward}</span>
            {task.star_reward > 0 && (
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-700">⭐ {task.star_reward}</span>
            )}
            {rule && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">🔄 {ruleLabel(rule)}</span>}
            {task.category && (
              <span className={`rounded-full ${style.bg} px-2 py-0.5 text-[11px] font-medium ${style.color}`}>{task.category}</span>
            )}
            {task.in_pool && (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-600">✨ {labels.inPool}</span>
            )}
            {task.behavior_type && BEHAVIOR_LABELS[task.behavior_type] && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${BEHAVIOR_LABELS[task.behavior_type].color}`}>
                {BEHAVIOR_LABELS[task.behavior_type].icon} {BEHAVIOR_LABELS[task.behavior_type].label}
              </span>
            )}
          </div>

          {/* Delete confirm */}
          {confirmDelete && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="mb-2 text-xs font-semibold text-red-700">⚠️ Xoá task này? (task sẽ bị vô hiệu hoá, không mất lịch sử)</p>
              <div className="flex gap-2">
                <form action={deleteTask}>
                  <input type="hidden" name="id" value={task.id} />
                  <Button type="submit" size="sm" className="bg-red-500 text-xs text-white hover:bg-red-600">Xác nhận xoá</Button>
                </form>
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => setConfirmDelete(false)}>Huỷ</Button>
              </div>
            </div>
          )}

          {/* Edit form */}
          {editing && (
            <form
              action={async (fd) => { await updateTask(fd); setEditing(false); }}
              className="mt-3 space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3"
            >
              <input type="hidden" name="id" value={task.id} />
              <input name="name" defaultValue={task.name} required
                className="h-9 w-full rounded-lg border border-stone-300 px-3 text-sm" />
              <input name="description" defaultValue={task.description ?? ""} placeholder="Mô tả"
                className="h-9 w-full rounded-lg border border-stone-300 px-3 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-1 text-xs text-stone-600">
                  🪙 <input name="coin_reward" type="number" min={0} max={500} defaultValue={task.coin_reward}
                    className="h-8 w-20 rounded-lg border border-stone-300 px-2 text-sm" />
                </label>
                <label className="flex items-center gap-1 text-xs text-stone-600">
                  ⭐ <input name="star_reward" type="number" min={0} max={50} defaultValue={task.star_reward}
                    className="h-8 w-20 rounded-lg border border-stone-300 px-2 text-sm" />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select name="evidence_type" defaultValue="none"
                  className="h-9 rounded-lg border border-stone-300 px-2 text-xs">
                  <option value="none">Không cần bằng chứng</option>
                  <option value="photo">📸 Ảnh</option>
                  <option value="audio">🎤 Ghi âm</option>
                  <option value="text">💬 Viết</option>
                  <option value="choice">🌟 Chọn</option>
                  <option value="parent_observation">👀 Ba/Mẹ ghi nhận</option>
                </select>
                <label className="flex items-center gap-2 text-xs text-stone-600">
                  <input name="evidence_required" type="checkbox" className="h-3.5 w-3.5 rounded" />
                  Bắt buộc
                </label>
              </div>
              <label className="flex items-center gap-2 text-xs text-stone-600">
                <input name="requires_approval" type="checkbox" defaultChecked className="h-3.5 w-3.5 rounded" />
                Cần duyệt
              </label>
              <div className="flex gap-2">
                <Button type="submit" size="sm" className="bg-indigo-500 text-xs text-white hover:bg-indigo-600">Lưu</Button>
                <Button type="button" size="sm" variant="ghost" className="text-xs" onClick={() => setEditing(false)}>Huỷ</Button>
              </div>
            </form>
          )}

          {/* Assign */}
          {childList.length > 0 && task.active && !editing && !confirmDelete && (
            <form action={assignTask} className="mt-3 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3 text-sm">
              <input type="hidden" name="task_id" value={task.id} />
              {childList.map((c) => (
                <label key={c.id} className="flex items-center gap-1.5 rounded-lg bg-stone-50 px-2 py-1 text-xs">
                  <input type="checkbox" name="child_ids" value={c.id} className="h-3.5 w-3.5 rounded" />
                  {c.name}
                </label>
              ))}
              <input type="date" name="due_date" className="h-8 rounded-lg border border-stone-300 px-2 text-xs" />
              <Button type="submit" size="sm">{labels.assign}</Button>
            </form>
          )}
        </div>
      </div>
    </Card>
  );
}

export function TaskList({ tasks, children: childList, labels }: TaskListProps) {
  const [raw, setRaw] = useState("");
  const query = useDeferredValue(raw.trim().toLowerCase());

  const filtered = query
    ? tasks.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          (t.description ?? "").toLowerCase().includes(query) ||
          (t.category ?? "").toLowerCase().includes(query)
      )
    : tasks;

  return (
    <div>
      <div className="relative mb-4">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400">🔍</span>
        <input
          type="search"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={labels.search}
          className="h-10 w-full rounded-xl border border-stone-300 bg-white pl-9 pr-4 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
        />
        {raw && (
          <button onClick={() => setRaw("")} className="absolute inset-y-0 right-3 flex items-center text-stone-400 hover:text-stone-600">✕</button>
        )}
      </div>
      {filtered.length === 0 ? (
        <Card><EmptyState icon="🔍" title={labels.noResults} description="" /></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => (
            <TaskCard key={task.id} task={task} childList={childList} labels={labels} />
          ))}
        </div>
      )}
    </div>
  );
}
