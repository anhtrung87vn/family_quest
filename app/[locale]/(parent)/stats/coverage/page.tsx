import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveContext } from "@/lib/dev-family";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { getDevelopmentCoverage } from "@/lib/coverage";
import { domainStyle } from "@/lib/category-style";
import { Link } from "@/lib/i18n/routing";

export const dynamic = "force-dynamic";

export default async function CoveragePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ child?: string }>;
}) {
  const { locale } = await params;
  const { child: selectedChildId } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations();
  const { familyId, supabase } = await resolveContext();

  const { data: children } = await supabase
    .from("children")
    .select("id, name, avatar_url")
    .eq("family_id", familyId)
    .order("created_at");

  const childId = selectedChildId || children?.[0]?.id;
  const selectedChild = children?.find((c) => c.id === childId);

  const coverage = childId ? await getDevelopmentCoverage(childId, 30) : [];
  const maxCount = Math.max(1, ...coverage.map((c) => c.count));
  const totalPracticed = coverage.reduce((s, c) => s + c.count, 0);

  // Find lowest-activity domain for suggestion
  const lowestDomain = coverage.length > 0
    ? coverage.reduce((prev, curr) => (curr.count < prev.count ? curr : prev))
    : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/stats" className="text-xs text-stone-400 hover:text-stone-600">
          ← {t("parent.statistics")}
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-stone-800">🧭 {t("parent.coverageTitle")}</h1>
        <p className="mt-1 text-sm text-stone-500">{t("parent.coverageSubtitle")}</p>
      </div>

      {/* Child selector */}
      {children && children.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {children.map((c) => (
            <Link
              key={c.id}
              href={`/stats/coverage?child=${c.id}`}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                c.id === childId
                  ? "bg-amber-500 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      {!childId ? (
        <EmptyState icon="👧" title={t("parent.noChildren")} />
      ) : totalPracticed === 0 ? (
        <Card className="py-10 text-center">
          <div className="text-3xl">🌱</div>
          <p className="mt-2 text-sm text-stone-500">{t("parent.coverageEmpty")}</p>
          <Link
            href="/library"
            className="mt-3 inline-block rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
          >
            {t("parent.coverageExploreLibrary")}
          </Link>
        </Card>
      ) : (
        <>
          {selectedChild && (
            <p className="text-sm text-stone-500">
              {t("parent.coverageFor", { name: selectedChild.name })}
            </p>
          )}

          <Card className="space-y-3">
            <h2 className="text-sm font-semibold text-stone-700">
              {t("parent.coverageAreasPracticed")}
            </h2>
            {coverage.map((c) => {
              const ds = domainStyle(c.domain);
              const pct = Math.round((c.count / maxCount) * 100);
              return (
                <div key={c.domain} className="space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-medium ${ds.color}`}>
                      {ds.icon} {locale === "vi" ? ds.label_vi : ds.label_en}
                    </span>
                    <span className="text-stone-400">{c.count}</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        c.count > 0 ? "bg-gradient-to-r from-amber-400 to-amber-500" : ""
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </Card>

          {/* Suggestion card for lowest domain */}
          {lowestDomain && lowestDomain.count === 0 && (
            <Card className="border-amber-100 bg-amber-50/50">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{domainStyle(lowestDomain.domain).icon}</span>
                <div>
                  <p className="text-sm font-medium text-stone-700">
                    {t("parent.coverageSuggest")}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {t("parent.coverageSuggestDetail", {
                      domain: locale === "vi"
                        ? domainStyle(lowestDomain.domain).label_vi
                        : domainStyle(lowestDomain.domain).label_en,
                    })}
                  </p>
                  <Link
                    href="/library"
                    className="mt-2 inline-block text-xs font-medium text-amber-600 hover:text-amber-700"
                  >
                    {t("parent.coverageExploreLibrary")} →
                  </Link>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
