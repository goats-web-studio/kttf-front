import type { TournamentStatus } from '@kttf/shared/types';
import { describe, expect, it } from 'vitest';

import { availableActions, primaryAction } from './lifecycle';

/**
 * Кнопки проведения турнира — ТЗ 4.1.
 *
 * Проверяется не таблица переходов сервера, а то, что экран не предлагает
 * заведомо невозможного: записать в отменённый турнир, отменить обсчитанный,
 * стартовать не закрыв запись.
 */

describe('доступные действия', () => {
  it('ведут турнир от черновика до старта по одному шагу', () => {
    expect(primaryAction('DRAFT')).toBe('publish');
    expect(primaryAction('PUBLISHED')).toBe('openRegistration');
    expect(primaryAction('REG_OPEN')).toBe('closeRegistration');
    // Жеребьёвка идёт перед стартом и статус не меняет: её можно повторить.
    expect(primaryAction('REG_CLOSED')).toBe('draw');
    expect(availableActions('REG_CLOSED')).toContain('start');
  });

  it('у идущего турнира кнопок вперёд нет: его ведёт консоль', () => {
    // Завершает турнир судья, когда сыграна последняя встреча (ТЗ 6.3).
    expect(primaryAction('RUNNING')).toBeNull();
    expect(availableActions('RUNNING')).not.toContain('start');
  });

  it('завершённому предлагает повторить обсчёт, обсчитанному — ничего', () => {
    // «Завершён» без «Обсчитан» означает, что расчёт рейтинга не удался.
    expect(primaryAction('FINISHED')).toBe('rate');
    expect(availableActions('RATED')).toEqual([]);
  });

  it('обсчитанный и отменённый турнир отменить нельзя', () => {
    // Рейтинг уже разошёлся по журналу событий и профилям игроков: отмена
    // его не вернёт, такой случай разбирается пересчётом (ТЗ 4.1).
    expect(availableActions('RATED')).not.toContain('cancel');
    expect(availableActions('CANCELLED')).toEqual([]);
  });

  it('отмена никогда не бывает главным действием', () => {
    const statuses: readonly TournamentStatus[] = [
      'DRAFT',
      'PUBLISHED',
      'REG_OPEN',
      'REG_CLOSED',
      'RUNNING',
      'FINISHED',
      'RATED',
      'CANCELLED',
    ];

    for (const status of statuses) {
      expect(primaryAction(status), status).not.toBe('cancel');
    }
  });
});
