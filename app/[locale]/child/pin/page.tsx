import { getTranslations, setRequestLocale } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/Button";
import { verifyChildPin } from "./actions";

export const dynamic = "force-dynamic";

export default async function ChildPin({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ child?: string; error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const { child, error } = await searchParams;
  const admin = createAdminClient();
  const { data: c } = child
    ? await admin.from("children").select("id, name, avatar_url").eq("id", child).single()
    : { data: null };

  if (!c) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-stone-500">{t("child.pickFirst")}</p>
      </main>
    );
  }

  const errorMsg =
    error === "invalid" ? t("child.pinInvalid") :
    error === "locked"  ? t("child.pinLocked")  :
    error === "format"  ? t("child.pinFormat")  : null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      {c.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={c.avatar_url} alt="" className="h-24 w-24 rounded-full object-cover" />
      ) : (
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-stone-200 text-3xl">
          {c.name.slice(0, 1)}
        </div>
      )}
      <h1 className="text-2xl font-bold">
        {t("child.hello", { name: c.name })}
      </h1>
      <p className="text-stone-500">{t("child.enterPin")}</p>

      {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

      <form action={verifyChildPin} className="flex flex-col items-center gap-4">
        <input type="hidden" name="child_id" value={c.id} />
        <input type="hidden" name="locale" value={locale} />
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          pattern="[0-9]{6}"
          required
          autoFocus
          className="w-40 rounded-xl border-2 border-stone-300 p-3 text-center text-2xl tracking-[.5em]"
        />
        <Button type="submit" size="lg">{t("child.unlock")}</Button>
      </form>
    </main>
  );
}
