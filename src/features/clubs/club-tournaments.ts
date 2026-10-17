import type { TournamentStatus, TournamentView } from '@kttf/shared/types';

/**
 * Турниры клуба по тому, что с ними сейчас делать.
 *
 * Организатор ищет в списке не дату, а следующее действие: черновик — довести
 * и опубликовать, открытую запись — закрыть и жеребить, идущий — вести в
 * консоли. Поэтому группы — по стадиям ТЗ 4.1, а не по месяцам.
 */
export type ClubTournamentGroup = 'draft' | 'open' | 'running' | 'finished' | 'cancelled';

const GROUP_OF: Readonly<Record<TournamentStatus, ClubTournamentGroup>> = {
  DRAFT: 'draft',
  PUBLISHED: 'open',
  REG_OPEN: 'open',
  REG_CLOSED: 'open',
  RUNNING: 'running',
  FINISHED: 'finished',
  RATED: 'finished',
  CANCELLED: 'cancelled',
};

/** Порядок групп на экране: от требующего действия сейчас к архиву. */
export const GROUP_ORDER: readonly ClubTournamentGroup[] = [
  'running',
  'open',
  'draft',
  'finished',
  'cancelled',
];

export type GroupedTournaments = Readonly<Record<ClubTournamentGroup, readonly TournamentView[]>>;

/**
 * Разложить турниры по группам.
 *
 * Предстоящие — от ближайшего, прошедшие — от последнего: в обоих случаях
 * сверху то, что ищут первым.
 */
export function groupClubTournaments(tournaments: readonly TournamentView[]): GroupedTournaments {
  const groups: Record<ClubTournamentGroup, TournamentView[]> = {
    draft: [],
    open: [],
    running: [],
    finished: [],
    cancelled: [],
  };

  for (const tournament of tournaments) {
    groups[GROUP_OF[tournament.status]].push(tournament);
  }

  const ascending = (a: TournamentView, b: TournamentView): number =>
    a.startsAt.localeCompare(b.startsAt);
  const descending = (a: TournamentView, b: TournamentView): number => ascending(b, a);

  return {
    draft: groups.draft.sort(ascending),
    open: groups.open.sort(ascending),
    running: groups.running.sort(ascending),
    finished: groups.finished.sort(descending),
    cancelled: groups.cancelled.sort(descending),
  };
}
