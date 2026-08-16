import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ChildSelect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const admin = createAdminClient();
  // MVP: this app is single-family. If multiple families exist we list all children;
  // family isolation on writes is enforced by PIN + child_id.
  const { data: children } = await admin
    .from("children")
    .select("id, name, avatar_url")
    .neq("family_id", "00000000-0000-0000-0000-000000000000")
    .order("created_at");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-bold">{t("child.whosPlaying")}</h1>
      {!children?.length ? (
        <p className="text-sm text-stone-500">{t("child.noChildren")}</p>
      ) : (
        <ul className="grid w-full grid-cols-2 gap-4">
          {children.map((c) => (
            <li key={c.id}>
              <Link
                href={{ pathname: "/child/pin", query: { child: c.id } }}
                className="flex flex-col items-center gap-2 rounded-2xl border-2 border-stone-200 p-4 hover:border-emerald-500"
              >
                {c.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.avatar_url} alt="" className="h-24 w-24 rounded-full object-cover" />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-stone-200 text-3xl">
                    {c.name.slice(0, 1)}
                  </div>
                )}
                <span className="text-lg font-medium">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
