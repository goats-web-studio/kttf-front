import type { MessageKey } from '@/common/i18n';

/**
 * Разделы сайта — один список на шапку и нижнюю панель.
 *
 * Две навигации, собранные каждая своим списком, расходятся при первом же
 * новом разделе: на телефоне он появится, а на десктопе нет.
 */
export const SECTIONS: readonly { readonly to: string; readonly label: MessageKey }[] = [
  { to: '/ratings', label: 'nav.ratings' },
  { to: '/tournaments', label: 'nav.tournaments' },
  { to: '/clubs', label: 'nav.clubs' },
];
