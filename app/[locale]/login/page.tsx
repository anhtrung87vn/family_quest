import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { signInWithPassword, signUpParent } from "./actions";
import { GoogleButton } from "./GoogleButton";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const sp = await searchParams;
  const isSignUp = sp.tab === "signup";

  const inputCls = "h-12 rounded-xl border border-stone-300 px-3 focus:outline-none focus:ring-2 focus:ring-amber-400";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
      <Card>
        <h1 className="mb-2 text-2xl font-semibold">{t("login.title")}</h1>

        {/* Tabs */}
        <div className="mb-5 flex gap-2 border-b border-stone-200">
          <a
            href="?tab=signin"
            className={`pb-2 text-sm font-medium ${!isSignUp ? "border-b-2 border-amber-500 text-amber-600" : "text-stone-500"}`}
          >
            {t("login.signIn")}
          </a>
          <a
            href="?tab=signup"
            className={`pb-2 text-sm font-medium ${isSignUp ? "border-b-2 border-amber-500 text-amber-600" : "text-stone-500"}`}
          >
            {t("login.signUp")}
          </a>
        </div>

        {/* Google OAuth */}
        <GoogleButton label={t("login.continueWithGoogle")} />

        <div className="flex items-center gap-3 text-xs text-stone-400">
          <div className="flex-1 border-t border-stone-200" />
          {t("login.or")}
          <div className="flex-1 border-t border-stone-200" />
        </div>

        {!isSignUp ? (
          <form action={signInWithPassword} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-stone-600">{t("login.emailLabel")}</span>
              <input type="email" name="email" required autoComplete="email" className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-stone-600">{t("login.passwordLabel")}</span>
              <input type="password" name="password" required autoComplete="current-password" className={inputCls} />
            </label>
            <Button type="submit" size="lg">{t("login.signIn")}</Button>
          </form>
        ) : (
          <form action={signUpParent} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-stone-600">{t("login.emailLabel")}</span>
              <input type="email" name="email" required autoComplete="email" className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-stone-600">{t("login.passwordLabel")}</span>
              <input type="password" name="password" required autoComplete="new-password" minLength={8} className={inputCls} />
              <span className="text-xs text-stone-400">{t("login.passwordHint")}</span>
            </label>
            <Button type="submit" size="lg">{t("login.createAccount")}</Button>
          </form>
        )}

        {sp.error === "invalid" && (
          <p className="mt-4 text-sm text-red-700">{t("login.errorInvalid")}</p>
        )}
        {sp.error === "generic" && (
          <p className="mt-4 text-sm text-red-700">{t("login.error")}</p>
        )}
        {sp.error && sp.error !== "invalid" && sp.error !== "generic" && (
          <p className="mt-4 text-sm text-red-700">{t("login.error")}</p>
        )}
      </Card>
    </main>
  );
}
