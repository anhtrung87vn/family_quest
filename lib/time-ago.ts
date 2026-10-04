/** Localized "5 minutes ago" / "2 giờ trước" using the platform's Intl data. */
export function timeAgo(iso: string, locale: string, now: number = Date.now()): string {
  const rtf = new Intl.RelativeTimeFormat(locale);
  const mins = Math.max(1, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (mins < 60) return rtf.format(-mins, "minute");
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return rtf.format(-hrs, "hour");
  return rtf.format(-Math.floor(hrs / 24), "day");
}
