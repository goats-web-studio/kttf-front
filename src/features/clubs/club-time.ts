import { fill, type MessageKey } from '@/common/i18n';

/**
 * Время и свежесть страницы клуба — ADR-055.
 *
 * Часы приходят минутами от полуночи по местному времени клуба (UTC+5).
 * Показываются они как есть, без пересчёта в пояс человека: «открыто до
 * 23:00» — это 23:00 по часам на стене зала.
 */

const DAY_MIN = 24 * 60;
const DAY_MS = 24 * 60 * 60 * 1000;

/** «08:00», «02:00» для ночного интервала (1560 минут), «24:00» — полночь конца дня. */
export function formatMinutes(minutes: number): string {
  const wrapped = minutes > DAY_MIN ? minutes - DAY_MIN : minutes;
  const hours = Math.floor(wrapped / 60);
  const mins = wrapped % 60;

  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/** «08:00» → 480. Пустая или кривая строка — `null`. */
export function parseMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());

  if (match === null) return null;

  const hours = Number(match[1]);
  const mins = Number(match[2]);

  if (hours > 24 || mins > 59 || (hours === 24 && mins > 0)) return null;

  return hours * 60 + mins;
}

/**
 * Сколько полных дней назад страницу обновляли. `null` — не обновляли ни
 * разу: такую страницу заводил администратор, и клуб её ещё не трогал.
 */
export function daysSince(iso: string | null, now: Date = new Date()): number | null {
  if (iso === null) return null;

  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS));
}

/** Страница старше этого — «информация могла устареть» (docs/09, 3.1). */
export const STALE_PUBLIC_DAYS = 90;

/** В кабинете предупреждение раньше: клубу стоит успеть до того, как увидит игрок. */
export const STALE_CABINET_DAYS = 60;

/** «сегодня» или «12 дн. назад» для отметки свежести. */
export function freshnessWhen(t: (key: MessageKey) => string, days: number): string {
  return days === 0
    ? t('club.fresh.today')
    : fill(t('club.fresh.daysAgo'), { count: String(days) });
}

/** Понедельник для подписи дня недели — любой понедельник подходит. */
const MONDAY = Date.UTC(2026, 9, 19, 12);

/** Название дня недели клуба (1 — понедельник). */
export function weekdayDate(weekday: number): Date {
  return new Date(MONDAY + (weekday - 1) * 24 * 60 * 60 * 1000);
}

/** Сегодня по местному времени клуба (UTC+5) — `YYYY-MM-DD`, как срок акции. */
export function clubTodayIso(now: Date = new Date()): string {
  return new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
