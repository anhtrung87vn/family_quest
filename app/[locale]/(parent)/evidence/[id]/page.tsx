import { getTranslations, setRequestLocale } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DEV_BYPASS, DEV_FAMILY_ID } from "@/lib/dev-family";
import { Card } from "@/components/ui/Card";
import { EvidenceReview, type EvidenceItem } from "@/components/ui/EvidenceReview";
import { getEvidenceSignedUrl } from "@/app/[locale]/(parent)/approvals/actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EvidenceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const admin = createAdminClient();

  // Validate parent family
  let familyId: string | null = DEV_BYPASS ? DEV_FAMILY_ID : null;
  if (!DEV_BYPASS) {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (auth?.user) {
      const { data: u } = await admin.from("users").select("family_id").eq("id", auth.user.id).single();
      familyId = u?.family_id ?? null;
    }
  }

  const { data: ev } = await admin
    .from("task_evidence")
    .select("id, evidence_type, storage_path, text_content, choice_value, audio_duration, mime_type, file_size, status, expires_at, created_at, family_id, child_id, task_completion_id, memory_id, promoted_at, deleted_at, deletion_reason")
    .eq("id", id)
    .single();

  if (!ev || ev.family_id !== familyId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-stone-800">{t("errors.generic")}</h1>
        <p className="text-sm text-stone-500">Evidence not found.</p>
      </div>
    );
  }

  // Get child name + task name
  let childName = "—";
  let taskName = "—";
  const { data: tc } = await admin
    .from("task_completions")
    .select("assignment:task_assignments(child:children(name), task:tasks(name))")
    .eq("id", ev.task_completion_id)
    .single();
  if (tc) {
    const assignment: any = Array.isArray(tc.assignment) ? tc.assignment[0] : tc.assignment;
    const child = Array.isArray(assignment?.child) ? assignment.child[0] : assignment?.child;
    const task = Array.isArray(assignment?.task) ? assignment.task[0] : assignment?.task;
    childName = child?.name ?? "—";
    taskName = task?.name ?? "—";
  }

  // Signed URL for active media
  let signed_url: string | null = null;
  if (ev.storage_path && ev.status === "active" && (ev.evidence_type === "photo" || ev.evidence_type === "audio")) {
    signed_url = await getEvidenceSignedUrl(ev.storage_path);
  }

  const evidenceItem: EvidenceItem = {
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
  };

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

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });

  const statusLabel = (s: string) => {
    if (s === "active") return locale === "vi" ? "Đang hoạt động" : "Active";
    if (s === "promoted") return locale === "vi" ? "Kỷ niệm gia đình" : "Family Memory";
    if (s === "deleted") return locale === "vi" ? "Đã xoá" : "Deleted";
    if (s === "expired") return locale === "vi" ? "Đã hết hạn" : "Expired";
    return s;
  };

  return (
    <div className="space-y-4">
      <Link href={`/${locale}/approvals`} className="text-sm text-indigo-500 hover:text-indigo-700">
        ← {locale === "vi" ? "Quay lại" : "Back"}
      </Link>

      <h1 className="text-lg font-bold text-stone-800">
        {childName} — {taskName}
      </h1>

      <Card>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs text-stone-500">
            <div>
              <span className="font-semibold text-stone-600">{locale === "vi" ? "Loại" : "Type"}</span>
              <div className="mt-0.5">{ev.evidence_type === "photo" ? "📷" : ev.evidence_type === "audio" ? "🎤" : ev.evidence_type === "text" ? "💬" : "🌟"} {ev.evidence_type}</div>
            </div>
            <div>
              <span className="font-semibold text-stone-600">{locale === "vi" ? "Trạng thái" : "Status"}</span>
              <div className="mt-0.5">{statusLabel(ev.status)}</div>
            </div>
            <div>
              <span className="font-semibold text-stone-600">{locale === "vi" ? "Ngày tạo" : "Created"}</span>
              <div className="mt-0.5">{fmtDate(ev.created_at)}</div>
            </div>
            {ev.expires_at && (
              <div>
                <span className="font-semibold text-stone-600">{locale === "vi" ? "Hết hạn" : "Expires"}</span>
                <div className="mt-0.5">{fmtDate(ev.expires_at)}</div>
              </div>
            )}
            {ev.file_size && (
              <div>
                <span className="font-semibold text-stone-600">{locale === "vi" ? "Kích thước" : "Size"}</span>
                <div className="mt-0.5">{(ev.file_size / 1024).toFixed(0)} KB</div>
              </div>
            )}
            {ev.audio_duration && (
              <div>
                <span className="font-semibold text-stone-600">{locale === "vi" ? "Thời lượng" : "Duration"}</span>
                <div className="mt-0.5">{ev.audio_duration}s</div>
              </div>
            )}
          </div>
        </div>
      </Card>

      <EvidenceReview
        evidence={[evidenceItem]}
        labels={evidenceLabels}
        choiceLabels={choiceLabels}
      />
    </div>
  );
}
