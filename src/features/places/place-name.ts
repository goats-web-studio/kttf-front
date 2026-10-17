import { useLocale, type Locale } from '@/common/i18n';

/** Запись справочника, у которой есть подпись: город, страна, ссылка на город. */
export interface Named {
  readonly name: string;
  readonly nameKk: string | null;
}

/**
 * Название места на языке интерфейса — ADR-046.
 *
 * Казахское название необязательно: без него казахский интерфейс пишет
 * русское, а не пустое место. Остальные языки берут русское — английских
 * названий в справочнике нет.
 */
export function placeName(place: Named, locale: Locale): string {
  return locale === 'kk' ? (place.nameKk ?? place.name) : place.name;
}

/** То же для компонента: язык берётся из интерфейса. */
export function usePlaceName(): (place: Named) => string {
  const locale = useLocale();

  return (place) => placeName(place, locale);
}
