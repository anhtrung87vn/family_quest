import { getTranslations, setRequestLocale } from "next-intl/server";
import { getChildSession } from "@/lib/auth/child-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayISO } from "@/lib/recurrence";
import { taskStyle } from "@/lib/category-style";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { submitTaskAction } from "../actions";
import { redirect } from "@/lib/i18n/routing";

export const dynamic = "force-dynamic";

export default async function ChildQuests({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const sessionOrNull = await getChildSession();
  if (!sessionOrNull) redirect({ href: "/child/select", locale });
  const session = sessionOrNull!;
  const admin = createAdminClient();
  const todayStr = todayISO();

  const { data: rows } = await admin
    .from("task_assignments")
    .select("id, status, due_date, created_at, task:tasks(id, name, category, coin_reward, star_reward)")
    .eq("child_id", session.childId)
    .order("created_at", { ascending: false })
    .limit(100);

  const today = rows?.filter((r) => (r.status === "todo" || r.status === "rejected") && (!r.due_date || r.due_date <= todayStr)) ?? [];
  const upcoming = rows?.filter((r) => r.status === "todo" && r.due_date && r.due_date > todayStr) ?? [];
  const waiting = rows?.filter((r) => r.status === "submitted") ?? [];
  const done = rows?.filter((r) => r.status === "approved") ?? [];

  // Fetch evidence status for completed assignments (Gap #7 + #8)
  const doneIds = done.map((d) => d.id);
  const evidenceStatusMap = new Map<string, { type: string; status: string }>();
  if (doneIds.length > 0) {
    const { data: completions } = await admin
      .from("task_completions")
      .select("id, assignment_id")
      .in("assignment_id", doneIds);
    const completionIds = (completions ?? []).map((c) => c.id);
    const assignmentToCompletion = new Map<string, string>();
    for (const c of completions ?? []) assignmentToCompletion.set(c.assignment_id, c.id);

    if (completionIds.length > 0) {
      const { data: evidenceRows } = await admin
        .from("task_evidence")
        .select("task_completion_id, evidence_type, status")
        .in("task_completion_id", completionIds);
      for (const ev of evidenceRows ?? []) {
        // Find assignment_id for this completion
        for (const [aId, cId] of assignmentToCompletion) {
          if (cId === ev.task_completion_id) {
            evidenceStatusMap.set(aId, { type: ev.evidence_type, status: ev.status });
            break;
          }
        }
      }
    }
  }

  return (
    <div className="space-y-5">
      {/* 🎯 Today's Adventure */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-stone-800">
          🎯 {t("child.todayQuests")}
        </h2>
        {!today.length ? (
          <Card className="border-emerald-200 bg-emerald-50">
            <EmptyState
              icon="🎉"
              title={t("child.emptyTodayTitle")}
              description={t("child.emptyTodayDesc")}
            />
          </Card>
        ) : (
          <ul className="space-y-3">
            {today.map((a) => {
              const task = Array.isArray(a.task) ? a.task[0] : a.task;
              const cat = taskStyle(task?.category);
              return (
                <li key={a.id} className={`rounded-2xl border ${cat.border} ${cat.bg} p-4 shadow-sm`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{cat.icon}</span>
                        <div>
                          <div className="font-semibold text-stone-800">{task?.name}</div>
                          <div className={`text-[10px] font-medium ${cat.color}`}>
                            {t(`tasks.cat.${task?.category ?? "learning"}`)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-1.5 flex items-center gap-3 text-sm">
                        <span className="font-medium text-amber-600">🪙 +{task?.coin_reward}</span>
                        {task?.star_reward ? (
                          <span className="font-medium text-purple-600">⭐ +{task.star_reward}</span>
                        ) : null}
                      </div>
                    </div>
                    <form action={submitTaskAction}>
                      <input type="hidden" name="assignment_id" value={a.id} />
                      <Button type="submit" size="sm" className="bg-emerald-500 px-5 text-sm font-bold text-white hover:bg-emerald-600">
                        ✅ {t("child.doneShort")}
                      </Button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 📅 Upcoming */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-stone-800">
            📅 {t("child.upcoming")}
          </h2>
          <ul className="space-y-2">
            {upcoming.map((a) => {
              const task = Array.isArray(a.task) ? a.task[0] : a.task;
              const cat = taskStyle(task?.category);
              return (
                <li key={a.id} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 opacity-75">
                  <span className="text-lg">{cat.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-stone-600">{task?.name}</div>
                    <div className="text-xs text-stone-400">📅 {a.due_date}</div>
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-amber-600">🪙 +{task?.coin_reward}</span>
                    {task?.star_reward ? <span className="ml-1 text-purple-600">⭐ +{task.star_reward}</span> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ⏳ Waiting for approval */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-stone-800">
          ⏳ {t("child.waitingSection")}
        </h2>
        {!waiting.length ? (
          <Card>
            <EmptyState
              icon="✨"
              title={t("child.emptyWaitingTitle")}
              description={t("child.emptyWaitingDesc")}
            />
          </Card>
        ) : (
          <ul className="space-y-2">
            {waiting.map((a) => {
              const task = Array.isArray(a.task) ? a.task[0] : a.task;
              const cat = taskStyle(task?.category);
              return (
                <li key={a.id} className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <span className="text-lg">{cat.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{task?.name}</div>
                    <div className="text-xs text-amber-600">⏳ {t("child.waiting")}</div>
                  </div>
                  <span className="text-xs text-stone-400">
                    🪙 +{task?.coin_reward}
                    {task?.star_reward ? ` ⭐ +${task.star_reward}` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ✅ Completed */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-stone-800">
          ✅ {t("child.completed")}
        </h2>
        {!done.length ? (
          <Card>
            <EmptyState
              icon="🌟"
              title={t("child.emptyCompletedTitle")}
              description={t("child.emptyCompletedDesc")}
            />
          </Card>
        ) : (
          <ul className="space-y-2">
            {done.slice(0, 20).map((a) => {
              const task = Array.isArray(a.task) ? a.task[0] : a.task;
              const cat = taskStyle(task?.category);
              return (
                <li key={a.id} className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{cat.icon}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-stone-600">{task?.name}</div>
                    </div>
                    <span className="text-xs font-medium text-emerald-600">✓ {t("child.approved")}</span>
                  </div>
                  {/* Evidence status fallback UI */}
                  {evidenceStatusMap.has(a.id) && (() => {
                    const ev = evidenceStatusMap.get(a.id)!;
                    const icon = ev.type === "audio" ? "🎤" : ev.type === "photo" ? "📷" : "📝";
                    if (ev.status === "promoted") return (
                      <div className="mt-1 text-[10px] text-emerald-600">
                        {icon} ❤️ {t("child.evidenceSavedMemory")}
                      </div>
                    );
                    if (ev.status === "expired") return (
                      <div className="mt-1 text-[10px] text-stone-400">
                        {icon} {t("child.evidenceExpired")}
                      </div>
                    );
                    if (ev.status === "deleted") return (
                      <div className="mt-1 text-[10px] text-stone-400">
                        {icon} {t("child.evidenceDeleted")}
                      </div>
                    );
                    return null;
                  })()}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
