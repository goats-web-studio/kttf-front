import type { MessageKey } from '@/common/i18n';

export interface Section {
  /** Куда ведёт сам пункт. */
  readonly to: string;
  readonly label: MessageKey;
  /**
   * Адреса, на которых пункт подсвечен как текущий. Раздел собран из
   * нескольких страниц: «Где играть» — это клубы, тренеры и тренировки.
   */
  readonly match: readonly string[];
}

/**
 * Разделы сайта — один список на шапку, нижнюю панель и подвал.
 *
 * Две навигации, собранные каждая своим списком, расходятся при первом же
 * новом разделе: на телефоне он появится, а на десктопе нет.
 *
 * Разделы — по задачам человека, а не по модулям API. Пришёл сыграть —
 * «Турниры»; узнать силу — «Рейтинг»; найти зал, тренера или группу —
 * «Где играть»; поговорить и найти соперника — «Сообщество»; выбрать
 * инвентарь — «Маркет». Пять пунктов помещаются в нижнюю панель на 360px.
 */
export const SECTIONS: readonly Section[] = [
  { to: '/tournaments', label: 'nav.tournaments', match: ['/tournaments'] },
  { to: '/players', label: 'nav.ratings', match: ['/players'] },
  { to: '/clubs', label: 'nav.places', match: ['/clubs', '/trainings', '/coaches'] },
  // Сам пункт «Сообщество» ведёт в ленту: туда приходят читать, что нового;
  // форум и дуэли — в его меню.
  { to: '/feed', label: 'nav.community', match: ['/feed', '/forum', '/duels'] },
  { to: '/market', label: 'nav.market', match: ['/market'] },
];
