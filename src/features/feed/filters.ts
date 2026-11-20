import type { FeedFilter, FeedTab } from '@kttf/shared/types';
import {
  Building2,
  Globe,
  GraduationCap,
  LayoutList,
  MessagesSquare,
  Newspaper,
  Star,
  Trophy,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';

import type { MessageKey } from '@/common/i18n';
import { FORUM_HREF } from '@/features/forum/labels';

export interface FeedFilterOption {
  /** `undefined` — «Всё», без фильтра. */
  readonly value: FeedFilter | undefined;
  readonly label: MessageKey;
  readonly icon: LucideIcon;
  /** Пусто под этим фильтром — коротко и по-человечески. */
  readonly empty: MessageKey;
  /**
   * Пункт ведёт не в ленту, а на свою страницу: «Форум» открывает сам форум,
   * там темы с разделами, поиском и «Новой темой». Фильтр `?filter=FORUM`
   * по прямой ссылке работает по-прежнему.
   */
  readonly href?: string;
}

/** «Что показывать» — ADR-097, в порядке списка на странице. */
export const FEED_FILTER_OPTIONS: readonly FeedFilterOption[] = [
  { value: undefined, label: 'feed.filter.all', icon: LayoutList, empty: 'feed.empty' },
  { value: 'KTTF', label: 'feed.filter.KTTF', icon: Newspaper, empty: 'feed.empty.KTTF' },
  { value: 'CLUBS', label: 'feed.filter.CLUBS', icon: Building2, empty: 'feed.empty.CLUBS' },
  {
    value: 'COACHES',
    label: 'feed.filter.COACHES',
    icon: GraduationCap,
    empty: 'feed.empty.COACHES',
  },
  { value: 'PLAYERS', label: 'feed.filter.PLAYERS', icon: Users, empty: 'feed.empty.PLAYERS' },
  {
    value: 'TOURNAMENTS',
    label: 'feed.filter.TOURNAMENTS',
    icon: Trophy,
    empty: 'feed.empty.TOURNAMENTS',
  },
  {
    value: 'FORUM',
    label: 'feed.filter.FORUM',
    icon: MessagesSquare,
    empty: 'feed.empty.FORUM',
    href: FORUM_HREF,
  },
];

export interface FeedTabOption {
  readonly value: FeedTab;
  readonly label: MessageKey;
  readonly icon: LucideIcon;
}

/** Вкладки ADR-073 — только вошедшему: у гостя нет подписок и своего. */
export const FEED_TAB_OPTIONS: readonly FeedTabOption[] = [
  { value: 'FOR_YOU', label: 'feed.tab.forYou', icon: Star },
  { value: 'FOLLOWING', label: 'feed.tab.following', icon: UserCheck },
  { value: 'ALL', label: 'feed.tab.all', icon: Globe },
];

/** Вкладка по умолчанию у вошедшего — в адрес не пишется. */
export const DEFAULT_FEED_TAB: FeedTab = 'FOR_YOU';

/** Куда ведёт пункт «Что показывать»: своя страница пункта или лента с фильтром. */
export function filterHref(tab: FeedTab | undefined, option: FeedFilterOption): string {
  return option.href ?? feedHref(tab, option.value);
}

/**
 * Адрес страницы «Лента» с вкладкой и фильтром. Умолчания в адрес не
 * попадают: `/feed` — это «Для вас», всё.
 */
export function feedHref(tab: FeedTab | undefined, filter: FeedFilter | undefined): string {
  const search = new URLSearchParams();
  if (tab !== undefined && tab !== DEFAULT_FEED_TAB) search.set('tab', tab);
  if (filter !== undefined) search.set('filter', filter);
  const query = search.toString();

  return query === '' ? '/feed' : `/feed?${query}`;
}
