import type { TournamentListItemView } from '@kttf/shared/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listTournaments } from '@/features/tournaments/api';
import { TOURNAMENT } from '@/test/fixtures';

import { latestFinished } from './news';

vi.mock('@/features/tournaments/api', () => ({ listTournaments: vi.fn() }));

/**
 * Свежие итоги — ADR-042, ADR-051, ADR-052.
 *
 * Лента — один запрос: оба состояния доигранного, свежие сверху. Порядок и
 * отбор делает сервер, клиент их не повторяет.
 */

function tournament(day: number): TournamentListItemView {
  return {
    ...TOURNAMENT,
    id: `00000000-0000-4000-8000-${String(day).padStart(12, '0')}`,
    status: 'RATED',
    startsAt: `2026-01-${String(day).padStart(2, '0')}T09:00:00.000Z`,
    averageRating: null,
    matchesPlayed: 0,
  };
}

beforeEach(() => {
  vi.mocked(listTournaments).mockReset();
});

describe('последние доигранные турниры', () => {
  it('один запрос: оба состояния доигранного, от свежих, ровно лимит', async () => {
    vi.mocked(listTournaments).mockResolvedValue({
      items: [tournament(12), tournament(11)],
      total: 12,
      page: 1,
      limit: 5,
    });

    const days = (await latestFinished(5)).map((item) => item.startsAt.slice(8, 10));

    expect(days).toEqual(['12', '11']);
    expect(listTournaments).toHaveBeenCalledTimes(1);
    expect(listTournaments).toHaveBeenCalledWith({
      status: ['RATED', 'FINISHED'],
      order: 'desc',
      page: 1,
      limit: 5,
    });
  });
});
