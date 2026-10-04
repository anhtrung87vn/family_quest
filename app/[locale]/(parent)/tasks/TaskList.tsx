"use client";

import { useState, useDeferredValue, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { taskStyle } from "@/lib/category-style";
import { parseRule, type RecurrenceRule } from "@/lib/recurrence";
import { isAgeEligible } from "@/lib/age";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { toggleTaskActive, toggleTaskPool, assignTask, deleteTask, updateTask, disableOutOfAgeTasks, convertResponsibilityToHabit } from "./actions";
import { CoinIcon } from "@/components/ui/CoinIcon";
import { localName, localDesc } from "@/lib/localize";

type Task = {
  id: string;
  name: string;
  name_vi?: string | null;
  description: string | null;
  description_vi?: string | null;
  category: string | null;
  coin_reward: number;
  star_reward: number;
  active: boolean;
  recurrence_rule: string | null;
  in_pool?: boolean;
  behavior_type?: string;
  availability_type?: string;
  min_age?: number | null;
  recommended_age?: number | null;
  max_age?: number | null;
  evidence_type?: string | null;
  evidence_required?: boolean | null;
  requires_approval?: boolean | null;
  /** True when every child has a known age and none of them fits this task. */
  fitsNoChild?: boolean;
};

const BEHAVIOR_STYLES: Record<string, { icon: string; color: string }> = {
  responsibility: { icon: "🌱", color: "text-emerald-600 bg-emerald-50" },
  habit_building: { icon: "🌟", color: "text-amber-600 bg-amber-50" },
  challenge: { icon: "🎯", color: "text-blue-600 bg-blue-50" },
  character: { icon: "💎", color: "text-purple-600 bg-purple-50" },
  family: { icon: "👨‍👩‍👧‍👦", color: "text-pink-600 bg-pink-50" },
};

const KNOWN_CATEGORIES = new Set(["learning", "responsibility", "family", "health", "creativity"]);

const CHIP = "rounded-full px-2 py-0.5 text-[11px]";
const ACTION_BTN =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-medium transition-colors hover:bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500";

type Child = { id: string; name: string; age: number | null };

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

type Translate = ReturnType<typeof useTranslations>;

function recurrenceLabel(rule: RecurrenceRule, t: Translate, locale: string): string {
  if (rule.freq === "daily") return t("tasks.rec.daily");
  if (rule.freq === "weekdays") return t("tasks.rec.weekdays");
  // 2024-01-07 is a Sunday, so day index d (0=Sun) maps to 2024-01-(7+d).
  const fmt = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  return rule.days.map((d) => fmt.format(new Date(Date.UTC(2024, 0, 7 + d)))).join(", ");
}

function ageRangeLabel(task: Task): string {
  const { min_age: min, max_age: max } = task;
  if (min != null && max != null) return `${min}–${max}`;
  if (min != null) return `${min}+`;
  if (max != null) return `≤${max}`;
  return "";
}

function TaskCard({ task, childList, labels }: { task: Task; childList: Child[]; labels: TaskListProps["labels"] }) {
  const t = useTranslations();
  const locale = useLocale();
  const editVi = locale === "vi" && !!task.name_vi;
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const rule = parseRule(task.recurrence_rule);
  const style = taskStyle(task.category);
  const behavior = task.behavior_type ? BEHAVIOR_STYLES[task.behavior_type] : undefined;
  const hasAgeInfo = task.min_age != null || task.max_age != null || task.recommended_age != null;
  const canAssign = childList.length > 0 && task.active;

  const poolTitle = task.in_pool ? t("tasks.poolRemove") : t("tasks.poolAdd");

  function openPanel(panel: "edit" | "delete" | "assign") {
    setEditing((v) => (panel === "edit" ? !v : false));
    setConfirmDelete((v) => (panel === "delete" ? !v : false));
    setAssigning((v) => (panel === "assign" ? !v : false));
  }

  return (
    <div
      className={`rounded-2xl border bg-white px-4 py-3 shadow-sm ${task.fitsNoChild ? "border-amber-300" : "border-stone-200"} ${!task.active ? "opacity-50" : ""}`}
    >
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <span className="mt-0.5 text-xl" aria-hidden>{style.icon}</span>

        <div className="min-w-0 flex-1 basis-48">
          <div className="truncate font-semibold text-stone-800" title={localName(task, locale)}>
            {localName(task, locale)}
            {!task.active && <span className="ml-2 text-xs text-stone-400">({labels.inactive})</span>}
          </div>
          {localDesc(task, locale) && (
            <div className="line-clamp-1 text-xs text-stone-500" title={localDesc(task, locale)}>{localDesc(task, locale)}</div>
          )}

          {/* Chips */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {task.fitsNoChild && (
              <span className={`${CHIP} bg-amber-100 font-semibold text-amber-800`}>⚠️ {t("tasks.noChildFits")}</span>
            )}
            {task.coin_reward > 0 && (
              <span className={`${CHIP} bg-amber-100 font-semibold text-amber-700`}><CoinIcon /> {task.coin_reward}</span>
            )}
            {task.star_reward > 0 && (
              <span className={`${CHIP} bg-purple-100 font-semibold text-purple-700`}>⭐ {task.star_reward}</span>
            )}
            {task.behavior_type === "responsibility" && (
              <span className={`${CHIP} bg-emerald-100 font-semibold text-emerald-700`} title={t("tasks.weeklyStarsHint")}>
                🌱 {t("tasks.weeklyStars")}
              </span>
            )}
            {rule && <span className={`${CHIP} bg-stone-100 text-stone-600`}>🔄 {recurrenceLabel(rule, t, locale)}</span>}
            {task.category && (
              <span className={`${CHIP} ${style.bg} font-medium ${style.color}`}>
                {KNOWN_CATEGORIES.has(task.category) ? t(`tasks.cat.${task.category}`) : task.category}
              </span>
            )}
            {task.in_pool && (
              <span className={`${CHIP} bg-violet-100 font-semibold text-violet-600`}>✨ {labels.inPool}</span>
            )}
            {behavior && (
              <span className={`${CHIP} font-semibold ${behavior.color}`}>
                {behavior.icon} {t(`tasks.behavior.${task.behavior_type}`)}
              </span>
            )}
            {hasAgeInfo && (
              <span className={`${CHIP} bg-sky-100 font-medium text-sky-700`}>
                👦 {ageRangeLabel(task)}
                {task.recommended_age != null && (
                  <>
                    {ageRangeLabel(task) ? " · " : ""}
                    {t("tasks.ageRecommended", { age: task.recommended_age })}
                  </>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <form action={toggleTaskPool}>
            <input type="hidden" name="id" value={task.id} />
            <input type="hidden" name="in_pool" value={String(!!task.in_pool)} />
            <button
              type="submit"
              title={poolTitle}
              aria-label={poolTitle}
              aria-pressed={!!task.in_pool}
              className={`${ACTION_BTN} ${task.in_pool ? "text-violet-600" : "text-stone-400"}`}
            >
              ✨
            </button>
          </form>
          {task.behavior_type === "responsibility" && (
            <form
              action={convertResponsibilityToHabit}
              onSubmit={(e) => { if (!window.confirm(t("tasks.convertToHabitConfirm"))) e.preventDefault(); }}
            >
              <input type="hidden" name="id" value={task.id} />
              <button
                type="submit"
                title={t("tasks.convertToHabit")}
                aria-label={t("tasks.convertToHabit")}
                className={`${ACTION_BTN} text-emerald-600 hover:text-emerald-800`}
              >
                🌿
              </button>
            </form>
          )}
          <button
            type="button"
            title={t("tasks.editTask")}
            aria-label={t("tasks.editTask")}
            aria-expanded={editing}
            className={`${ACTION_BTN} text-indigo-500 hover:text-indigo-700`}
            onClick={() => openPanel("edit")}
          >
            ✏️
          </button>
          <button
            type="button"
            title={t("tasks.deleteTask")}
            aria-label={t("tasks.deleteTask")}
            aria-expanded={confirmDelete}
            className={`${ACTION_BTN} text-red-400 hover:text-red-600`}
            onClick={() => openPanel("delete")}
          >
            🗑
          </button>
          <form action={toggleTaskActive}>
            <input type="hidden" name="id" value={task.id} />
            <input type="hidden" name="active" value={String(task.active)} />
            <button type="submit" className={`${ACTION_BTN} text-stone-600`}>
              {task.active ? labels.disable : labels.enable}
            </button>
          </form>
          {canAssign && (
            <button
              type="button"
              aria-expanded={assigning}
              className={`${ACTION_BTN} border border-amber-300 text-amber-700 hover:bg-amber-50 ${assigning ? "bg-amber-100" : ""}`}
              onClick={() => openPanel("assign")}
            >
              📋 {labels.assign} {assigning ? "▴" : "▾"}
            </button>
          )}
        </div>
      </div>

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="mb-2 text-xs font-semibold text-red-700">⚠️ {t("tasks.deleteConfirm")}</p>
          <div className="flex gap-2">
            <form action={deleteTask}>
              <input type="hidden" name="id" value={task.id} />
              <Button type="submit" size="sm" className="bg-red-500 text-xs text-white hover:bg-red-600">{t("tasks.deleteConfirmYes")}</Button>
            </form>
            <Button size="sm" variant="ghost" className="text-xs" onClick={() => setConfirmDelete(false)}>{t("common.cancel")}</Button>
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
          {/* In Vietnamese, edit the Vietnamese text the parent actually sees. */}
          <input name={editVi ? "name_vi" : "name"} defaultValue={editVi ? task.name_vi ?? "" : task.name} required aria-label={t("tasks.name")}
            className="h-9 w-full rounded-lg border border-stone-300 px-3 text-sm" />
          <input name={editVi ? "description_vi" : "description"} defaultValue={(editVi ? task.description_vi : task.description) ?? ""} placeholder={t("tasks.description")} aria-label={t("tasks.description")}
            className="h-9 w-full rounded-lg border border-stone-300 px-3 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-1 text-xs text-stone-600">
              <CoinIcon /> <input name="coin_reward" type="number" min={0} max={500} defaultValue={task.coin_reward} aria-label={t("tasks.coins")}
                className="h-8 w-20 rounded-lg border border-stone-300 px-2 text-sm" />
            </label>
            <label className="flex items-center gap-1 text-xs text-stone-600">
              ⭐ <input name="star_reward" type="number" min={0} max={50} defaultValue={task.star_reward} aria-label={t("tasks.stars")}
                className="h-8 w-20 rounded-lg border border-stone-300 px-2 text-sm" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select name="evidence_type" defaultValue={task.evidence_type ?? "none"} aria-label={t("tasks.evidenceType")}
              className="h-9 rounded-lg border border-stone-300 px-2 text-xs">
              <option value="none">{t("tasks.evidence.none")}</option>
              <option value="photo">📸 {t("tasks.evidence.photo")}</option>
              <option value="audio">🎤 {t("tasks.evidence.audio")}</option>
              <option value="text">💬 {t("tasks.evidence.text")}</option>
              <option value="choice">🌟 {t("tasks.evidence.choice")}</option>
              <option value="parent_observation">👀 {t("tasks.evidence.parent_observation")}</option>
            </select>
            <label className="flex items-center gap-2 text-xs text-stone-600">
              <input name="evidence_required" type="checkbox" defaultChecked={!!task.evidence_required} className="h-3.5 w-3.5 rounded" />
              {t("tasks.evidenceRequired")}
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs text-stone-600">
            <input name="requires_approval" type="checkbox" defaultChecked={task.requires_approval ?? true} className="h-3.5 w-3.5 rounded" />
            {t("tasks.requiresApproval")}
          </label>
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="bg-indigo-500 text-xs text-white hover:bg-indigo-600">{t("common.save")}</Button>
            <Button type="button" size="sm" variant="ghost" className="text-xs" onClick={() => setEditing(false)}>{t("common.cancel")}</Button>
          </div>
        </form>
      )}

      {/* Assign */}
      {canAssign && assigning && (
        <form action={assignTask} className="mt-3 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3 text-sm">
          <input type="hidden" name="task_id" value={task.id} />
          {childList.map((c) => (
            <label key={c.id} className="flex items-center gap-1.5 rounded-lg bg-stone-50 px-2 py-1 text-xs">
              <input type="checkbox" name="child_ids" value={c.id} className="h-3.5 w-3.5 rounded" />
              {c.name}
            </label>
          ))}
          <input type="date" name="due_date" aria-label={t("tasks.dueDate")} className="h-8 rounded-lg border border-stone-300 px-2 text-xs" />
          <Button type="submit" size="sm">{labels.assign}</Button>
        </form>
      )}
    </div>
  );
}

function OutOfAgeBanner({ count }: { count: number }) {
  const t = useTranslations();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDisable() {
    startTransition(async () => {
      await disableOutOfAgeTasks();
      setConfirming(false);
    });
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="min-w-0 flex-1 basis-56 text-sm font-medium text-amber-800">
        ⚠️ {t("tasks.outOfAgeBanner", { count })}
      </p>
      {!confirming ? (
        <Button size="sm" variant="secondary" className="text-xs" onClick={() => setConfirming(true)}>
          {t("tasks.outOfAgeDisable")}
        </Button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-amber-800">{t("tasks.outOfAgeConfirm", { count })}</span>
          <Button size="sm" className="text-xs" onClick={handleDisable} disabled={isPending}>
            {isPending ? "…" : t("tasks.outOfAgeDisable")}
          </Button>
          <Button size="sm" variant="ghost" className="text-xs" onClick={() => setConfirming(false)} disabled={isPending}>
            {t("common.cancel")}
          </Button>
        </div>
      )}
    </div>
  );
}

export function TaskList({ tasks, children: childList, labels }: TaskListProps) {
  const t = useTranslations();
  const [raw, setRaw] = useState("");
  const [childFilter, setChildFilter] = useState<string | null>(null);
  const query = useDeferredValue(raw.trim().toLowerCase());

  const selectedChild = childList.find((c) => c.id === childFilter) ?? null;
  const outOfAgeCount = tasks.filter((task) => task.fitsNoChild).length;

  const filtered = tasks.filter((task) => {
    if (selectedChild && !isAgeEligible(task, selectedChild.age)) return false;
    if (!query) return true;
    return (
      task.name.toLowerCase().includes(query) ||
      (task.description ?? "").toLowerCase().includes(query) ||
      (task.name_vi ?? "").toLowerCase().includes(query) ||
      (task.category ?? "").toLowerCase().includes(query)
    );
  });

  const chipClass = (active: boolean) =>
    `h-8 rounded-full border px-3 text-xs font-medium transition-colors ${
      active ? "border-amber-400 bg-amber-100 text-amber-800" : "border-stone-200 bg-white text-stone-600 hover:border-amber-300"
    }`;

  return (
    <div>
      {outOfAgeCount > 0 && <OutOfAgeBanner count={outOfAgeCount} />}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400">🔍</span>
          <input
            type="search"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={labels.search}
            aria-label={labels.search}
            className="h-10 w-full rounded-xl border border-stone-300 bg-white pl-9 pr-4 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
          />
          {raw && (
            <button
              type="button"
              onClick={() => setRaw("")}
              title={t("tasks.clearSearch")}
              aria-label={t("tasks.clearSearch")}
              className="absolute inset-y-0 right-3 flex items-center text-stone-400 hover:text-stone-600"
            >
              ✕
            </button>
          )}
        </div>

        {childList.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t("tasks.filterByChild")}>
            <button type="button" aria-pressed={!selectedChild} className={chipClass(!selectedChild)} onClick={() => setChildFilter(null)}>
              {t("common.all")}
            </button>
            {childList.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={selectedChild?.id === c.id}
                className={chipClass(selectedChild?.id === c.id)}
                onClick={() => setChildFilter(c.id)}
              >
                {c.age != null ? `${c.name} · ${c.age}` : c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card><EmptyState icon="🔍" title={labels.noResults} description="" /></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => (
            <TaskCard key={task.id} task={task} childList={childList} labels={labels} />
          ))}
        </div>
      )}
    </div>
  );
}
