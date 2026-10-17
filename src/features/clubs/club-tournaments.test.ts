import type { TournamentStatus, TournamentView } from '@kttf/shared/types';
import { describe, expect, it } from 'vitest';

import { TOURNAMENT } from '@/test/fixtures';

import { groupClubTournaments } from './club-tournaments';

function tournament(name: string, status: TournamentStatus, startsAt: string): TournamentView {
  return { ...TOURNAMENT, id: crypto.randomUUID(), name, status, startsAt };
}

describe('турниры клуба по стадиям', () => {
  it('раскладывает по тому, что с турниром делать дальше', () => {
    const grouped = groupClubTournaments([
      tournament('Черновик', 'DRAFT', '2026-11-01T09:00:00.000Z'),
      tournament('Анонс', 'PUBLISHED', '2026-11-02T09:00:00.000Z'),
      tournament('Запись', 'REG_OPEN', '2026-11-03T09:00:00.000Z'),
      tournament('Жеребьёвка', 'REG_CLOSED', '2026-11-04T09:00:00.000Z'),
      tournament('Сегодня', 'RUNNING', '2026-10-17T09:00:00.000Z'),
      tournament('Ждёт обсчёта', 'FINISHED', '2026-10-10T09:00:00.000Z'),
      tournament('Обсчитан', 'RATED', '2026-10-01T09:00:00.000Z'),
      tournament('Отменён', 'CANCELLED', '2026-10-05T09:00:00.000Z'),
    ]);

    const names = (list: readonly TournamentView[]): string[] => list.map((item) => item.name);

    expect(names(grouped.draft)).toEqual(['Черновик']);
    // Анонс, запись и закрытая запись — один шаг организатора: довести до старта.
    expect(names(grouped.open)).toEqual(['Анонс', 'Запись', 'Жеребьёвка']);
    expect(names(grouped.running)).toEqual(['Сегодня']);
    // Завершённый без рейтинга — тоже итог: обсчёт делает сервер, а не человек.
    expect(names(grouped.finished)).toEqual(['Ждёт обсчёта', 'Обсчитан']);
    expect(names(grouped.cancelled)).toEqual(['Отменён']);
  });

  it('предстоящие идут от ближайшего, прошедшие — от последнего', () => {
    const grouped = groupClubTournaments([
      tournament('Позже', 'REG_OPEN', '2026-12-01T09:00:00.000Z'),
      tournament('Раньше', 'REG_OPEN', '2026-11-01T09:00:00.000Z'),
      tournament('Давний', 'RATED', '2026-08-01T09:00:00.000Z'),
      tournament('Недавний', 'RATED', '2026-10-01T09:00:00.000Z'),
    ]);

    expect(grouped.open.map((item) => item.name)).toEqual(['Раньше', 'Позже']);
    expect(grouped.finished.map((item) => item.name)).toEqual(['Недавний', 'Давний']);
  });
});
