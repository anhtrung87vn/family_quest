import { redirect } from "@/lib/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getChildSession } from "@/lib/auth/child-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getChildBalance } from "@/lib/ledger";
import { getStreak } from "@/lib/streaks";
import { ConfettiTrigger } from "@/components/ui/ConfettiTrigger";
import { BottomNav } from "@/components/ui/BottomNav";
import { RealtimeRefresher } from "@/components/ui/RealtimeRefresher";

export default async function ChildAppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getChildSession();
  if (!session) {
    redirect({ href: "/child/select", locale });
    throw new Error("redirect");
  }

  const admin = createAdminClient();
  const { data: c } = await admin
    .from("children")
    .select("id, name, avatar_url")
    .eq("id", session.childId)
    .single();
  if (!c) {
    redirect({ href: "/child/select", locale });
    throw new Error("redirect");
  }

  const [{ coin, star }, streak, t] = await Promise.all([
    getChildBalance(c.id),
    getStreak(c.id),
    getTranslations(),
  ]);

  const tabLabels = {
    home: t("child.tabs.home"),
    quests: t("child.tabs.quests"),
    rewards: t("child.tabs.rewards"),
    me: t("child.tabs.me"),
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col bg-stone-50">
      {/* Header: avatar + greeting + stat chips */}
      <header className="flex items-center gap-3 px-4 pb-2 pt-[max(env(safe-area-inset-top),12px)]">
        {c.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover ring-2 ring-amber-300" />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-400 text-lg font-bold text-white ring-2 ring-amber-200">
            {c.name.slice(0, 1)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-stone-700">
            {t("child.hello", { name: c.name })} 👋
          </div>
        </div>
        {/* Stat chips */}
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
            🪙 {coin}
          </span>
          <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700">
            ⭐ {star}
          </span>
          {streak.current > 0 && (
            <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
              🔥 {streak.current}
            </span>
          )}
        </div>
      </header>

      <ConfettiTrigger />
      <RealtimeRefresher />
      <main className="flex-1 px-4 pb-24 pt-2">{children}</main>

      <BottomNav labels={tabLabels} locale={locale} />
    </div>
  );
}
