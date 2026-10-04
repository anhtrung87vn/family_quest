import { getTranslations, setRequestLocale } from "next-intl/server";
import { getChildSession } from "@/lib/auth/child-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayISO } from "@/lib/recurrence";
import { taskStyle } from "@/lib/category-style";
import { rankTemplates, poolSizeForAge } from "@/lib/recommendations";
import { ageFromDob, isAgeEligible } from "@/lib/age";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EvidenceCapture } from "@/components/ui/EvidenceCapture";
import { KidEmptyState, TodayEmptyState } from "@/components/ui/KidEmptyState";
import { claimChoiceQuestAction, refreshPoolAction } from "../actions";
import { redirect } from "@/lib/i18n/routing";
import { CoinIcon } from "@/components/ui/CoinIcon";
import { familyDayStart } from "@/lib/family-time";

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
  const todayStart = familyDayStart(todayStr);

  type PoolTask = { id: string; name: string; name_vi?: string | null; description?: string | null; description_vi?: string | null; category: string | null; coin_reward: number; star_reward: number; requires_approval: boolean; behavior_type?: string; min_age?: number | null; max_age?: number | null };

  const [{ data: rows }, { data: childRow }, { data: todayComps, error: todayCompsErr }] = await Promise.all([
    admin
      .from("task_assignments")
      .select("id, status, due_date, created_at, task:tasks(id, name, name_vi, description, description_vi, category, coin_reward, star_reward, behavior_type, evidence_type, evidence_required, max_audio_seconds)")
      .eq("child_id", session.childId)
      .order("created_at", { ascending: false })
      .limit(100),
    admin.from("children").select("family_id, date_of_birth").eq("id", session.childId).single(),
    // Anything submitted today (and not rejected) means the child already did a quest today
    admin
      .from("task_completions")
      .select("id, task_assignments!inner(child_id)")
      .eq("task_assignments.child_id", session.childId)
      .neq("status", "rejected")
      .gte("submitted_at", todayStart.toISOString()),
  ]);
  if (todayCompsErr) console.error("[ChildQuests] today completions fetch:", todayCompsErr);
  const doneToday = todayComps?.length ?? 0;

  const localName = (task: any) =>
    (locale === "vi" && task?.name_vi) ? task.name_vi : (task?.name ?? "");
  const localDesc = (task: any): string | null =>
    (locale === "vi" && task?.description_vi) ? task.description_vi : (task?.description ?? null);

  const today = rows?.filter((r) => (r.status === "todo" || r.status === "rejected") && (!r.due_date || r.due_date <= todayStr)) ?? [];
  const upcoming = rows?.filter((r) => r.status === "todo" && r.due_date && r.due_date > todayStr) ?? [];
  const waiting = rows?.filter((r) => r.status === "submitted") ?? [];
  const done = (rows?.filter((r) => r.status === "approved") ?? []).slice(0, 20);

  const childAge = ageFromDob(childRow?.date_of_birth);
  const isTeen = childAge != null && childAge > 12;

  // --- Quest Pool (age-aware ranking when child has date_of_birth) ---
  let poolTasks: PoolTask[] = [];
  let poolMaxPerDay = 1;
  let claimsToday = 0;
  let canRefresh = true;
  const POOL_DISPLAY_SIZE = 4;
  const familyId = childRow?.family_id as string | undefined;
  if (familyId) {
    try {
      const [cfgRes, claimsRes, refreshRes, poolRes] = await Promise.all([
        admin.from("child_pool_config").select("max_claims_per_day, pool_size").eq("child_id", session.childId).maybeSingle(),
        admin.from("pool_claims").select("task_id, assignment_id").eq("child_id", session.childId).eq("claimed_date", todayStr),
        admin.from("pool_refresh_log").select("id").eq("child_id", session.childId).eq("refresh_date", todayStr).maybeSingle(),
        admin.from("tasks")
          .select("id, name, name_vi, description, description_vi, category, coin_reward, star_reward, requires_approval, behavior_type, skill_domain, recommended_age, min_age, max_age, independence_level, difficulty, availability_type")
          .eq("family_id", familyId)
          .eq("in_pool", true)
          .eq("active", true),
      ]);

      poolMaxPerDay = cfgRes.data?.max_claims_per_day ?? 1;
      const configPoolSize = cfgRes.data?.pool_size ?? POOL_DISPLAY_SIZE;
      const displaySize = childAge != null ? poolSizeForAge(childAge) : configPoolSize;
      canRefresh = !refreshRes.data;

      const claimedTaskIds = new Set((claimsRes.data ?? []).map((c) => c.task_id));
      claimsToday = claimedTaskIds.size;

      // Pool tasks: drop claimed and out-of-age quests, then rank by age if available
      const allPool: PoolTask[] = (poolRes.data ?? []) as PoolTask[];
      const unclaimed = allPool.filter((pt) => !claimedTaskIds.has(pt.id) && isAgeEligible(pt, childAge));

      if (childAge != null && unclaimed.length > displaySize) {
        // Fetch recent completions for ranking (last 14 days)
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        const { data: recentComps } = await admin
          .from("task_completions")
          .select("assignment:task_assignments!inner(child_id, task:tasks(name, skill_domain)), submitted_at")
          .eq("assignment.child_id", session.childId)
          .gte("submitted_at", twoWeeksAgo.toISOString());

        const recentCompletions = (recentComps ?? []).map((c: any) => {
          const assignment = Array.isArray(c.assignment) ? c.assignment[0] : c.assignment;
          const task = assignment?.task;
          const taskObj = Array.isArray(task) ? task[0] : task;
          return {
            task_name: taskObj?.name ?? "",
            skill_domain: taskObj?.skill_domain ?? null,
            completed_at: c.submitted_at ?? "",
          };
        });

        const ranked = rankTemplates(
          unclaimed as any,
          {
            childAge,
            recentCompletions,
            activeTaskNames: new Set(unclaimed.map((pt) => pt.name)),
            limit: displaySize,
          }
        );
        poolTasks = ranked as unknown as PoolTask[];
      } else {
        poolTasks = unclaimed.slice(0, displaySize);
      }
    } catch (e) {
      console.error("[ChildQuests] quest pool fetch:", e);
    }
  }
  const poolAvailable = claimsToday < poolMaxPerDay && poolTasks.length > 0;

  // Completed quests: when each was finished, what it earned, and its evidence status
  const doneIds = done.map((d) => d.id);
  const evidenceStatusMap = new Map<string, { type: string; status: string }>();
  const earnedMap = new Map<string, { coin: number; star: number }>();
  const finishedTodayIds = new Set<string>();
  if (doneIds.length > 0) {
    try {
      const { data: completions } = await admin
        .from("task_completions")
        .select("id, assignment_id, submitted_at, approved_at")
        .in("assignment_id", doneIds);
      const completionToAssignment = new Map<string, string>();
      for (const c of completions ?? []) {
        completionToAssignment.set(c.id, c.assignment_id);
        const finishedAt = c.approved_at ?? c.submitted_at;
        if (finishedAt && new Date(finishedAt).getTime() >= todayStart.getTime()) finishedTodayIds.add(c.assignment_id);
      }
      const completionIds = [...completionToAssignment.keys()];

      if (completionIds.length > 0) {
        const [evidenceRes, coinRes, starRes] = await Promise.all([
          admin
            .from("task_evidence")
            .select("task_completion_id, evidence_type, status")
            .in("task_completion_id", completionIds),
          admin
            .from("coin_transactions")
            .select("reference_id, amount")
            .eq("child_id", session.childId)
            .eq("transaction_type", "TASK_REWARD")
            .in("reference_id", completionIds),
          admin
            .from("star_transactions")
            .select("reference_id, amount")
            .eq("child_id", session.childId)
            .eq("transaction_type", "TASK_STAR_REWARD")
            .in("reference_id", completionIds),
        ]);
        for (const ev of evidenceRes.data ?? []) {
          const aId = completionToAssignment.get(ev.task_completion_id);
          if (aId) evidenceStatusMap.set(aId, { type: ev.evidence_type, status: ev.status });
        }
        const addEarned = (refId: string | null, field: "coin" | "star", amount: number) => {
          const aId = refId ? completionToAssignment.get(refId) : undefined;
          if (!aId) return;
          const cur = earnedMap.get(aId) ?? { coin: 0, star: 0 };
          cur[field] += amount;
          earnedMap.set(aId, cur);
        };
        for (const tx of coinRes.data ?? []) addEarned(tx.reference_id, "coin", tx.amount);
        for (const tx of starRes.data ?? []) addEarned(tx.reference_id, "star", tx.amount);
      }
    } catch (e) {
      console.error("[ChildQuests] completed details fetch:", e);
    }
  }

  // Evidence labels + choices for EvidenceCapture (same submit flow as the Home tab)
  function evidenceBadge(evType: string, evRequired: boolean, maxAudio: number) {
    if (!evType || evType === "none" || evType === "parent_observation") return null;
    let label = "";
    let icon = "";
    if (evType === "photo") { icon = "📷"; label = locale === "vi" ? "Chụp ảnh" : "Photo"; }
    else if (evType === "audio") { icon = "🎤"; label = locale === "vi" ? `Ghi âm ${maxAudio}s` : `Record ${maxAudio}s`; }
    else if (evType === "text") { icon = "💬"; label = locale === "vi" ? "Viết suy nghĩ" : "Write reflection"; }
    else if (evType === "choice") { icon = "🌟"; label = locale === "vi" ? "Chọn cảm nhận" : "Pick feeling"; }
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

  return (
    <div className="space-y-5">
      {/* 🎯 Today's Adventure */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-stone-800">
          🎯 {t("child.todayQuests")}
        </h2>
        {!today.length ? (
          <TodayEmptyState
            celebrate={doneToday > 0}
            poolHref={poolAvailable ? "/child/quests#pool" : null}
            labels={{
              celebrateTitle: t("child.emptyTodayTitle"),
              celebrateDesc: t("child.emptyTodayDesc"),
              noQuestsTitle: t("child.noQuestsYetTitle"),
              pickFromPool: t("child.pickFromPoolBtn"),
              askParent: t("child.askParentForQuests"),
            }}
          />
        ) : (
          <ul className="space-y-3">
            {today.map((a) => {
              const task = (Array.isArray(a.task) ? a.task[0] : a.task) as any;
              const cat = taskStyle(task?.category);
              const evType = task?.evidence_type ?? "none";
              const evReq = task?.evidence_required ?? false;
              const maxAudio = task?.max_audio_seconds ?? 30;
              return (
                <li key={a.id} className={`rounded-2xl border ${cat.border} ${cat.bg} p-4 shadow-sm`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{cat.icon}</span>
                        <div>
                          <div className="font-semibold text-stone-800">{localName(task)}</div>
                          {localDesc(task) && (
                            <div className="text-[13px] text-stone-500 mt-0.5 line-clamp-2">{localDesc(task)}</div>
                          )}
                          <div className={`text-[13px] font-medium ${cat.color}`}>
                            {t(`tasks.cat.${task?.category ?? "learning"}`)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-1.5 flex items-center gap-3 text-sm">
                        {task?.coin_reward > 0 && <span className="font-medium text-amber-600"><CoinIcon /> +{task.coin_reward}</span>}
                        {task?.star_reward ? (
                          <span className="font-medium text-purple-600">⭐ +{task.star_reward}</span>
                        ) : null}
                      </div>
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
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ✨ Quest Pool — Pick a Quest */}
      {poolTasks.length > 0 || claimsToday < poolMaxPerDay ? (
        <section id="pool" className="scroll-mt-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-bold text-violet-700">
              ✨ {isTeen ? t("child.chooseChallenge") : t("child.pickAQuest")}
            </h2>
            {claimsToday < poolMaxPerDay && poolTasks.length > 0 && (
              <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
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
              <p className="py-2 text-center text-sm text-stone-500">{t("child.poolEmpty")}</p>
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
                          <span className="text-sm font-semibold text-stone-700 leading-tight">
                            {localName(task)}
                          </span>
                        </div>
                        {localDesc(task) && (
                          <div className="text-[13px] text-stone-500 line-clamp-2 mb-1">
                            {localDesc(task)}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-amber-600"><CoinIcon /> +{task.coin_reward}</span>
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
                          className="min-h-11 w-full bg-violet-500 text-sm font-bold text-white hover:bg-violet-600"
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
                      className="flex min-h-11 items-center gap-1 rounded-full px-4 py-2 text-sm text-stone-500 hover:text-violet-600 transition-colors"
                    >
                      🔄 {t("child.refreshPool")}
                    </button>
                  </form>
                ) : (
                  <span className="text-[13px] text-stone-400">{t("child.refreshedToday")}</span>
                )}
              </div>
            </>
          )}
        </section>
      ) : null}

      {/* ⏳ Waiting for approval */}
      <section id="waiting" className="scroll-mt-4">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-stone-800">
          ⏳ {t("child.waitingSection")}
        </h2>
        {!waiting.length ? (
          <Card>
            <KidEmptyState
              icon="✨"
              title={t("child.emptyWaitingTitle")}
              description={t("child.emptyWaitingDesc")}
            />
          </Card>
        ) : (
          <ul className="space-y-2">
            {waiting.map((a) => {
              const task = (Array.isArray(a.task) ? a.task[0] : a.task) as any;
              const cat = taskStyle(task?.category);
              return (
                <li key={a.id} className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <span className="text-lg">{cat.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{localName(task)}</div>
                    <div className="text-[13px] text-amber-700">⏳ {t("child.waiting")}</div>
                  </div>
                  <span className="text-sm text-stone-500">
                    {task?.coin_reward > 0 && <><CoinIcon /> +{task.coin_reward}</>}
                    {task?.star_reward ? ` ⭐ +${task.star_reward}` : ""}
                  </span>
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
              const task = (Array.isArray(a.task) ? a.task[0] : a.task) as any;
              const cat = taskStyle(task?.category);
              return (
                <li key={a.id} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 opacity-75">
                  <span className="text-lg">{cat.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-stone-600">{localName(task)}</div>
                    <div className="text-[13px] text-stone-500">📅 {a.due_date}</div>
                  </div>
                  <div className="text-right text-sm">
                    {task?.coin_reward > 0 && <span className="text-amber-600"><CoinIcon /> +{task.coin_reward}</span>}
                    {task?.star_reward ? <span className="ml-1 text-purple-600">⭐ +{task.star_reward}</span> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ✅ Completed — today first, then recent, with what each quest earned */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-stone-800">
          ✅ {t("child.completed")}
        </h2>
        {!done.length ? (
          <Card>
            <KidEmptyState
              icon="🌟"
              title={t("child.emptyCompletedTitle")}
              description={t("child.emptyCompletedDesc")}
            />
          </Card>
        ) : (
          <ul className="space-y-2">
            {[...done]
              .sort((x, y) => Number(finishedTodayIds.has(y.id)) - Number(finishedTodayIds.has(x.id)))
              .map((a) => {
              const task = (Array.isArray(a.task) ? a.task[0] : a.task) as any;
              const cat = taskStyle(task?.category);
              const earned = earnedMap.get(a.id);
              return (
                <li key={a.id} className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{cat.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-stone-700">{localName(task)}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {finishedTodayIds.has(a.id) && (
                          <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                            {t("child.today")}
                          </span>
                        )}
                        {earned && earned.coin > 0 && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                            <CoinIcon /> +{earned.coin}
                          </span>
                        )}
                        {earned && earned.star > 0 && (
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
                            ⭐ +{earned.star}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[13px] font-medium text-emerald-700">✓ {t("child.approved")}</span>
                  </div>
                  {/* Evidence status fallback UI */}
                  {evidenceStatusMap.has(a.id) && (() => {
                    const ev = evidenceStatusMap.get(a.id)!;
                    const icon = ev.type === "audio" ? "🎤" : ev.type === "photo" ? "📷" : "📝";
                    if (ev.status === "promoted") return (
                      <div className="mt-1 text-[13px] text-emerald-700">
                        {icon} ❤️ {t("child.evidenceSavedMemory")}
                      </div>
                    );
                    if (ev.status === "expired") return (
                      <div className="mt-1 text-[13px] text-stone-500">
                        {icon} {t("child.evidenceExpired")}
                      </div>
                    );
                    if (ev.status === "deleted") return (
                      <div className="mt-1 text-[13px] text-stone-500">
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
