import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEV_BYPASS, DEV_FAMILY_ID } from "@/lib/dev-family";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Collapsible } from "@/components/ui/Collapsible";
import {
  rejectCompletion,
  approveRedemptionAction,
  rejectRedemptionAction,
  adjustCoins,
  getEvidenceSignedUrl,
} from "./actions";
import { EvidenceReview, type EvidenceItem } from "@/components/ui/EvidenceReview";
import { ParentNoteForm } from "@/components/ui/ParentNoteForm";
import { ApproveForm } from "@/components/ui/ApproveForm";
import { getParentMessageSignedUrl } from "./actions";

export default async function ApprovalsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = DEV_BYPASS ? createAdminClient() : await createClient();
  const t = await getTranslations();

  const { data: pendingTasks } = await supabase
    .from("task_completions")
    .select("id, submitted_at, assignment:task_assignments(id, child:children(id,name,avatar_url), task:tasks(id,name,coin_reward,star_reward,category))")
    .eq("status", "submitted")
    .order("submitted_at", { ascending: true });

  const { data: pendingRedemptions } = await supabase
    .from("reward_redemptions")
    .select("id, coin_cost, requested_at, child:children(id,name,avatar_url), reward:rewards(id,name)")
    .eq("status", "requested")
    .order("requested_at", { ascending: true });

  const childrenQ = supabase.from("children").select("id, name, avatar_url");
  if (DEV_BYPASS) childrenQ.eq("family_id", DEV_FAMILY_ID);
  const { data: children } = await childrenQ.order("created_at");

  // Recent messages with reactions
  const admin = createAdminClient();
  const familyId = DEV_BYPASS ? DEV_FAMILY_ID : null;
  let recentMessages: Array<{ id: string; message: string; message_type: string; created_at: string; reaction: string | null; child_id: string; reference_id: string | null; media_type: string | null; media_path: string | null; media_mime: string | null; media_signed_url?: string | null }> = [];
  if (familyId || !DEV_BYPASS) {
    const msgQuery = admin
      .from("parent_messages")
      .select("id, message, message_type, created_at, reaction, child_id, reference_id, media_type, media_path, media_mime")
      .order("created_at", { ascending: false })
      .limit(10);
    if (familyId) msgQuery.eq("family_id", familyId);
    const { data: msgs, error: msgsErr } = await msgQuery;
    if (msgsErr) console.error("[approvals] parent_messages fetch error:", msgsErr);
    else console.log("[approvals] parent_messages fetched:", msgs?.length ?? 0, "rows");
    // Resolve signed URLs — rebuild objects instead of mutating frozen rows
    type RawMsg = Omit<typeof recentMessages[0], "media_signed_url">;
    const msgsRaw = (msgs ?? []) as RawMsg[];
    recentMessages = await Promise.all(
      msgsRaw.map(async (m) => {
        if (m.media_path && (m.media_type === "photo" || m.media_type === "audio")) {
          return { ...m, media_signed_url: await getParentMessageSignedUrl(m.media_path) };
        }
        return { ...m, media_signed_url: null };
      })
    );
  }

  // Fetch task names for QUEST_APPROVAL messages
  const taskCompletionIds = recentMessages
    .filter((m) => m.message_type === "QUEST_APPROVAL" && m.reference_id)
    .map((m) => m.reference_id!);
  const taskNameMap = new Map<string, string>();
  if (taskCompletionIds.length > 0) {
    const { data: completions } = await admin
      .from("task_completions")
      .select("id, assignment:task_assignments(task:tasks(name))")
      .in("id", taskCompletionIds);
    for (const tc of completions ?? []) {
      const assignment: any = Array.isArray(tc.assignment) ? tc.assignment[0] : tc.assignment;
      const task: any = assignment?.task;
      const taskName: string | undefined = Array.isArray(task) ? task[0]?.name : task?.name;
      if (taskName) taskNameMap.set(tc.id, taskName);
    }
  }

  // Fetch evidence for pending task completions
  const completionIds = (pendingTasks ?? []).map((c) => c.id);
  const evidenceMap = new Map<string, EvidenceItem[]>();
  if (completionIds.length > 0) {
    const admin2 = createAdminClient();
    const { data: evidenceRows } = await admin2
      .from("task_evidence")
      .select("id, task_completion_id, evidence_type, storage_path, text_content, choice_value, audio_duration, mime_type, status, expires_at")
      .in("task_completion_id", completionIds)
      .in("status", ["active", "promoted"]);
    for (const ev of evidenceRows ?? []) {
      const arr = evidenceMap.get(ev.task_completion_id) ?? [];
      let signed_url: string | null = null;
      if (ev.storage_path && (ev.evidence_type === "photo" || ev.evidence_type === "audio") && ev.status === "active") {
        signed_url = await getEvidenceSignedUrl(ev.storage_path);
      }
      arr.push({
        id: ev.id,
        evidence_type: ev.evidence_type,
        storage_path: ev.storage_path,
        signed_url,
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
    easy: locale === "vi" ? "Dễ lắm!" : "It was easy!",
    hard: locale === "vi" ? "Khó nhưng con làm được!" : "It was hard but I did it!",
    helped: locale === "vi" ? "Con được giúp một chút" : "I got some help",
    learned: locale === "vi" ? "Con học được điều mới!" : "I learned something new!",
    fun: locale === "vi" ? "Vui lắm!" : "It was fun!",
    proud: locale === "vi" ? "Con tự hào về việc này!" : "I'm proud of this!",
  };

  const totalPending = (pendingTasks?.length ?? 0) + (pendingRedemptions?.length ?? 0);

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
              const submitted = c.submitted_at ? new Date(c.submitted_at) : null;
              return (
                <Card key={c.id} className="border-blue-100 !p-3">
                  <Collapsible
                    trigger={
                      <div className="flex items-center gap-2">
                        {(child as any)?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={(child as any).avatar_url} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover ring-2 ring-blue-200" />
                        ) : (
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700 ring-2 ring-blue-200">
                            {child?.name?.slice(0, 1)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0 flex items-center gap-1 flex-wrap">
                          <span className="font-semibold text-xs text-stone-800">{child?.name}</span>
                          <span className="text-stone-300 text-[10px]">·</span>
                          <span className="text-[11px] text-stone-600 truncate max-w-[120px]">{task?.name}</span>
                          <span className="rounded-full bg-amber-100 px-1 py-0 text-[10px] font-semibold text-amber-700 leading-4">🪙+{task?.coin_reward}</span>
                          {task?.star_reward > 0 && (
                            <span className="rounded-full bg-purple-100 px-1 py-0 text-[10px] font-semibold text-purple-700 leading-4">⭐+{task?.star_reward}</span>
                          )}
                          {submitted && (
                            <span className="text-[10px] text-stone-400">{submitted.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}</span>
                          )}
                        </div>
                      </div>
                    }
                  >
                    {/* Evidence display */}
                    {evidenceMap.has(c.id) && (
                      <EvidenceReview
                        evidence={evidenceMap.get(c.id)!}
                        labels={evidenceLabels}
                        choiceLabels={choiceLabels}
                      />
                    )}

                    {/* Approve with media + reject */}
                    <div className="mt-2 space-y-1.5 border-t border-stone-100 pt-2">
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
                        }}
                      />
                      <form action={rejectCompletion} className="flex gap-1.5">
                        <input type="hidden" name="id" value={c.id} />
                        <input name="note" placeholder={t("approvals.noteOptional")}
                          className="h-7 flex-1 rounded-lg border border-stone-300 px-2.5 text-xs" />
                        <Button size="sm" variant="ghost" type="submit" className="h-7 px-2 text-[11px] text-red-500 hover:text-red-700">
                          ❌ {t("approvals.reject")}
                        </Button>
                      </form>
                    </div>
                  </Collapsible>
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
                        <span className="text-sm text-stone-600">{reward?.name}</span>
                      </div>
                      <div className="mt-1">
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                          🪙 {r.coin_cost}
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
              const childName = child?.name ?? "Con";
              const taskName = msg.reference_id ? taskNameMap.get(msg.reference_id) : undefined;
              const ago = (() => {
                const diff = Date.now() - new Date(msg.created_at).getTime();
                const mins = Math.floor(diff / 60000);
                if (mins < 60) return `${mins} phút trước`;
                const hrs = Math.floor(mins / 60);
                if (hrs < 24) return `${hrs} giờ trước`;
                return `${Math.floor(hrs / 24)} ngày trước`;
              })();
              return (
                <div key={msg.id} className="rounded-xl border border-stone-200 bg-white p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-pink-600">{childName}</span>
                      <span className="text-[10px] text-stone-400">{ago}</span>
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

      {/* 🪙 Manual coin adjustment — tucked away in collapsible */}
      <Card>
        <Collapsible
          trigger={
            <span className="text-sm font-semibold text-stone-500">🪙 {t("approvals.adjust")}</span>
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
