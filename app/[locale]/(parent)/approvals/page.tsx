import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveContext } from "@/lib/dev-family";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Collapsible } from "@/components/ui/Collapsible";
import { PendingApprovalRow, PendingSubmitButton } from "@/components/ui/PendingApprovalRow";
import {
  approveCompletion,
  rejectCompletion,
  approveRedemptionAction,
  rejectRedemptionAction,
  adjustCoins,
  getEvidenceSignedUrl,
  markLevelGiftGiven,
} from "./actions";
import { syncLevelUps, pendingLevelGifts, type PendingLevelGift } from "@/lib/level-ups";
import { levelGift, levelTitle } from "@/lib/levels";
import { levelIcon } from "@/lib/category-style";
import { EvidenceReview, type EvidenceItem } from "@/components/ui/EvidenceReview";
import { ParentNoteForm } from "@/components/ui/ParentNoteForm";
import { ApproveForm } from "@/components/ui/ApproveForm";
import { getParentMessageSignedUrl } from "./actions";
import { MissedResponsibilityForm } from "@/components/ui/MissedResponsibilityForm";
import { handleMissedResponsibility, startHabitSupport } from "../tasks/responsibility-actions";
import { todayISO } from "@/lib/recurrence";
import { getResponsibilitySummary } from "@/lib/responsibility";
import { HabitSuggestionCard } from "@/components/ui/HabitSuggestionCard";
import { CoinIcon } from "@/components/ui/CoinIcon";
import { timeAgo } from "@/lib/time-ago";
import { localName } from "@/lib/localize";

/** Localized "5 minutes ago" / "5 phút trước" for a past timestamp. */

export default async function ApprovalsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { familyId, supabase } = await resolveContext();
  const t = await getTranslations();

  const today = todayISO();

  // Parallel: fetch all independent data at once.
  // resolveContext now returns the user-scoped client, so RLS scopes every
  // query automatically. The !inner joins + explicit family_id filters are
  // kept as belt-and-suspenders defence.
  type MissedTask = { id: string; status: string; due_date: string; child: { id: string; name: string; avatar_url: string | null } | null; task: { id: string; name: string; name_vi: string | null; behavior_type: string | null; responsibility_policy: string | null; category: string | null } | null };
  const [pendingTasksResult, pendingRedemptionsResult, childrenResult, missedResult] = await Promise.all([
    supabase
      .from("task_completions")
      .select("id, submitted_at, assignment:task_assignments!inner(id, child:children!inner(id,name,avatar_url), task:tasks(id,name,name_vi,coin_reward,star_reward,category))")
      .eq("status", "submitted")
      .eq("assignment.child.family_id", familyId)
      .order("submitted_at", { ascending: true }),
    supabase
      .from("reward_redemptions")
      .select("id, coin_cost, requested_at, child:children!inner(id,name,avatar_url), reward:rewards(id,name,name_vi)")
      .eq("status", "requested")
      .eq("child.family_id", familyId)
      .order("requested_at", { ascending: true }),
    supabase.from("children").select("id, name, avatar_url, lifetime_stars").eq("family_id", familyId).order("created_at"),
    supabase
      .from("task_assignments")
      .select("id, status, due_date, child:children!inner(id, name, avatar_url), task:tasks(id, name, name_vi, behavior_type, responsibility_policy, category)")
      .in("status", ["todo", "expired"])
      .eq("child.family_id", familyId)
      .lte("due_date", today)
      .order("due_date", { ascending: true }),
  ]);
  const pendingTasks = pendingTasksResult.data;
  const pendingRedemptions = pendingRedemptionsResult.data;
  const children = childrenResult.data;

  // Filter missed responsibilities to responsibility/habit_building tasks scoped to family
  const childIds = new Set((children ?? []).map((c) => c.id));
  const missedResponsibilities: MissedTask[] = ((missedResult.data ?? []) as unknown as MissedTask[]).filter((a: MissedTask) => {
    const task = Array.isArray(a.task) ? a.task[0] : a.task;
    const bt = (task as any)?.behavior_type;
    if (bt !== "responsibility" && bt !== "habit_building") return false;
    const child = Array.isArray(a.child) ? a.child[0] : a.child;
    return child && childIds.has(child.id);
  });

  // Habit support suggestions — detect repeated forgetting patterns
  type HabitSuggestion = { taskId: string; taskName: string; taskNameVi: string | null; childId: string; childName: string; forgottenCount: number };
  let habitSuggestions: HabitSuggestion[] = [];
  try {
    const allSummaries = await Promise.all(
      (children ?? []).map((c) => getResponsibilitySummary(familyId, c.id)),
    );
    habitSuggestions = allSummaries
      .flat()
      .filter((s) => s.suggestHabitSupport)
      .map((s) => ({
        taskId: s.taskId,
        taskName: s.taskName,
        taskNameVi: s.taskNameVi,
        childId: s.childId,
        childName: s.childName,
        forgottenCount: s.forgottenCount,
      }));
  } catch (e) {
    console.error("[approvals] habit suggestions error:", e);
  }

  // Recent messages with reactions
  let recentMessages: Array<{ id: string; message: string; message_type: string; created_at: string; reaction: string | null; child_id: string; reference_id: string | null; media_type: string | null; media_path: string | null; media_mime: string | null; media_signed_url?: string | null }> = [];
  {
    const msgQuery = supabase
      .from("parent_messages")
      .select("id, message, message_type, created_at, reaction, child_id, reference_id, media_type, media_path, media_mime")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false })
      .limit(10);
    const { data: msgs, error: msgsErr } = await msgQuery;
    if (msgsErr) console.error("[approvals] parent_messages fetch error:", msgsErr);
    // Resolve signed URLs in parallel — rebuild objects instead of mutating frozen rows
    type RawMsg = Omit<typeof recentMessages[0], "media_signed_url">;
    const msgsRaw = (msgs ?? []) as RawMsg[];
    const mediaMsgs = msgsRaw.filter((m) => m.media_path && (m.media_type === "photo" || m.media_type === "audio"));
    const signedUrls = await Promise.all(mediaMsgs.map((m) => getParentMessageSignedUrl(m.media_path!)));
    const signedUrlMap = new Map(mediaMsgs.map((m, i) => [m.id, signedUrls[i]]));
    recentMessages = msgsRaw.map((m) => ({
      ...m,
      media_signed_url: signedUrlMap.get(m.id) ?? null,
    }));
  }

  // Fetch task names for QUEST_APPROVAL messages
  const taskCompletionIds = recentMessages
    .filter((m) => m.message_type === "QUEST_APPROVAL" && m.reference_id)
    .map((m) => m.reference_id!);
  const taskNameMap = new Map<string, string>();
  if (taskCompletionIds.length > 0) {
    const { data: completions } = await supabase
      .from("task_completions")
      .select("id, assignment:task_assignments(task:tasks(name, name_vi))")
      .in("id", taskCompletionIds);
    for (const tc of completions ?? []) {
      const assignment: any = Array.isArray(tc.assignment) ? tc.assignment[0] : tc.assignment;
      const task: any = assignment?.task;
      const taskName = localName(Array.isArray(task) ? task[0] : task, locale);
      if (taskName) taskNameMap.set(tc.id, taskName);
    }
  }

  // Fetch evidence for pending task completions
  const completionIds = (pendingTasks ?? []).map((c) => c.id);
  const evidenceMap = new Map<string, EvidenceItem[]>();
  if (completionIds.length > 0) {
    const { data: evidenceRows } = await supabase
      .from("task_evidence")
      .select("id, task_completion_id, evidence_type, storage_path, text_content, choice_value, audio_duration, mime_type, status, expires_at")
      .in("task_completion_id", completionIds)
      .eq("family_id", familyId)
      .in("status", ["active", "promoted"]);
    // Resolve all signed URLs in parallel
    const rows = evidenceRows ?? [];
    const needsUrl = rows.filter((ev) => ev.storage_path && (ev.evidence_type === "photo" || ev.evidence_type === "audio") && ev.status === "active");
    const urls = await Promise.all(needsUrl.map((ev) => getEvidenceSignedUrl(ev.storage_path!)));
    const urlMap = new Map(needsUrl.map((ev, i) => [ev.id, urls[i]]));
    for (const ev of rows) {
      const arr = evidenceMap.get(ev.task_completion_id) ?? [];
      arr.push({
        id: ev.id,
        evidence_type: ev.evidence_type,
        storage_path: ev.storage_path,
        signed_url: urlMap.get(ev.id) ?? null,
        text_content: ev.text_content,
        choice_value: ev.choice_value,
        audio_duration: ev.audio_duration,
        mime_type: ev.mime_type,
        status: ev.status,
        expires_at: ev.expires_at,
      });
      evidenceMap.set(ev.task_completion_id, arr);
    }
  }

  const evidenceLabels = {
    evidenceLabel: t("approvals.evidenceLabel"),
    noEvidence: t("approvals.noEvidence"),
    keepAsMemory: t("approvals.keepAsMemory"),
    deleteEvidence: t("approvals.deleteEvidence"),
    saveToDevice: t("approvals.saveToDevice"),
    promoted: t("approvals.promoted"),
    deleted: t("approvals.deleted"),
    deleteConfirmTitle: t("approvals.deleteConfirmTitle"),
    deleteConfirmBody: t("approvals.deleteConfirmBody"),
    deleteConfirmCancel: t("approvals.deleteConfirmCancel"),
    deleteConfirmOk: t("approvals.deleteConfirmOk"),
    autoDeleteIn: t.raw("approvals.autoDeleteIn"),
    recordingExpired: t("approvals.recordingExpired"),
    recordingDeleted: t("approvals.recordingDeleted"),
    savedToMemories: t("approvals.savedToMemories"),
  };
  const choiceLabels: Record<string, string> = {
    easy: t("child.choiceEasy"),
    hard: t("child.choiceHard"),
    helped: t("child.choiceHelped"),
    learned: t("child.choiceLearned"),
    fun: t("child.choiceFun"),
    proud: t("child.choiceProud"),
  };

  // Level-up gifts: record any newly reached level, then list gifts not yet given.
  let levelGifts: PendingLevelGift[] = [];
  try {
    await Promise.all((children ?? []).map((c) => syncLevelUps(c.id, c.lifetime_stars ?? 0)));
    levelGifts = await pendingLevelGifts((children ?? []).map((c) => c.id));
  } catch (err) {
    console.error("[ApprovalsPage] level gifts failed", err);
  }
  const childName = new Map((children ?? []).map((c) => [c.id, c.name]));

  const totalPending = (pendingTasks?.length ?? 0) + (pendingRedemptions?.length ?? 0) + missedResponsibilities.length + levelGifts.length;

  const missedLabels = {
    whatHappened: t("parent.whatHappened"),
    forgot: t("parent.reasonForgot"),
    neededHelp: t("parent.reasonNeededHelp"),
    excused: t("parent.reasonExcused"),
    refused: t("parent.reasonRefused"),
    skip: t("parent.reasonSkip"),
    parentNote: t("parent.parentNote"),
    submit: t("parent.handleSubmit"),
    handled: t("parent.responsibilityHandled"),
  };

  return (
    <div className="space-y-6">
      {/* Header with count */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-stone-800">⏳ {t("approvals.title")}</h1>
        {totalPending > 0 && (
          <span className="rounded-full bg-blue-100 px-3 py-0.5 text-sm font-bold text-blue-700">
            {totalPending}
          </span>
        )}
      </div>

      {/* 🎁 Level-up gifts waiting to be given */}
      {levelGifts.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-amber-700">
            🎁 {t("approvals.levelGifts")} ({levelGifts.length})
          </h2>
          <ul className="space-y-2">
            {levelGifts.map((g) => (
              <li key={g.id}>
                <Card className="flex items-center gap-3 border-amber-200 bg-amber-50">
                  <span className="text-2xl">{levelIcon(g.level)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-stone-800">
                      {t("approvals.levelGiftReached", { name: childName.get(g.child_id) ?? "", level: g.level, title: levelTitle(g.level, locale) })}
                    </div>
                    <div className="text-xs text-stone-600">🎁 {levelGift(g.level, locale)}</div>
                  </div>
                  <form action={markLevelGiftGiven}>
                    <input type="hidden" name="id" value={g.id} />
                    <Button type="submit" size="sm">{t("approvals.levelGiftGive")}</Button>
                  </form>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* All clear state */}
      {totalPending === 0 && (
        <Card className="border-emerald-200 bg-emerald-50">
          <EmptyState
            icon="✅"
            title={t("approvals.allClear")}
            description={t("approvals.allClearDesc")}
          />
        </Card>
      )}

      {/* � Habit support suggestions */}
      {habitSuggestions.length > 0 && (
        <section>
          <div className="space-y-2">
            {habitSuggestions.map((s) => {
              const taskName = (locale === "vi" && s.taskNameVi) ? s.taskNameVi : s.taskName;
              return (
                <HabitSuggestionCard
                  key={`${s.taskId}-${s.childId}`}
                  taskId={s.taskId}
                  childId={s.childId}
                  message={t("parent.habitSuggestion", { child: s.childName, task: taskName })}
                  action={startHabitSupport}
                  labels={{
                    startHabitBuilding: t("parent.startHabitBuilding"),
                    dismissSuggestion: t("parent.dismissSuggestion"),
                  }}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* �🌱 Missed responsibilities */}
      {missedResponsibilities.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-emerald-700">
            🌱 {t("parent.missedResponsibilities")}
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              {missedResponsibilities.length}
            </span>
          </h2>
          <div className="space-y-3">
            {missedResponsibilities.map((a) => {
              const child = Array.isArray(a.child) ? a.child[0] : a.child;
              const task = Array.isArray(a.task) ? a.task[0] : a.task;
              const taskName = (locale === "vi" && (task as any)?.name_vi) ? (task as any).name_vi : task?.name;
              return (
                <Card key={a.id} className="border-emerald-100 !p-3">
                  <div className="flex items-center gap-2 mb-2">
                    {(child as any)?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={(child as any).avatar_url} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover ring-2 ring-emerald-200" />
                    ) : (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-700 ring-2 ring-emerald-200">
                        {child?.name?.slice(0, 1)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-xs text-stone-800">{child?.name}</span>
                      <span className="text-stone-300 text-[10px] mx-1">·</span>
                      <span className="text-[11px] text-stone-600 truncate">{taskName}</span>
                    </div>
                  </div>
                  <MissedResponsibilityForm
                    taskId={task?.id ?? ""}
                    childId={child?.id ?? ""}
                    assignmentId={a.id}
                    action={handleMissedResponsibility}
                    labels={missedLabels}
                  />
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* ✅ Task approvals */}
      {(pendingTasks?.length ?? 0) > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-stone-800">
            ✅ {t("approvals.tasks")}
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
              {pendingTasks?.length}
            </span>
          </h2>
          <div className="space-y-3">
            {pendingTasks?.map((c) => {
              const a = Array.isArray(c.assignment) ? c.assignment[0] : c.assignment;
              const child = Array.isArray(a?.child) ? a?.child[0] : a?.child;
              const task = Array.isArray(a?.task) ? a?.task[0] : a?.task;
              const evidence = evidenceMap.get(c.id);
              return (
                <Card key={c.id} className="border-blue-100 !p-3">
                  <PendingApprovalRow
                    detailsLabel={t("approvals.details")}
                    actions={
                      <>
                        {/* One-tap approve: same action as the detailed form with no message or media */}
                        <form action={approveCompletion}>
                          <input type="hidden" name="id" value={c.id} />
                          <PendingSubmitButton className="bg-emerald-500 text-white hover:bg-emerald-600">
                            ✓ {t("approvals.approve")}
                          </PendingSubmitButton>
                        </form>
                        <form action={rejectCompletion}>
                          <input type="hidden" name="id" value={c.id} />
                          <PendingSubmitButton className="border border-red-200 bg-white text-red-600 hover:bg-red-50">
                            ✗ {t("approvals.reject")}
                          </PendingSubmitButton>
                        </form>
                      </>
                    }
                    details={
                      <>
                        {evidence && (
                          <EvidenceReview
                            evidence={evidence}
                            labels={evidenceLabels}
                            choiceLabels={choiceLabels}
                          />
                        )}

                        {/* Approve with celebration message / media */}
                        <ApproveForm
                          completionId={c.id}
                          quickMessages={[t("approvals.quickMsg1"), t("approvals.quickMsg2"), t("approvals.quickMsg3"), t("approvals.quickMsg4")]}
                          labels={{
                            celebration: t("approvals.celebration"),
                            approve: t("approvals.approve"),
                            camera: t("approvals.camera"),
                            gallery: t("approvals.gallery"),
                            record: t("approvals.record"),
                            stopRecord: t("approvals.stopRecord"),
                            capture: t("approvals.capture"),
                            cancel: t("approvals.cancel"),
                            cameraError: t("approvals.cameraError"),
                            micError: t("approvals.micError"),
                          }}
                        />

                        {/* Reject with a note */}
                        <form action={rejectCompletion} className="flex gap-1.5">
                          <input type="hidden" name="id" value={c.id} />
                          <input name="note" placeholder={t("approvals.noteOptional")}
                            className="h-8 min-w-0 flex-1 rounded-lg border border-stone-300 px-2.5 text-xs" />
                          <Button size="sm" variant="ghost" type="submit" className="h-8 shrink-0 px-2 text-xs text-red-500 hover:text-red-700">
                            ✗ {t("approvals.reject")}
                          </Button>
                        </form>
                      </>
                    }
                  >
                    <div className="flex items-start gap-3">
                      {(child as any)?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={(child as any).avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-blue-200" />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 ring-2 ring-blue-200">
                          {child?.name?.slice(0, 1)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className="text-sm font-semibold text-stone-800">{child?.name}</span>
                          {c.submitted_at && (
                            <span className="text-xs text-stone-400">{timeAgo(c.submitted_at, locale)}</span>
                          )}
                        </div>
                        <p className="mt-0.5 break-words text-sm leading-snug text-stone-700">{localName(task, locale)}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700"><CoinIcon />+{task?.coin_reward}</span>
                          {task?.star_reward > 0 && (
                            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">⭐+{task?.star_reward}</span>
                          )}
                          {evidence && (
                            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">📎 {t("approvals.evidenceLabel")}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </PendingApprovalRow>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* 🎁 Reward approvals */}
      {(pendingRedemptions?.length ?? 0) > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-stone-800">
            🎁 {t("approvals.rewards")}
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
              {pendingRedemptions?.length}
            </span>
          </h2>
          <div className="space-y-3">
            {pendingRedemptions?.map((r) => {
              const child = Array.isArray(r.child) ? r.child[0] : r.child;
              const reward = Array.isArray(r.reward) ? r.reward[0] : r.reward;
              return (
                <Card key={r.id} className="border-purple-100">
                  <div className="flex items-start gap-3">
                    {(child as any)?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={(child as any).avatar_url} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-purple-200" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-700 ring-2 ring-purple-200">
                        {child?.name?.slice(0, 1)}
                      </div>
                    )}
                    <div className="flex-1">
                      <div>
                        <span className="font-semibold text-stone-800">{child?.name}</span>
                        <span className="mx-1.5 text-stone-300">·</span>
                        <span className="text-sm text-stone-600">{localName(reward, locale)}</span>
                      </div>
                      <div className="mt-1">
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                          <CoinIcon /> {r.coin_cost}
                        </span>
                      </div>
                      <div className="mt-3 space-y-2">
                        <form action={approveRedemptionAction} className="flex gap-2">
                          <input type="hidden" name="id" value={r.id} />
                          <input name="note" placeholder={t("approvals.noteOptional")}
                            className="h-8 flex-1 rounded-lg border border-stone-300 px-2.5 text-xs" />
                          <Button size="sm" type="submit" className="h-8 shrink-0 bg-emerald-500 text-white hover:bg-emerald-600">
                            ✅ {t("approvals.approve")}
                          </Button>
                        </form>
                        <form action={rejectRedemptionAction} className="flex gap-2">
                          <input type="hidden" name="id" value={r.id} />
                          <input name="note" placeholder={t("approvals.noteOptional")}
                            className="h-8 flex-1 rounded-lg border border-stone-300 px-2.5 text-xs" />
                          <Button size="sm" variant="ghost" type="submit" className="h-8 shrink-0 text-red-500 hover:text-red-700">
                            ❌ {t("approvals.reject")}
                          </Button>
                        </form>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* 💌 Send a note — encouragement without a task */}
      <Card>
        <Collapsible
          trigger={
            <span className="text-sm font-semibold text-stone-500">💌 {t("parent.sendNote")}</span>
          }
        >
          <div className="mt-3 space-y-3">
            {children?.map((c) => (
              <ParentNoteForm
                key={c.id}
                child={{ id: c.id, name: c.name, avatar_url: (c as any).avatar_url }}
                quickMessages={[t("approvals.quickMsg1"), t("approvals.quickMsg2"), t("approvals.quickMsg3"), t("approvals.quickMsg4")]}
                labels={{
                  placeholder: t("parent.sendNotePlaceholder"),
                  send: t("parent.send"),
                  camera: t("approvals.camera"),
                  gallery: t("approvals.gallery"),
                  record: t("approvals.record"),
                  stopRecord: t("approvals.stopRecord"),
                  capture: t("approvals.capture"),
                  cancel: t("approvals.cancel"),
                  recording: t("approvals.recording"),
                }}
              />
            ))}
          </div>
        </Collapsible>
      </Card>

      {/* 💬 Recent Messages with Reactions */}
      {recentMessages.length > 0 && (
        <Card>
          <h2 className="mb-3 text-sm font-bold text-stone-700">💬 {t("parent.recentMessages")}</h2>
          <div className="space-y-2">
            {recentMessages.map((msg) => {
              const child = children?.find((c) => c.id === msg.child_id);
              const childName = child?.name ?? t("approvals.child");
              const taskName = msg.reference_id ? taskNameMap.get(msg.reference_id) : undefined;
              const ago = timeAgo(msg.created_at, locale);
              return (
                <div key={msg.id} className="rounded-xl border border-stone-200 bg-white p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-pink-600">{childName}</span>
                      <span className="text-[11px] text-stone-400">{ago}</span>
                      {msg.message_type === "QUEST_APPROVAL" && taskName && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                          ✅ {taskName}
                        </span>
                      )}
                    </div>
                    {msg.reaction && (
                      <span className="text-lg">{msg.reaction}</span>
                    )}
                  </div>
                  {msg.message.trim() && <p className="text-xs text-stone-600">"{msg.message.trim()}"</p>}
                  {msg.media_type === "photo" && msg.media_signed_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={msg.media_signed_url} alt="" className="mt-2 max-h-40 rounded-xl object-cover" />
                  )}
                  {msg.media_type === "audio" && msg.media_signed_url && (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <audio controls className="mt-2 w-full h-9" src={msg.media_signed_url} />
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Manual coin adjustment — tucked away in collapsible */}
      <Card>
        <Collapsible
          trigger={
            <span className="text-sm font-semibold text-stone-500"><CoinIcon /> {t("approvals.adjust")}</span>
          }
        >
          <form action={adjustCoins} className="mt-1 flex flex-wrap items-center gap-2">
            <select name="child_id" className="h-10 rounded-xl border border-stone-300 px-3 text-sm" required>
              <option value="">{t("approvals.child")}</option>
              {children?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input name="amount" type="number" placeholder="±" required
              className="h-10 w-24 rounded-xl border border-stone-300 px-3 text-sm" />
            <input name="reason" placeholder={t("approvals.reason")} required
              className="h-10 min-w-[12rem] flex-1 rounded-xl border border-stone-300 px-3 text-sm" />
            <Button type="submit" size="sm">{t("approvals.apply")}</Button>
          </form>
        </Collapsible>
      </Card>
    </div>
  );
}
