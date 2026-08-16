import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { Button } from "@/components/ui/Button";

export default async function Landing() {
  const t = await getTranslations();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-4xl font-bold">{t("common.appName")}</h1>
      <p className="text-stone-600">{t("marketing.tagline")}</p>
      <div className="flex w-full flex-col gap-3">
        <Link href="/login">
          <Button size="lg" className="w-full">{t("marketing.parentLogin")}</Button>
        </Link>
        <Link href="/child/select">
          <Button size="lg" variant="secondary" className="w-full">
            {t("marketing.childMode")}
          </Button>
        </Link>
      </div>
    </main>
  );
}
