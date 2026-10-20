import { describe, expect, it } from 'vitest';

import { summarizeStats } from './stats-model';

const row = (date: string, source: 'ORGANIC' | 'CAMPAIGN', views: number, whatsapp = 0) => ({
  date,
  source,
  views,
  phone: 0,
  whatsapp,
  telegram: 0,
  instagram: 1,
  website: 1,
  route: 0,
  coachTraining: 2,
});

describe('статистика клуба на экране', () => {
  it('суммы по метрикам и доля рекламы', () => {
    const summary = summarizeStats({
      from: '2026-10-18',
      to: '2026-10-20',
      rows: [row('2026-10-18', 'ORGANIC', 5, 1), row('2026-10-18', 'CAMPAIGN', 3, 2)],
    });

    expect(summary.totals.views).toEqual({ total: 8, campaign: 3 });
    expect(summary.totals.whatsapp).toEqual({ total: 3, campaign: 2 });
    // Сайт и Инстаграм — одной плиткой.
    expect(summary.totals.links).toEqual({ total: 4, campaign: 2 });
    // Записи к тренерам в зале — своей строкой (ADR-059).
    expect(summary.totals.coachTraining).toEqual({ total: 4, campaign: 2 });
  });

  it('пустые дни окна дорисованы нулями', () => {
    const summary = summarizeStats({
      from: '2026-10-18',
      to: '2026-10-20',
      rows: [row('2026-10-19', 'CAMPAIGN', 2)],
    });

    expect(summary.days).toEqual([
      { date: '2026-10-18', organic: 0, campaign: 0 },
      { date: '2026-10-19', organic: 0, campaign: 2 },
      { date: '2026-10-20', organic: 0, campaign: 0 },
    ]);
  });
});
