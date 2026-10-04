import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveContext } from "@/lib/dev-family";
import { createAdminClient } from "@/lib/supabase/admin";
import { QuestLibraryClient } from "./QuestLibraryClient";

export default async function LibraryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const { familyId, supabase } = await resolveContext();
  const admin = createAdminClient();

  // Fetch all system templates
  const { data: templates } = await admin
    .from("tasks")
    .select(
      "id, name, name_vi, description, description_vi, category, skill_domain, behavior_type, availability_type, coin_reward, star_reward, difficulty, independence_level, min_age, recommended_age, max_age, development_goal, development_goal_vi, parent_tip, parent_tip_vi, template_key, estimated_minutes, requires_supervision, skill_ladder_key, skill_ladder_level, evidence_type"
    )
    .eq("is_system_template", true)
    .eq("active", true)
    .order("recommended_age", { ascending: true })
    .order("skill_domain", { ascending: true });

  // Fetch children for the family (with date_of_birth for age)
  const { data: children } = await supabase
    .from("children")
    .select("id, name, date_of_birth")
    .eq("family_id", familyId)
    .order("created_at");

  // Fetch names of tasks already added to the family (to show "Already added" badge)
  const { data: existingTasks } = await supabase
    .from("tasks")
    .select("name")
    .eq("family_id", familyId)
    .eq("active", true);

  const existingNames = new Set((existingTasks ?? []).map((t) => t.name));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">✨ {t("parent.questLibrary")}</h1>
        <p className="mt-1 text-sm text-stone-500">{t("parent.questLibraryDesc")}</p>
      </div>
      <QuestLibraryClient
        templates={templates ?? []}
        children={children ?? []}
        existingNames={Array.from(existingNames)}
        locale={locale}
      />
    </div>
  );
}
