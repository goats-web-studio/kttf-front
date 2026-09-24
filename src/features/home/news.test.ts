import type { ListTournamentsQuery, TournamentView } from '@kttf/shared/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listTournaments } from '@/features/tournaments/api';
import { TOURNAMENT } from '@/test/fixtures';

import { latestFinished } from './news';

vi.mock('@/features/tournaments/api', () => ({ listTournaments: vi.fn() }));

/**
 * Свежие итоги с хвоста списка — ADR-042.
 *
 * Контракт отдаёт турниры по возрастанию даты, и первая страница — самые
 * старые. Проверяется, что лента берёт последние, а не первые, в том числе
 * когда последняя страница неполная.
 */

function tournament(day: number, status: 'RATED' | 'FINISHED'): TournamentView {
  return {
    ...TOURNAMENT,
    id: `00000000-0000-4000-8000-${String(day).padStart(12, '0')}`,
    status,
    startsAt: `2026-01-${String(day).padStart(2, '0')}T09:00:00.000Z`,
  };
}

/** Список по возрастанию даты, постранично — как отвечает сервер. */
function serve(all: readonly TournamentView[]): void {
  vi.mocked(listTournaments).mockImplementation((query: ListTournamentsQuery) => {
    const items = all.filter((item) => item.status === query.status);
    const start = (query.page - 1) * query.limit;
    return Promise.resolve({
      items: items.slice(start, start + query.limit),
      total: items.length,
      page: query.page,
      limit: query.limit,
    });
  });
}

beforeEach(() => {
  vi.mocked(listTournaments).mockReset();
});

describe('последние доигранные турниры', () => {
  it('берёт хвост списка, свежие сверху, даже при неполной последней странице', async () => {
    // Двенадцать обсчитанных: страницы по пять — 5, 5, 2.
    serve(Array.from({ length: 12 }, (_, index) => tournament(index + 1, 'RATED')));

    const days = (await latestFinished(5)).map((item) => item.startsAt.slice(8, 10));

    expect(days).toEqual(['12', '11', '10', '09', '08']);
  });

  it('сводит оба состояния в одну ленту по дате', async () => {
    serve([tournament(3, 'RATED'), tournament(7, 'FINISHED'), tournament(5, 'RATED')]);

    const days = (await latestFinished(5)).map((item) => item.startsAt.slice(8, 10));

    expect(days).toEqual(['07', '05', '03']);
  });
});
