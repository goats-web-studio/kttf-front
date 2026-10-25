import type { MentionKind } from '@kttf/shared/types';

/** Куда ведёт отметка — страница на сайте. */
export function mentionHref(target: MentionKind, ref: string): string {
  switch (target) {
    case 'player':
      return `/players/${ref}`;
    case 'club':
      return `/clubs/${ref}`;
    case 'coach':
      return `/coaches/${ref}`;
    case 'product':
      return `/market/items/${ref}`;
    case 'tournament':
      return `/tournaments/${ref}`;
  }
}
