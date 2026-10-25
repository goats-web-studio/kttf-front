import { formatDate, type Locale } from '@/common/i18n';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * «5 мин назад», «3 ч назад», «вчера» — для ленты; старше недели — дата.
 * Лента читается как «что нового», и «18 октября, 22:07» там заставляет
 * считать в уме.
 */
export function formatAgo(iso: string, locale: Locale, now: Date = new Date()): string {
  const diff = now.getTime() - Date.parse(iso);
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' });

  if (diff < HOUR) return relative.format(-Math.max(1, Math.round(diff / MINUTE)), 'minute');
  if (diff < DAY) return relative.format(-Math.round(diff / HOUR), 'hour');
  if (diff < 7 * DAY) return relative.format(-Math.round(diff / DAY), 'day');

  return formatDate(iso, locale, now);
}
