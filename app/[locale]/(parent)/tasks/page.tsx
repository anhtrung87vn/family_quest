import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveContext } from "@/lib/dev-family";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Collapsible } from "@/components/ui/Collapsible";
import { createTask } from "./actions";
import { TaskList } from "./TaskList";
import { CloneTemplatesButton } from "./CloneTemplatesButton";
import { DangerZone } from "./DangerZone";
import { CoinIcon } from "@/components/ui/CoinIcon";
import { ageFromDob } from "@/lib/age";
import { tasksFittingNoChild } from "@/lib/task-age-fit";

export default async function TasksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { familyId, supabase } = await resolveContext();
  const t = await getTranslations();

  const tasksQ = supabase.from("tasks").select("id, name, name_vi, description, description_vi, category, coin_reward, star_reward, active, recurrence_rule, in_pool, behavior_type, availability_type, min_age, recommended_age, max_age, evidence_type, evidence_required, requires_approval").eq("is_system_template", false).eq("active", true).eq("family_id", familyId);
  const childrenQ = supabase.from("children").select("id, name, date_of_birth").eq("family_id", familyId);
  const [{ data: tasks }, { data: children }] = await Promise.all([
    tasksQ.order("created_at", { ascending: false }),
    childrenQ.order("created_at"),
  ]);

  const childRows = (children ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    age: ageFromDob(c.date_of_birth as string | null),
  }));
  const taskRows = (tasks ?? []).map((task) => ({
    id: task.id,
    name: task.name,
    description: task.description ?? null,
    category: task.category ?? null,
    coin_reward: task.coin_reward,
    star_reward: task.star_reward,
    active: task.active,
    recurrence_rule: task.recurrence_rule ?? null,
    in_pool: !!(task as Record<string, unknown>).in_pool,
    behavior_type: ((task as Record<string, unknown>).behavior_type as string) ?? "challenge",
    availability_type: ((task as Record<string, unknown>).availability_type as string) ?? "assigned_only",
    min_age: ((task as Record<string, unknown>).min_age as number | null) ?? null,
    recommended_age: ((task as Record<string, unknown>).recommended_age as number | null) ?? null,
    max_age: ((task as Record<string, unknown>).max_age as number | null) ?? null,
  }));
  // Flagged only when every child has a known age (see tasksFittingNoChild).
  const outOfAgeIds = new Set(
    tasksFittingNoChild(taskRows, childRows.map((c) => c.age)).map((task) => task.id),
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">✅ {t("parent.tasks")}</h1>
        <DangerZone
          taskCount={tasks?.length ?? 0}
          labels={{
            deleteAll: t("parent.dangerDeleteAll"),
            deleteAllConfirm: t("parent.dangerDeleteAllConfirm"),
            deleteAllCancel: t("parent.dangerCancel"),
            deleteAllDone: t("parent.dangerDeleteAllDone"),
            backup: t("parent.dangerBackup"),
            backupDesc: t("parent.dangerBackupDesc"),
            restore: t("parent.dangerRestore"),
            restoreDesc: t("parent.dangerRestoreDesc"),
            restoreDone: t("parent.dangerRestoreDone"),
            restoreError: t("parent.dangerRestoreError"),
            resetReclone: t("parent.dangerResetReclone"),
            resetRecloneDesc: t("parent.dangerResetRecloneDesc"),
            resetRecloneConfirm: t("parent.dangerResetRecloneConfirm"),
            resetRecloneCancel: t("parent.dangerCancel"),
          }}
        />
      </div>

      {/* Create task — collapsible */}
      <Card>
        <Collapsible
          trigger={
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-stone-700">+ {t("tasks.newTask")}</span>
              <CloneTemplatesButton label={t("tasks.cloneTemplates")} />
            </div>
          }
        >
          <form action={createTask} className="space-y-4">
            {/* Info section */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                {t("tasks.infoSection")}
              </legend>
              <input name="name" placeholder={t("tasks.name")} required
                className="h-11 w-full rounded-xl border border-stone-300 px-3 text-sm" />
              <input name="description" placeholder={t("tasks.description")}
                className="h-11 w-full rounded-xl border border-stone-300 px-3 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <select name="category" className="h-11 rounded-xl border border-stone-300 px-3 text-sm">
                  <option value="">{t("tasks.category")}</option>
                  <option value="learning">📚 {t("tasks.cat.learning")}</option>
                  <option value="responsibility">🌱 {t("tasks.cat.responsibility")}</option>
                  <option value="family">❤️ {t("tasks.cat.family")}</option>
                  <option value="health">🏃 {t("tasks.cat.health")}</option>
                  <option value="creativity">🎨 {t("tasks.cat.creativity")}</option>
                </select>
                <select name="difficulty" className="h-11 rounded-xl border border-stone-300 px-3 text-sm">
                  <option value="">{t("tasks.difficulty")}</option>
                  <option value="1">★</option>
                  <option value="2">★★</option>
                  <option value="3">★★★</option>
                </select>
              </div>
            </fieldset>

            {/* Rewards section */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                {t("tasks.rewardSection")}
              </legend>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-amber-600"><CoinIcon /></span>
                  <span className="text-stone-600">{t("tasks.questCoins")}</span>
                  <input name="coin_reward" type="number" min={0} defaultValue={5}
                    className="h-10 w-20 rounded-xl border border-stone-300 px-3 text-sm" />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-purple-600">⭐</span>
                  <span className="text-stone-600">{t("common.stars")}</span>
                  <input name="star_reward" type="number" min={0} defaultValue={0}
                    className="h-10 w-20 rounded-xl border border-stone-300 px-3 text-sm" />
                </label>
              </div>
            </fieldset>

            {/* Schedule + settings */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                {t("tasks.scheduleSection")}
              </legend>
              <div className="grid grid-cols-2 gap-3">
                <select name="behavior_type" className="h-11 rounded-xl border border-stone-300 px-3 text-sm">
                  <option value="challenge">🎯 {t("tasks.behavior.challenge")}</option>
                  <option value="responsibility">🌱 {t("tasks.behavior.responsibility")}</option>
                  <option value="habit_building">🌟 {t("tasks.behavior.habit_building")}</option>
                  <option value="character">💎 {t("tasks.behavior.character")}</option>
                  <option value="family">👨‍👩‍👧‍👦 {t("tasks.behavior.family")}</option>
                </select>
                <select name="availability_type" className="h-11 rounded-xl border border-stone-300 px-3 text-sm">
                  <option value="assigned_only">📋 {t("tasks.availability.assigned_only")}</option>
                  <option value="choice_pool">✨ {t("tasks.availability.choice_pool")}</option>
                  <option value="both">📋✨ {t("tasks.availability.both")}</option>
                </select>
              </div>
              <select name="responsibility_policy" className="h-11 w-full rounded-xl border border-stone-300 px-3 text-sm">
                <option value="NONE">{t("parent.policyNone")}</option>
                <option value="REPAIR_REQUIRED">{t("parent.policyRepairRequired")}</option>
                <option value="COMPLETE_BEFORE_PRIVILEGE">{t("parent.policyCompleteBeforePrivilege")}</option>
                <option value="PARENT_DECIDES">{t("parent.policyParentDecides")}</option>
              </select>
              <select name="recurrence" className="h-11 w-full rounded-xl border border-stone-300 px-3 text-sm">
                <option value="none">{t("tasks.rec.none")}</option>
                <option value="daily">{t("tasks.rec.daily")}</option>
                <option value="weekdays">{t("tasks.rec.weekdays")}</option>
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input name="requires_approval" type="checkbox" defaultChecked className="h-4 w-4 rounded" />
                <span className="text-stone-600">{t("tasks.requiresApproval")}</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-stone-500 text-xs">{t("tasks.poolMaxPerDay")}</span>
                <input name="pool_max_per_day" type="number" min={1} max={5} defaultValue={1}
                  className="h-8 w-16 rounded-lg border border-stone-300 px-2 text-xs" />
              </label>
            </fieldset>

            {/* Evidence section */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                {t("tasks.evidenceSection")}
              </legend>
              <select name="evidence_type" className="h-11 w-full rounded-xl border border-stone-300 px-3 text-sm">
                <option value="none">{t("tasks.evidence.none")}</option>
                <option value="photo">📸 {t("tasks.evidence.photo")}</option>
                <option value="audio">🎤 {t("tasks.evidence.audio")}</option>
                <option value="text">💡 {t("tasks.evidence.text")}</option>
                <option value="choice">🌟 {t("tasks.evidence.choice")}</option>
                <option value="parent_observation">👀 {t("tasks.evidence.parent_observation")}</option>
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input name="evidence_required" type="checkbox" className="h-4 w-4 rounded" />
                <span className="text-stone-600">{t("tasks.evidenceRequired")}</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-stone-500 text-xs">{t("tasks.maxAudioSeconds")}</span>
                <input name="max_audio_seconds" type="number" min={5} max={60} defaultValue={30}
                  className="h-8 w-16 rounded-lg border border-stone-300 px-2 text-xs" />
              </label>
            </fieldset>

            <Button type="submit" className="w-full sm:w-auto">{t("tasks.create")}</Button>
          </form>
        </Collapsible>
      </Card>

      {/* Task list */}
      {!tasks?.length ? (
        <Card>
          <EmptyState
            icon="🎯"
            title={t("tasks.emptyTitle")}
            description={t("tasks.emptyDesc")}
          />
        </Card>
      ) : (
        <TaskList
          tasks={taskRows.map((task) => ({ ...task, fitsNoChild: outOfAgeIds.has(task.id) }))}
          children={childRows}
          labels={{
            search: t("tasks.search"),
            noResults: t("tasks.noResults"),
            inactive: t("tasks.inactive"),
            inPool: t("tasks.inPool"),
            disable: t("tasks.disable"),
            enable: t("tasks.enable"),
            assign: t("tasks.assign"),
          }}
        />
      )}
    </div>
  );
}
