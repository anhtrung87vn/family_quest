import { redirect } from "@/lib/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEV_BYPASS, DEV_FAMILY_ID } from "@/lib/dev-family";
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
  // DEV BYPASS: skip auth check so parent UI is accessible without logging in
  if (process.env.NODE_ENV !== "development") {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) redirect({ href: "/login", locale });
  }

  const t = await getTranslations();

  // Fetch pending counts for badge
  const admin = DEV_BYPASS ? createAdminClient() : await createClient();
  const [{ count: pendingTasks }, { count: pendingRewards }] = await Promise.all([
    admin.from("task_completions").select("id", { count: "exact", head: true }).eq("status", "submitted"),
    admin.from("reward_redemptions").select("id", { count: "exact", head: true }).eq("status", "requested"),
  ]);
  const pendingTotal = (pendingTasks ?? 0) + (pendingRewards ?? 0);

  const navItems = [
    { href: "/dashboard", icon: "🏠", label: t("parent.overview") },
    { href: "/tasks",     icon: "✅", label: t("parent.tasks") },
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
