"use client";

import { useState, useMemo, useDeferredValue } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { domainStyle, independenceStyle, ALL_SKILL_DOMAINS } from "@/lib/category-style";
import type { SkillDomain } from "@/lib/category-style";
import { ageFromDob } from "@/lib/age";
import { copyTemplateToFamily } from "./actions";

interface Template {
  id: string;
  name: string;
  name_vi: string | null;
  description: string | null;
  description_vi: string | null;
  category: string | null;
  skill_domain: string | null;
  behavior_type: string | null;
  availability_type: string | null;
  coin_reward: number;
  star_reward: number;
  difficulty: number | null;
  independence_level: string | null;
  min_age: number | null;
  recommended_age: number | null;
  max_age: number | null;
  development_goal: string | null;
  development_goal_vi: string | null;
  parent_tip: string | null;
  parent_tip_vi: string | null;
  template_key: string | null;
  estimated_minutes: number | null;
  requires_supervision: boolean;
  skill_ladder_key: string | null;
  skill_ladder_level: number | null;
  evidence_type: string | null;
}

interface Child {
  id: string;
  name: string;
  date_of_birth: string | null;
}

const BEHAVIOR_ICONS: Record<string, string> = {
  responsibility: "🌱",
  habit_building: "🌿",
  challenge: "🎯",
  character: "❤️",
  family: "👭",
};

export function QuestLibraryClient({
  templates,
  children,
  existingNames,
  locale,
}: {
  templates: Template[];
  children: Child[];
  existingNames: string[];
  locale: string;
}) {
  const t = useTranslations();
  const isVi = locale === "vi";
  const existingSet = useMemo(() => new Set(existingNames), [existingNames]);

  // Filters
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [selectedBehavior, setSelectedBehavior] = useState<string>("");
  const [searchText, setSearchText] = useState("");
  const deferredSearch = useDeferredValue(searchText);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Compute selected child's age
  const selectedChildObj = children.find((c) => c.id === selectedChild);
  const childAge = ageFromDob(selectedChildObj?.date_of_birth);

  // Filter templates
  const filtered = useMemo(() => {
    return templates.filter((tpl) => {
      // Domain filter
      if (selectedDomain && tpl.skill_domain !== selectedDomain) return false;
      // Behavior filter
      if (selectedBehavior && tpl.behavior_type !== selectedBehavior) return false;
      // Age filter (if child selected with known age)
      if (childAge != null) {
        const min = tpl.min_age ?? 4;
        const max = tpl.max_age ?? 21;
        // Show templates within age range +/- 1 year buffer
        if (childAge < min - 1 || childAge > max + 1) return false;
      }
      // Search (uses deferred value for smoother typing)
      if (deferredSearch.trim()) {
        const q = deferredSearch.toLowerCase();
        const name = (isVi ? tpl.name_vi || tpl.name : tpl.name).toLowerCase();
        const desc = (isVi ? tpl.description_vi || tpl.description || "" : tpl.description || "").toLowerCase();
        if (!name.includes(q) && !desc.includes(q)) return false;
      }
      return true;
    });
  }, [templates, selectedDomain, selectedBehavior, childAge, deferredSearch, isVi]);

  // Group by domain
  const grouped = useMemo(() => {
    const map = new Map<string, Template[]>();
    for (const tpl of filtered) {
      const domain = tpl.skill_domain || "LEARNING";
      if (!map.has(domain)) map.set(domain, []);
      map.get(domain)!.push(tpl);
    }
    return map;
  }, [filtered]);

  const localName = (tpl: Template) => (isVi ? tpl.name_vi || tpl.name : tpl.name);
  const localDesc = (tpl: Template) => (isVi ? tpl.description_vi || tpl.description : tpl.description) || "";
  const localGoal = (tpl: Template) => (isVi ? tpl.development_goal_vi || tpl.development_goal : tpl.development_goal) || "";
  const localTip = (tpl: Template) => (isVi ? tpl.parent_tip_vi || tpl.parent_tip : tpl.parent_tip) || "";

  async function handleAdd(templateId: string) {
    setAddingIds((prev) => new Set(prev).add(templateId));
    try {
      const fd = new FormData();
      fd.set("template_id", templateId);
      if (selectedChild) fd.set("child_id", selectedChild);
      await copyTemplateToFamily(fd);
      setAddedIds((prev) => new Set(prev).add(templateId));
    } catch (e) {
      console.error("[copyTemplateToFamily]", e);
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(templateId);
        return next;
      });
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <Card className="space-y-3">
        {/* Child selector */}
        {children.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-stone-500">{t("parent.libraryForChild")}:</span>
            <button
              onClick={() => setSelectedChild("")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                !selectedChild ? "bg-amber-500 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {t("common.all")}
            </button>
            {children.map((c) => {
              const age = ageFromDob(c.date_of_birth);
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedChild(c.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    selectedChild === c.id ? "bg-amber-500 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  {c.name}{age != null ? ` · ${age}` : ""}
                </button>
              );
            })}
          </div>
        )}

        {/* Domain filter chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-stone-500">{t("parent.libraryDomain")}:</span>
          <button
            onClick={() => setSelectedDomain("")}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
              !selectedDomain ? "bg-amber-500 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {t("common.all")}
          </button>
          {ALL_SKILL_DOMAINS.map((d) => {
            const ds = domainStyle(d);
            return (
              <button
                key={d}
                onClick={() => setSelectedDomain(selectedDomain === d ? "" : d)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  selectedDomain === d ? `${ds.bg} ${ds.color} ring-1 ${ds.border}` : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {ds.icon} {isVi ? ds.label_vi : ds.label_en}
              </button>
            );
          })}
        </div>

        {/* Behavior type filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-stone-500">{t("parent.libraryBehavior")}:</span>
          {["", "responsibility", "habit_building", "challenge", "character", "family"].map((b) => (
            <button
              key={b}
              onClick={() => setSelectedBehavior(b)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                selectedBehavior === b ? "bg-amber-500 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {b ? `${BEHAVIOR_ICONS[b] || ""} ${t(`parent.behavior_${b}`)}` : t("common.all")}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder={t("parent.librarySearch")}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="h-10 w-full rounded-xl border border-stone-300 px-3 text-sm placeholder:text-stone-400"
        />
      </Card>

      {/* Results count */}
      <p className="text-xs text-stone-400">
        {filtered.length} {t("parent.libraryResults")}
        {childAge != null && ` · ${t("parent.libraryAgeFilter", { age: childAge })}`}
      </p>

      {/* Grouped template cards */}
      {Array.from(grouped.entries()).map(([domain, tpls]) => {
        const ds = domainStyle(domain);
        return (
          <div key={domain} className="space-y-2">
            <h2 className={`flex items-center gap-1.5 text-sm font-semibold ${ds.color}`}>
              {ds.icon} {isVi ? ds.label_vi : ds.label_en}
              <span className="text-xs font-normal text-stone-400">({tpls.length})</span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tpls.map((tpl) => {
                const isExpanded = expandedId === tpl.id;
                const alreadyAdded = existingSet.has(tpl.name) || addedIds.has(tpl.id);
                const isAdding = addingIds.has(tpl.id);
                const indStyle = independenceStyle(tpl.independence_level);
                const ageRange = tpl.min_age && tpl.max_age
                  ? `${tpl.min_age}–${tpl.max_age}`
                  : tpl.recommended_age
                    ? `~${tpl.recommended_age}`
                    : "";
                const isOutOfRange = childAge != null && tpl.min_age != null && tpl.max_age != null && (childAge < tpl.min_age || childAge > tpl.max_age);

                return (
                  <Card
                    key={tpl.id}
                    className={`relative flex flex-col gap-2 ${isOutOfRange ? "opacity-70" : ""}`}
                  >
                    {/* Header */}
                    <button
                      className="text-left"
                      onClick={() => setExpandedId(isExpanded ? null : tpl.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <span className="text-sm font-semibold text-stone-800">
                            {BEHAVIOR_ICONS[tpl.behavior_type ?? "challenge"] || ""}{" "}
                            {localName(tpl)}
                          </span>
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {ageRange && (
                              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-500">
                                {t("parent.libraryAges")} {ageRange}
                              </span>
                            )}
                            {tpl.difficulty && (
                              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-500">
                                {tpl.difficulty}/10
                              </span>
                            )}
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${indStyle.bg} ${indStyle.color}`}>
                              {indStyle.icon} {isVi ? indStyle.label_vi : indStyle.label_en}
                            </span>
                          </div>
                        </div>
                        <span className="text-stone-400">{isExpanded ? "▲" : "▼"}</span>
                      </div>
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="space-y-2 border-t border-stone-100 pt-2">
                        <p className="text-xs text-stone-600">{localDesc(tpl)}</p>

                        {/* Reward info */}
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
                            🪙 {tpl.coin_reward}
                          </span>
                          <span className="rounded-full bg-purple-50 px-2 py-0.5 font-medium text-purple-700">
                            ⭐ {tpl.star_reward}
                          </span>
                          {tpl.estimated_minutes && (
                            <span className="rounded-full bg-stone-100 px-2 py-0.5 font-medium text-stone-500">
                              ⏱ {tpl.estimated_minutes}m
                            </span>
                          )}
                          {tpl.requires_supervision && (
                            <span className="rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-600">
                              👁 {t("parent.librarySupervised")}
                            </span>
                          )}
                        </div>

                        {/* Development goal */}
                        {localGoal(tpl) && (
                          <div>
                            <p className="text-[10px] font-semibold uppercase text-stone-400">{t("parent.libraryWhyMatters")}</p>
                            <p className="text-xs text-stone-600">{localGoal(tpl)}</p>
                          </div>
                        )}

                        {/* Parent tip */}
                        {localTip(tpl) && (
                          <div>
                            <p className="text-[10px] font-semibold uppercase text-stone-400">{t("parent.libraryParentTip")}</p>
                            <p className="text-xs text-stone-600">{localTip(tpl)}</p>
                          </div>
                        )}

                        {/* Age warning */}
                        {isOutOfRange && (
                          <p className="text-[11px] text-amber-600">
                            ⚠️ {t("parent.libraryAgeWarning", { min: tpl.min_age, max: tpl.max_age })}
                          </p>
                        )}

                        {/* Add button */}
                        <div className="flex items-center gap-2 pt-1">
                          {alreadyAdded ? (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600">
                              ✓ {t("parent.libraryAlreadyAdded")}
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleAdd(tpl.id)}
                              disabled={isAdding}
                            >
                              {isAdding
                                ? "..."
                                : selectedChildObj
                                  ? t("parent.libraryAddFor", { name: selectedChildObj.name })
                                  : t("parent.libraryAddToFamily")}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <Card className="py-10 text-center">
          <p className="text-stone-400">🔍 {t("parent.libraryNoResults")}</p>
        </Card>
      )}
    </div>
  );
}
