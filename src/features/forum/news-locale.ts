import type { SiteLocale } from '@kttf/shared/types';
import { useState } from 'react';

/** Выбор версии новости KTTF по языку — ADR-098. */

/**
 * Какую версию показать по умолчанию: на языке интерфейса, если она есть,
 * иначе оригинал. Не новость — `null`.
 */
export function pickNewsLocale(
  original: SiteLocale | null,
  available: readonly SiteLocale[],
  ui: SiteLocale,
): SiteLocale | null {
  if (original === null) return null;

  return ui !== original && available.includes(ui) ? ui : original;
}

/**
 * Выбранная версия новости: по умолчанию — `pickNewsLocale`, кнопка
 * «Перевод» переключает. Выбор, которого больше нет, — снова по умолчанию.
 */
export function useNewsLocale(
  original: SiteLocale | null,
  available: readonly SiteLocale[],
  ui: SiteLocale,
): readonly [SiteLocale | null, (next: SiteLocale) => void] {
  const [picked, setPicked] = useState<SiteLocale | null>(null);
  const valid = picked !== null && (picked === original || available.includes(picked));

  return [valid ? picked : pickNewsLocale(original, available, ui), setPicked] as const;
}
