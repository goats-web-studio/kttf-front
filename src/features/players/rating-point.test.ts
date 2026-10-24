import { describe, expect, it } from 'vitest';

import type { MessageKey } from '@/common/i18n';
import { ru } from '@/common/i18n/ru';

import { ratingPointHref, ratingPointTitle } from './rating-point';

const t = (key: MessageKey): string => ru[key];
const DUEL = { id: '00000000-0000-4000-8000-0000000000d1', opponentName: 'Иванов Иван' };

describe('точка кривой рейтинга', () => {
  it('турнир — по названию и на его страницу', () => {
    const point = { tournamentId: 'T', tournamentName: 'Кубок', duel: null };

    expect(ratingPointTitle(point, t)).toBe('Кубок');
    expect(ratingPointHref(point)).toBe('/tournaments/T');
  });

  it('дуэль и спарринг — «с соперником» и на страницу дуэли (ADR-065)', () => {
    const duel = {
      tournamentId: null,
      tournamentName: null,
      duel: { ...DUEL, kind: 'DUEL' } as const,
    };
    const sparring = { ...duel, duel: { ...DUEL, kind: 'SPARRING' } as const };

    expect(ratingPointTitle(duel, t)).toBe('Дуэль с Иванов Иван');
    expect(ratingPointTitle(sparring, t)).toBe('Спарринг с Иванов Иван');
    expect(ratingPointHref(duel)).toBe(`/duels/${DUEL.id}`);
  });

  it('ручная корректировка — подпись без ссылки', () => {
    const point = { tournamentId: null, tournamentName: null, duel: null };

    expect(ratingPointTitle(point, t)).toBe(ru['player.history.adjustment']);
    expect(ratingPointHref(point)).toBeNull();
  });
});
