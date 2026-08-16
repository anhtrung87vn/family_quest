import { getTranslations, setRequestLocale } from "next-intl/server";
import { getChildSession } from "@/lib/auth/child-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getChildBalance } from "@/lib/ledger";
import { todayISO } from "@/lib/recurrence";
import { getLevelInfo, LEVELS } from "@/lib/levels";
import { getStreak } from "@/lib/streaks";
import { taskStyle, levelIcon, behaviorStyle, stageStyle } from "@/lib/category-style";
import { submitTaskAction, claimChoiceQuestAction, refreshPoolAction, markMessagesReadAction, reactToMessageAction, revokeAssignmentAction, clearAllMessagesAction } from "../actions";
import { redirect } from "@/lib/i18n/routing";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EvidenceCapture } from "@/components/ui/EvidenceCapture";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { MessagesSection } from "@/components/ui/MessagesSection";
import { ChildGuide } from "@/components/ui/ChildGuide";
import { SwipeToRevoke } from "@/components/ui/SwipeToRevoke";

export const dynamic = "force-dynamic";

export default async function ChildHome({
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
  const today = todayISO();

  type PoolTask = { id: string; name: string; category: string | null; coin_reward: number; star_reward: number; requires_approval: boolean; behavior_type?: string };
  type ClaimedPoolQuest = { id: string; status: string; task: PoolTask | null };
  type TaskWithBehavior = { id: string; name: string; category: string | null; coin_reward: number; star_reward: number; behavior_type?: string };

  let todos: { id: string; status: string; task: unknown }[] | null = null;
  let coin = 0;
  let lifetimeStars = 0;
  let dreamRewardId: string | null = null;
  let streak = { current: 0, longest: 0 };
  let weeklyDone: number | null = 0;
  let dreamReward: { name: string; coin_cost: number } | null = null;
  let fetchError = false;

  // Parent messages
  type ParentMessage = { id: string; message: string; message_type: string; created_at: string; reaction: string | null; read_at: string | null; reference_id: string | null; media_type?: string | null; media_path?: string | null; media_mime?: string | null; media_signed_url?: string | null; audio_path?: string | null; audio_signed_url?: string | null };
  let recentMessages: ParentMessage[] = [];
  let unreadCount = 0;
  let taskNameMap = new Map<string, string>();

  // Quest Pool state
  let poolTasks: PoolTask[] = [];
  let claimedPoolToday: ClaimedPoolQuest[] = [];
  let poolMaxPerDay = 1;
  let claimsToday = 0;
  let canRefresh = true;
  const POOL_DISPLAY_SIZE = 4;

  try {
    // Fetch tasks independently so ECONNRESET on other queries doesn't blank the task list
    const todosRes = await admin.from("task_assignments")
      .select("id, status, task:tasks(id, name, category, coin_reward, star_reward, behavior_type, evidence_type, evidence_required, max_audio_seconds)")
      .eq("child_id", session.childId)
      .in("status", ["todo", "rejected", "submitted"])
      .lte("due_date", today);
    todos = todosRes.data ?? [];

    const [balanceRes, childRow, streakRes] = await Promise.all([
      getChildBalance(session.childId),
      admin.from("children").select("lifetime_stars, current_dream_reward_id, family_id").eq("id", session.childId).single(),
      getStreak(session.childId),
    ]);

    coin = balanceRes.coin;
    lifetimeStars = childRow.data?.lifetime_stars ?? 0;
    dreamRewardId = childRow.data?.current_dream_reward_id ?? null;
    streak = { current: streakRes.current, longest: streakRes.longest };
    const familyId = childRow.data?.family_id;

    if (dreamRewardId) {
      const { data: dr } = await admin.from("rewards").select("name, coin_cost").eq("id", dreamRewardId).single();
      if (dr) dreamReward = dr;
    }

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const weekStartISO = weekStart.toISOString().slice(0, 10);
    const { count } = await admin
      .from("task_assignments")
      .select("id", { count: "exact", head: true })
      .eq("child_id", session.childId)
      .eq("status", "approved")
      .gte("due_date", weekStartISO);
    weeklyDone = count;

    // --- Recent parent messages ---
    if (familyId) {
      const { data: msgs, error: msgsErr } = await admin
        .from("parent_messages")
        .select("id, message, message_type, created_at, reaction, read_at, reference_id, media_type, media_path, media_mime, audio_path, audio_mime")
        .eq("child_id", session.childId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (msgsErr) console.error("[child/home] parent_messages fetch error:", msgsErr);
      const msgsRaw = (msgs ?? []) as Omit<ParentMessage, "media_signed_url" | "audio_signed_url">[];
      // Resolve signed URLs
      const msgsWithUrls: ParentMessage[] = await Promise.all(
        msgsRaw.map(async (m) => {
          const mediaUrl = m.media_path ? (await admin.storage.from("parent-messages").createSignedUrl(m.media_path, 3600)).data?.signedUrl ?? null : null;
          const audioUrl = m.audio_path ? (await admin.storage.from("parent-messages").createSignedUrl(m.audio_path, 3600)).data?.signedUrl ?? null : null;
          return { ...m, media_signed_url: mediaUrl, audio_signed_url: audioUrl };
        })
      );
      recentMessages = msgsWithUrls;
      unreadCount = recentMessages.filter((m) => !m.read_at).length;
    }

    // Fetch task names for QUEST_APPROVAL messages
    const taskCompletionIds = recentMessages
      .filter((m) => m.message_type === "QUEST_APPROVAL" && m.reference_id)
      .map((m) => m.reference_id!);
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

    // --- Quest Pool ---
    if (familyId) {
      const [cfgRes, claimsRes, refreshRes, poolRes] = await Promise.all([
        admin.from("child_pool_config").select("max_claims_per_day, pool_size").eq("child_id", session.childId).maybeSingle(),
        admin.from("pool_claims").select("task_id, assignment_id").eq("child_id", session.childId).eq("claimed_date", today),
        admin.from("pool_refresh_log").select("id").eq("child_id", session.childId).eq("refresh_date", today).maybeSingle(),
        admin.from("tasks")
          .select("id, name, category, coin_reward, star_reward, requires_approval, behavior_type")
          .eq("family_id", familyId)
          .eq("in_pool", true)
          .eq("active", true),
      ]);

      poolMaxPerDay = cfgRes.data?.max_claims_per_day ?? 1;
      const displaySize = cfgRes.data?.pool_size ?? POOL_DISPLAY_SIZE;
      canRefresh = !refreshRes.data;

      const claimedTaskIds = new Set((claimsRes.data ?? []).map((c) => c.task_id));
      const claimedAssignmentIds = (claimsRes.data ?? []).map((c) => c.assignment_id);
      claimsToday = claimedTaskIds.size;

      // Pool tasks = active pool tasks not yet claimed today, up to displaySize
      const allPool: PoolTask[] = (poolRes.data ?? []) as PoolTask[];
      poolTasks = allPool.filter((t) => !claimedTaskIds.has(t.id)).slice(0, displaySize);

      // Claimed pool assignments already in today's task list
      if (claimedAssignmentIds.length > 0) {
        const { data: claimedRows } = await admin
          .from("task_assignments")
          .select("id, status, task:tasks(id, name, category, coin_reward, star_reward, requires_approval)")
          .in("id", claimedAssignmentIds);
        claimedPoolToday = (claimedRows ?? []) as unknown as ClaimedPoolQuest[];
      }
    }
  } catch (e) {
    console.error("[ChildHome] data fetch failed:", e);
    fetchError = true;
  }

  const level = getLevelInfo(lifetimeStars);
  const levelTitle = locale === "vi" ? level.title_vi : level.title_en;
  const lvIcon = levelIcon(level.level);

  // Separate submitted (pending approval) from actionable tasks
  const actionable = (todos ?? []).filter((a) => a.status === "todo" || a.status === "rejected");
  const submitted = (todos ?? []).filter((a) => a.status === "submitted");

  // Group actionable tasks by behavior type
  const responsibilities = actionable.filter((a) => {
    const task = Array.isArray(a.task) ? a.task[0] : a.task;
    return (task as any)?.behavior_type === "responsibility";
  });
  const habitBuilding = actionable.filter((a) => {
    const task = Array.isArray(a.task) ? a.task[0] : a.task;
    return (task as any)?.behavior_type === "habit_building";
  });
  const characterFamily = actionable.filter((a) => {
    const task = Array.isArray(a.task) ? a.task[0] : a.task;
    const bt = (task as any)?.behavior_type;
    return bt === "character" || bt === "family";
  });
  const coreTasks = actionable.filter((a) => {
    const task = Array.isArray(a.task) ? a.task[0] : a.task;
    const bt = (task as any)?.behavior_type;
    return !bt || bt === "challenge";
  });

  // Fetch reward progress for habit_building tasks
  let rewardProgress = new Map<string, { reward_stage: string; completions: number }>();
  try {
    const habitTaskIds = habitBuilding.map((a) => {
      const task = Array.isArray(a.task) ? a.task[0] : a.task;
      return (task as any)?.id;
    }).filter(Boolean);
    if (habitTaskIds.length > 0) {
      const { data: progressRows } = await admin
        .from("child_task_reward_progress")
        .select("task_id, reward_stage, completions")
        .eq("child_id", session.childId)
        .in("task_id", habitTaskIds);
      for (const p of progressRows ?? []) {
        rewardProgress.set(p.task_id, { reward_stage: p.reward_stage, completions: p.completions });
      }
    }
  } catch (e) {
    console.error("[ChildHome] reward progress fetch:", e);
  }

  // Evidence labels + choices for EvidenceCapture component
  function evidenceIcon(evType: string) {
    if (evType === "photo") return "📷";
    if (evType === "audio") return "🎤";
    if (evType === "text") return "💬";
    if (evType === "choice") return "🌟";
    if (evType === "parent_observation") return "👀";
    return null;
  }

  function evidenceBadge(evType: string, evRequired: boolean, maxAudio: number) {
    if (!evType || evType === "none" || evType === "parent_observation") return null;
    const icon = evidenceIcon(evType);
    let label = "";
    if (evType === "photo") label = locale === "vi" ? "Chụp ảnh" : "Photo";
    else if (evType === "audio") label = locale === "vi" ? `Ghi âm ${maxAudio}s` : `Record ${maxAudio}s`;
    else if (evType === "text") label = locale === "vi" ? "Viết suy nghĩ" : "Write reflection";
    else if (evType === "choice") label = locale === "vi" ? "Chọn cảm nhận" : "Pick feeling";
    return `${icon} ${label}${evRequired ? " *" : ""}`;
  }

  const evidenceLabels = {
    done: `✅ ${t("child.doneShort")}`,
    photoPrompt: t("child.evidencePhoto"),
    audioPrompt: t("child.evidenceAudio"),
    textPrompt: t("child.evidenceText"),
    choicePrompt: t("child.evidenceChoice"),
    skip: t("child.evidenceSkip"),
    submit: t("child.evidenceSubmit"),
    recording: t("child.evidenceRecording"),
    stopRecord: t("child.evidenceStopRecord"),
    startRecord: t("child.evidenceStartRecord"),
  };
  const evidenceChoices = [
    { value: "easy", emoji: "😊", label: t("child.choiceEasy") },
    { value: "hard", emoji: "💪", label: t("child.choiceHard") },
    { value: "helped", emoji: "🤝", label: t("child.choiceHelped") },
    { value: "learned", emoji: "💡", label: t("child.choiceLearned") },
    { value: "fun", emoji: "🎉", label: t("child.choiceFun") },
    { value: "proud", emoji: "🌟", label: t("child.choiceProud") },
  ];

  const guideLabels = {
    title: t("child.guideTitle"),
    subtitle: t("child.guideSubtitle"),
    hide: t("child.guideHide"),
    show: t("child.guideShow"),
    responsibilities: t("child.guideResponsibilities"),
    habitBuilding: t("child.guideHabitBuilding"),
    coreQuests: t("child.guideCoreQuests"),
    character: t("child.guideCharacter"),
    choiceQuest: t("child.guideChoiceQuest"),
    symbolsTitle: t("child.guideSymbols"),
    symbolCoin: t("child.symbolCoin"),
    symbolStar: t("child.symbolStar"),
    symbolDone: t("child.symbolDone"),
    symbolWaiting: t("child.symbolWaiting"),
    symbolPhoto: t("child.symbolPhoto"),
    symbolAudio: t("child.symbolAudio"),
    symbolText: t("child.symbolText"),
    symbolChoice: t("child.symbolChoice"),
    symbolParentObs: t("child.symbolParentObs"),
    symbolRequired: t("child.symbolRequired"),
    symbolStreak: t("child.symbolStreak"),
  };

  return (
    <div className="space-y-5">
      {/* Network error banner */}
      {fetchError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          ⚠️ Could not load data — pull to refresh or tap the page to retry.
        </div>
      )}

      {/* ❓ Guide / Help button — collapsible legend */}
      <div className="flex justify-end">
        <ChildGuide
          labels={guideLabels}
          levels={LEVELS.map((lv) => ({
            level: lv.level,
            title: locale === "vi" ? lv.title_vi : lv.title_en,
            minStars: lv.minStars,
            icon: levelIcon(lv.level),
            current: getLevelInfo(lifetimeStars).level === lv.level,
          }))}
        />
      </div>

      {/* 💌 Parent Messages — collapsible */}
      {recentMessages.length > 0 && (
        <MessagesSection
          messages={recentMessages.map((m) => ({
            id: m.id,
            message: m.message,
            message_type: m.message_type,
            created_at: m.created_at,
            read_at: m.read_at ?? null,
            reaction: m.reaction ?? null,
            reference_id: m.reference_id ?? null,
            media_type: m.media_type ?? null,
            media_signed_url: m.media_signed_url ?? null,
            audio_signed_url: m.audio_signed_url ?? null,
          }))}
          unreadCount={unreadCount}
          taskNameMap={Object.fromEntries(taskNameMap)}
          title={t("child.messages")}
          markReadLabel={t("child.markRead")}
          markReadAction={markMessagesReadAction}
          reactAction={reactToMessageAction}
          unreadIds={recentMessages.filter((m) => !m.read_at).map((m) => m.id).join(",")}
          clearAllAction={clearAllMessagesAction}
        />
      )}

      {/* 🌈 Dream Reward Hero — always visible when set */}
      {dreamReward && (
        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-4 text-white shadow-lg">
          <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-indigo-200">
            🌈 {t("child.myDream")}
          </div>
          <div className="mb-2 text-base font-bold">{dreamReward.name}</div>
          <ProgressBar value={coin} max={dreamReward.coin_cost} color="amber" size="md" showPct />
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span>🪙 {coin.toLocaleString()}</span>
            <span className="font-semibold">
              {coin >= dreamReward.coin_cost
                ? `🎉 ${t("child.dreamReady")}!`
                : `${(dreamReward.coin_cost - coin).toLocaleString()} ${t("child.dreamMore")}`
              }
            </span>
            <span>🪙 {dreamReward.coin_cost.toLocaleString()}</span>
          </div>
        </section>
      )}

      {/* � Responsibilities — no coins, just do it */}
      {responsibilities.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-emerald-700">
            🌱 {t("child.responsibilities")}
          </h2>
          <ul className="space-y-2">
            {responsibilities.map((a) => {
              const task = Array.isArray(a.task) ? a.task[0] : a.task;
              const cat = taskStyle(task?.category);
              const evType = (task as any)?.evidence_type ?? "none";
              const evReq = (task as any)?.evidence_required ?? false;
              const maxAudio = (task as any)?.max_audio_seconds ?? 30;
              return (
                <li key={a.id}>
                  <SwipeToRevoke assignmentId={a.id} revokeAction={revokeAssignmentAction}>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-lg shrink-0">{cat.icon}</span>
                        <div className="font-semibold text-stone-800 flex-1 min-w-0 truncate">{task?.name}</div>
                      </div>
                      <EvidenceCapture
                        assignmentId={a.id}
                        evidenceType={evType}
                        evidenceRequired={evReq}
                        maxAudioSeconds={maxAudio}
                        evidenceBadgeLabel={evidenceBadge(evType, evReq, maxAudio)}
                        labels={evidenceLabels}
                        choices={evidenceChoices}
                      />
                    </div>
                  </SwipeToRevoke>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* 🌟 Habit Building — shows reward stage */}
      {habitBuilding.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-amber-700">
            🌟 {t("child.habitBuilding")}
          </h2>
          <ul className="space-y-3">
            {habitBuilding.map((a) => {
              const task = Array.isArray(a.task) ? a.task[0] : a.task;
              const cat = taskStyle(task?.category);
              const progress = rewardProgress.get(task?.id);
              const stage = progress?.reward_stage ?? "full_reward";
              const stg = stageStyle(stage);
              const isGraduated = stage === "graduated";
              return (
                <li key={a.id} className={`rounded-2xl border ${cat.border} ${cat.bg} p-4 shadow-sm ${isGraduated ? "opacity-80" : ""}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{cat.icon}</span>
                    <div>
                      <div className="font-semibold text-stone-800">{task?.name}</div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-medium ${stg.color}`}>
                          {stg.icon} {locale === "vi" ? stg.label_vi : stg.label_en}
                        </span>
                        {progress && (
                          <span className="text-[10px] text-stone-400">· {progress.completions}x</span>
                        )}
                      </div>
                      {!isGraduated && (
                        <div className="mt-1 flex items-center gap-2 text-xs">
                          {stage !== "stars_only" && stage !== "graduated" && (
                            <span className="font-medium text-amber-600">🪙 +{stage === "reduced_reward" ? Math.max(Math.floor(task?.coin_reward * 0.4), 0) : task?.coin_reward}</span>
                          )}
                          {task?.star_reward && stage !== "graduated" ? (
                            <span className="font-medium text-purple-600">⭐ +{stage === "stars_only" ? Math.max(Math.floor(task.star_reward * 0.5), 1) : task.star_reward}</span>
                          ) : null}
                        </div>
                      )}
                      {isGraduated && (
                        <div className="mt-1 text-xs text-emerald-600 font-medium">🎓 {t("child.habitGraduated")}</div>
                      )}
                    </div>
                  </div>
                  {!isGraduated && (
                    <EvidenceCapture
                      assignmentId={a.id}
                      evidenceType={(task as any)?.evidence_type ?? "none"}
                      evidenceRequired={(task as any)?.evidence_required ?? false}
                      maxAudioSeconds={(task as any)?.max_audio_seconds ?? 30}
                      evidenceBadgeLabel={evidenceBadge((task as any)?.evidence_type, (task as any)?.evidence_required ?? false, (task as any)?.max_audio_seconds ?? 30)}
                      labels={evidenceLabels}
                      choices={evidenceChoices}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* 🎯 Core Quests — challenges */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-stone-800">
          🎯 {t("child.coreQuests")}
        </h2>
        {!coreTasks.length && !responsibilities.length && !habitBuilding.length && !characterFamily.length ? (
          <Card className="border-emerald-200 bg-emerald-50">
            <EmptyState
              icon="🎉"
              title={t("child.emptyTodayTitle")}
              description={t("child.emptyTodayDesc")}
            />
          </Card>
        ) : coreTasks.length === 0 ? null : (
          <ul className="space-y-3">
            {coreTasks.map((a) => {
              const task = Array.isArray(a.task) ? a.task[0] : a.task;
              const cat = taskStyle(task?.category);
              return (
                <li key={a.id}>
                  <SwipeToRevoke assignmentId={a.id} revokeAction={revokeAssignmentAction}>
                    <div className={`rounded-2xl border ${cat.border} ${cat.bg} p-4 shadow-sm`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{cat.icon}</span>
                        <div>
                          <div className="font-semibold text-stone-800">{task?.name}</div>
                          <div className="flex items-center gap-2 text-xs mt-0.5">
                            <span className={`font-medium ${cat.color}`}>{t(`tasks.cat.${task?.category ?? "learning"}`)}</span>
                            <span className="font-medium text-amber-600">🪙 +{task?.coin_reward}</span>
                            {task?.star_reward ? <span className="font-medium text-purple-600">⭐ +{task.star_reward}</span> : null}
                          </div>
                        </div>
                      </div>
                      <EvidenceCapture
                        assignmentId={a.id}
                        evidenceType={(task as any)?.evidence_type ?? "none"}
                        evidenceRequired={(task as any)?.evidence_required ?? false}
                        maxAudioSeconds={(task as any)?.max_audio_seconds ?? 30}
                        evidenceBadgeLabel={evidenceBadge((task as any)?.evidence_type, (task as any)?.evidence_required ?? false, (task as any)?.max_audio_seconds ?? 30)}
                        labels={evidenceLabels}
                        choices={evidenceChoices}
                      />
                    </div>
                  </SwipeToRevoke>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* � Character & Family — good deeds */}
      {characterFamily.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-purple-700">
            💎 {t("child.characterQuests")}
          </h2>
          <ul className="space-y-3">
            {characterFamily.map((a) => {
              const task = Array.isArray(a.task) ? a.task[0] : a.task;
              const bt = (task as any)?.behavior_type;
              const bStyle = behaviorStyle(bt);
              const cat = taskStyle(task?.category);
              return (
                <li key={a.id} className={`rounded-2xl border ${bStyle.border} ${bStyle.bg} p-4 shadow-sm`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{bStyle.icon}</span>
                    <div>
                      <div className="font-semibold text-stone-800">{task?.name}</div>
                      <div className="flex items-center gap-2 text-xs mt-0.5">
                        <span className={`font-medium ${bStyle.color}`}>{locale === "vi" ? bStyle.label_vi : bStyle.label_en}</span>
                        {task?.coin_reward > 0 && <span className="font-medium text-amber-600">🪙 +{task.coin_reward}</span>}
                        {task?.star_reward ? <span className="font-medium text-purple-600">⭐ +{task.star_reward}</span> : null}
                      </div>
                    </div>
                  </div>
                  <EvidenceCapture
                    assignmentId={a.id}
                    evidenceType={(task as any)?.evidence_type ?? "none"}
                    evidenceRequired={(task as any)?.evidence_required ?? false}
                    maxAudioSeconds={(task as any)?.max_audio_seconds ?? 30}
                    evidenceBadgeLabel={evidenceBadge((task as any)?.evidence_type, (task as any)?.evidence_required ?? false, (task as any)?.max_audio_seconds ?? 30)}
                    labels={evidenceLabels}
                    choices={evidenceChoices}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ✨ Claimed Choice Quests (already picked today, actionable) */}
      {claimedPoolToday.filter((a) => a.status === "todo" || a.status === "rejected").length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-violet-700">
            ✨ {t("child.choiceQuestsSection")}
          </h2>
          <ul className="space-y-3">
            {claimedPoolToday
              .filter((a) => a.status === "todo" || a.status === "rejected")
              .map((a) => {
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
                            <div className="text-[10px] font-medium text-violet-500">✨ {t("child.pickAQuest")}</div>
                          </div>
                        </div>
                        <div className="mt-1.5 flex items-center gap-3 text-sm">
                          <span className="font-medium text-amber-600">🪙 +{task?.coin_reward}</span>
                          {task?.star_reward ? (
                            <span className="font-medium text-purple-600">⭐ +{task.star_reward}</span>
                          ) : null}
                        </div>
                      </div>
                      <EvidenceCapture
                        assignmentId={a.id}
                        evidenceType={(task as any)?.evidence_type ?? "none"}
                        evidenceRequired={(task as any)?.evidence_required ?? false}
                        maxAudioSeconds={(task as any)?.max_audio_seconds ?? 30}
                        labels={evidenceLabels}
                        choices={evidenceChoices}
                      />
                    </div>
                  </li>
                );
              })}
          </ul>
        </section>
      )}

      {/* ✨ Quest Pool — Pick a Quest */}
      {poolTasks.length > 0 || claimsToday < poolMaxPerDay ? (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-violet-700">
              ✨ {t("child.pickAQuest")}
            </h2>
            {claimsToday < poolMaxPerDay && poolTasks.length > 0 && (
              <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-600">
                {t("child.pickAQuestSub", { n: poolMaxPerDay - claimsToday })}
              </span>
            )}
          </div>

          {claimsToday >= poolMaxPerDay ? (
            <Card className="border-violet-200 bg-violet-50">
              <div className="flex flex-col items-center gap-1 py-2 text-center">
                <span className="text-2xl">🎉</span>
                <p className="text-sm font-semibold text-violet-700">{t("child.poolLimitReached")}</p>
              </div>
            </Card>
          ) : poolTasks.length === 0 ? (
            <Card>
              <p className="py-2 text-center text-sm text-stone-400">{t("child.poolEmpty")}</p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {poolTasks.map((task) => {
                  const cat = taskStyle(task.category);
                  return (
                    <div
                      key={task.id}
                      className={`flex flex-col justify-between rounded-2xl border ${cat.border} ${cat.bg} p-3.5 shadow-sm`}
                    >
                      <div className="mb-3">
                        <div className="mb-1 flex items-center gap-1.5">
                          <span className="text-lg">{cat.icon}</span>
                          <span className="text-xs font-semibold text-stone-700 leading-tight">{task.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-medium text-amber-600">🪙 +{task.coin_reward}</span>
                          {task.star_reward ? (
                            <span className="font-medium text-purple-600">⭐ +{task.star_reward}</span>
                          ) : null}
                        </div>
                      </div>
                      <form action={claimChoiceQuestAction}>
                        <input type="hidden" name="task_id" value={task.id} />
                        <Button
                          type="submit"
                          size="sm"
                          className="w-full bg-violet-500 text-xs font-bold text-white hover:bg-violet-600"
                        >
                          {t("child.claimBtn")}
                        </Button>
                      </form>
                    </div>
                  );
                })}
              </div>

              {/* Refresh button — 1/day */}
              <div className="mt-2 flex justify-center">
                {canRefresh ? (
                  <form action={refreshPoolAction}>
                    <button
                      type="submit"
                      className="flex items-center gap-1 rounded-full px-3 py-1 text-xs text-stone-400 hover:text-violet-500 transition-colors"
                    >
                      🔄 {t("child.refreshPool")}
                    </button>
                  </form>
                ) : (
                  <span className="text-xs text-stone-300">{t("child.refreshedToday")}</span>
                )}
              </div>
            </>
          )}
        </section>
      ) : null}

      {/* ⏳ Submitted — waiting for approval */}
      {submitted.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-600">
            ⏳ {t("child.waitingSection")}
          </h2>
          <ul className="space-y-1.5">
            {submitted.map((a) => {
              const task = Array.isArray(a.task) ? a.task[0] : a.task;
              const cat = taskStyle(task?.category);
              return (
                <li key={a.id} className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2 text-sm text-stone-500">
                  <span>{cat.icon}</span>
                  <span className="flex-1">{task?.name}</span>
                  <span className="text-xs text-amber-500">⏳ {t("child.waiting")}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* 🔥 Weekly Journey */}
      <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-stone-700">
            🔥 {t("child.weeklyJourney")}
          </h3>
          <span className="text-sm font-semibold text-amber-600">{weeklyDone ?? 0} {t("child.questsDone")}</span>
        </div>
        {streak.current > 0 && (
          <div className="mt-2 text-xs text-stone-500">
            🔥 {streak.current} {t("child.streakDays")}
            {streak.longest > streak.current && ` · ${t("child.bestStreak")}: ${streak.longest}`}
          </div>
        )}
      </Card>

      {/* Level progress compact */}
      <Card>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{lvIcon}</span>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-stone-700">Lv.{level.level} {levelTitle}</span>
              {level.nextLevelStars && (
                <span className="text-xs text-stone-400">{lifetimeStars} / {level.nextLevelStars} ⭐</span>
              )}
            </div>
            {level.nextLevelStars && (
              <ProgressBar
                value={lifetimeStars - level.minStars}
                max={level.nextLevelStars - level.minStars}
                color="purple"
                size="sm"
                className="mt-1.5"
              />
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
