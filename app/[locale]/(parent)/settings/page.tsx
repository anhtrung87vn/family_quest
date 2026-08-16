import { getTranslations, getLocale } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Collapsible } from "@/components/ui/Collapsible";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEV_BYPASS, DEV_FAMILY_ID } from "@/lib/dev-family";
import { setLanguage, deleteAllTempEvidence } from "./actions";

export default async function SettingsPage() {
  const t = await getTranslations();
  const current = await getLocale();

  // Fetch evidence storage stats
  const admin = createAdminClient();
  let familyId: string | null = DEV_BYPASS ? DEV_FAMILY_ID : null;
  if (!DEV_BYPASS) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (auth?.user) {
      const { data: u } = await admin.from("users").select("family_id").eq("id", auth.user.id).single();
      familyId = u?.family_id ?? null;
    }
  }

  let tempCount = 0;
  let tempSizeBytes = 0;
  let memoryCount = 0;
  let memorySizeBytes = 0;

  if (familyId) {
    const { data: tempRows } = await admin
      .from("task_evidence")
      .select("file_size")
      .eq("family_id", familyId)
      .eq("status", "active")
      .not("storage_path", "is", null);
    for (const r of tempRows ?? []) {
      tempCount++;
      tempSizeBytes += r.file_size ?? 0;
    }

    const { data: memRows } = await admin
      .from("family_memories")
      .select("file_size_bytes")
      .eq("family_id", familyId)
      .is("deleted_at", null);
    for (const r of memRows ?? []) {
      memoryCount++;
      memorySizeBytes += r.file_size_bytes ?? 0;
    }
  }

  const fmtSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">⚙️ {t("parent.settings")}</h1>
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-stone-700">🌐 {t("settings.language")}</h2>
        <form action={setLanguage} className="flex items-center gap-3">
          <select name="language" defaultValue={current} className="h-11 rounded-xl border border-stone-300 px-3">
            <option value="en">{t("settings.english")}</option>
            <option value="vi">{t("settings.vietnamese")}</option>
          </select>
          <Button type="submit">{t("common.save")}</Button>
        </form>
      </Card>

      {/* Privacy & Storage */}
      <Card>
        <Collapsible
          trigger={
            <span className="text-sm font-semibold text-stone-700">🔒 {t("settings.privacyStorage")}</span>
          }
        >
          <div className="mt-3 space-y-4">
            <p className="text-xs text-stone-500">{t("settings.storageNote")}</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-center">
                <div className="text-xs text-stone-400">📷 🎤 {t("settings.tempEvidence")}</div>
                <div className="mt-1 text-lg font-bold text-stone-700">{tempCount}</div>
                <div className="text-[10px] text-stone-400">{fmtSize(tempSizeBytes)}</div>
              </div>
              <div className="rounded-xl border border-pink-200 bg-pink-50 p-3 text-center">
                <div className="text-xs text-pink-400">❤️ {t("settings.familyMemories")}</div>
                <div className="mt-1 text-lg font-bold text-pink-700">{memoryCount}</div>
                <div className="text-[10px] text-pink-400">{fmtSize(memorySizeBytes)}</div>
              </div>
            </div>

            {tempCount > 0 && (
              <form action={deleteAllTempEvidence}>
                <Button type="submit" variant="danger" size="sm" className="w-full text-xs">
                  🗑 {t("settings.deleteAllTemp", { count: tempCount })}
                </Button>
              </form>
            )}
          </div>
        </Collapsible>
      </Card>
    </div>
  );
}
