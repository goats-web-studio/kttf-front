import {
  FORUM_TOPIC_TITLE_MAX,
  type FeedAchievementItem,
  type FeedItem,
  type FeedSource,
} from '@kttf/shared/types';

/** Адрес страницы источника: клуб и игрок — по `id`, тренер — по адресу страницы. */
export function sourceHref(source: FeedSource): string | null {
  if (source.kind === 'CLUB' && source.id !== null) return `/clubs/${source.id}`;
  if (source.kind === 'COACH' && source.slug !== null) return `/coaches/${source.slug}`;
  if (source.kind === 'PLAYER' && source.id !== null) return `/players/${source.id}`;

  return null;
}

/** Заголовок темы — первая строка записи: у записи заголовка нет, у темы он обязателен. */
export function postTitle(body: string, fallback: string): string {
  const line = body.trim().split('\n')[0]?.trim() ?? '';
  const title = line.length > 80 ? `${line.slice(0, 79).trimEnd()}…` : line;

  return (title.length >= 3 ? title : fallback).slice(0, FORUM_TOPIC_TITLE_MAX);
}

/** Карточка ленты и достижения, приклеенные к ней. */
export interface FeedEntry {
  readonly item: FeedItem;
  readonly also: FeedAchievementItem[];
}

/**
 * Достижения одного игрока подряд — одной карточкой: «золото» и «уровень 5»
 * с одного турнира четырьмя карточками читались бы как шум.
 */
export function foldAchievements(items: readonly FeedItem[]): FeedEntry[] {
  const entries: FeedEntry[] = [];

  for (const item of items) {
    const last = entries.at(-1);

    if (
      item.type === 'ACHIEVEMENT' &&
      last?.item.type === 'ACHIEVEMENT' &&
      last.item.source.id === item.source.id
    ) {
      last.also.push(item);
    } else {
      entries.push({ item, also: [] });
    }
  }

  return entries;
}
