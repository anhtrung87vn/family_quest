/**
 * Pick the Vietnamese text of a bilingual row when the UI is in Vietnamese.
 * System templates (and family copies of them) carry name_vi / description_vi
 * (title_vi for family quests); parent-created rows usually only have English
 * or whatever the parent typed, so they fall back to the base column.
 */
type Bilingual = {
  name?: string | null;
  name_vi?: string | null;
  title?: string | null;
  title_vi?: string | null;
  description?: string | null;
  description_vi?: string | null;
};

const pick = (base: string | null | undefined, vi: string | null | undefined, locale: string) =>
  (locale === "vi" && vi ? vi : base) ?? "";

export const localName = (row: Bilingual | null | undefined, locale: string) => pick(row?.name, row?.name_vi, locale);
export const localTitle = (row: Bilingual | null | undefined, locale: string) => pick(row?.title, row?.title_vi, locale);
export const localDesc = (row: Bilingual | null | undefined, locale: string) => pick(row?.description, row?.description_vi, locale);
