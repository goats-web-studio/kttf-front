import type { TournamentStatus, TournamentView } from '@kttf/shared/types';
import { queryOptions } from '@tanstack/react-query';

import { listTournaments } from '@/features/tournaments/api';

/**
 * Запись ленты новостей на главной — ТЗ 9.5.
 *
 * Сейчас лента собирается из событий турниров: «турнир завершён, победил
 * такой-то» — это «автогенерируемые отчёты о турнирах» из ТЗ. Редакционные
 * новости клубов и платформы появятся вторым видом записи (`article`) со
 * своим источником на бэкенде; компонент ленты уже различает виды, и
 * добавление источника не потребует переделки вёрстки (ADR-042).
 */
export type NewsItem =
  | {
      readonly kind: 'result';
      readonly id: string;
      /** Когда событие случилось: для турнира — день его начала. */
      readonly date: string;
      readonly tournament: TournamentView;
    }
  | {
      readonly kind: 'article';
      readonly id: string;
      readonly date: string;
      readonly title: string;
      readonly summary: string;
      readonly href: string;
    };

/** Турнир доигран: места известны, рейтинг начислен или вот-вот будет. */
const FINISHED: readonly TournamentStatus[] = ['RATED', 'FINISHED'];

/**
 * Последние доигранные турниры, свежие сверху — одним запросом: оба
 * состояния доигранного (ADR-051) и порядок от свежих (ADR-052). Раньше
 * контракт умел только по возрастанию, и свежие добирались с хвоста списка
 * тремя запросами на каждое состояние (ADR-042).
 */
export async function latestFinished(limit: number): Promise<readonly TournamentView[]> {
  return (await listTournaments({ status: FINISHED, order: 'desc', page: 1, limit })).items;
}

export const latestNewsQuery = queryOptions({
  queryKey: ['home', 'news'] as const,
  queryFn: async (): Promise<readonly NewsItem[]> =>
    (await latestFinished(5)).map((tournament) => ({
      kind: 'result',
      id: `result-${tournament.id}`,
      date: tournament.startsAt,
      tournament,
    })),
  staleTime: 60_000,
});
