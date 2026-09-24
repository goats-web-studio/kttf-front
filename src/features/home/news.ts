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
 * Последние доигранные турниры, свежие сверху.
 *
 * Список турниров контракт отдаёт только по возрастанию даты (ТС 7.5), и
 * первая страница — это самые старые турниры. Свежие лежат на последней:
 * первый запрос узнаёт общее число, второй и третий берут хвост. Когда в
 * контракт придёт порядок сортировки, это место станет одним запросом —
 * долг записан в ADR-042.
 */
export async function latestFinished(limit: number): Promise<readonly TournamentView[]> {
  const perStatus = await Promise.all(FINISHED.map((status) => tail(status, limit)));

  // Турнир может сменить состояние между запросами — «завершён» и «рейтинг
  // начислен» разными ответами — и попасть в оба; в ленте он один.
  const unique = new Map(perStatus.flat().map((tournament) => [tournament.id, tournament]));

  return [...unique.values()]
    .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt))
    .slice(0, limit);
}

async function tail(status: TournamentStatus, limit: number): Promise<readonly TournamentView[]> {
  const first = await listTournaments({ status, page: 1, limit });
  const pages = Math.ceil(first.total / limit);

  if (pages <= 1) {
    return first.items;
  }

  // Последняя страница бывает неполной — добираем из предпоследней.
  const [previous, last] = await Promise.all([
    listTournaments({ status, page: pages - 1, limit }),
    listTournaments({ status, page: pages, limit }),
  ]);

  return [...previous.items, ...last.items].slice(-limit);
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
