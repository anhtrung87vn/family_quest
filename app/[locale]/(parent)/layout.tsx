import { redirect } from "@/lib/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { resolveContext, DEV_BYPASS } from "@/lib/dev-family";
import { ParentSidebar } from "@/components/ui/ParentSidebar";

export default async function ParentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Auth check runs in every environment so the production auth path is also the
  // one exercised locally. Unauthenticated dev access still works via DEV_BYPASS,
  // which resolveContext applies below.
  if (!DEV_BYPASS) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) redirect({ href: "/login", locale });
  }

  const t = await getTranslations();

  // Fetch pending counts for badge.  resolveContext now returns the user-scoped
  // client, so RLS scopes these automatically.  The !inner joins + explicit
  // family_id filter are kept as belt-and-suspenders.
  let pendingTotal = 0;
  try {
    const { supabase, familyId } = await resolveContext();
    const [{ count: pendingTasks }, { count: pendingRewards }] = await Promise.all([
      supabase
        .from("task_completions")
        .select("id, assignment:task_assignments!inner(child:children!inner(family_id))", { count: "exact", head: true })
        .eq("status", "submitted")
        .eq("assignment.child.family_id", familyId),
      supabase
        .from("reward_redemptions")
        .select("id, child:children!inner(family_id)", { count: "exact", head: true })
        .eq("status", "requested")
        .eq("child.family_id", familyId),
    ]);
    pendingTotal = (pendingTasks ?? 0) + (pendingRewards ?? 0);
  } catch {
    // No session / no family yet — badge stays at 0
  }

  const navItems = [
    { href: "/dashboard", icon: "🏠", label: t("parent.overview") },
    { href: "/tasks",     icon: "✅", label: t("parent.tasks") },
    { href: "/library",   icon: "✨", label: t("parent.questLibrary") },
    { href: "/approvals", icon: "⏳", label: t("parent.approvals"), badge: pendingTotal },
    { href: "/rewards",   icon: "🎁", label: t("parent.rewards") },
    { href: "/quests",    icon: "👭", label: t("parent.familyQuests") },
    { href: "/kids",      icon: "👧", label: t("parent.kids") },
    { href: "/stats",     icon: "📊", label: t("parent.statistics") },
    { href: "/reflections", icon: "📖", label: t("parent.reflections") },
  ];

  const bottomItems = [
    { href: "/settings", icon: "⚙️", label: t("parent.settings") },
  ];

  return (
    <div className="min-h-dvh bg-stone-50">
      <ParentSidebar
        locale={locale}
        appName={t("common.appName")}
        navItems={navItems}
        bottomItems={bottomItems}
        signOutLabel={t("parent.signOut")}
      />
      {/* Main content area — offset for sidebar on desktop, top bar on mobile */}
      <main className="min-h-dvh pt-14 lg:pl-60 lg:pt-0">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
