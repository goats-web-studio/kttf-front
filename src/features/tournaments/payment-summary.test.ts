import type { RegistrationView } from '@kttf/shared/types';
import { describe, expect, it } from 'vitest';

import { REGISTRATIONS } from '@/test/fixtures';

import { paymentSummary } from './payment-summary';

/** Отметка «Оплатил» — ADR-062: итог над составом у организатора. */
function entry(
  status: RegistrationView['status'],
  paid: boolean | null,
  index: number,
): RegistrationView {
  const base = REGISTRATIONS[0];
  if (base === undefined) throw new Error('В фикстурах нет записей');

  return { ...base, id: `reg-${String(index)}`, status, paid };
}

describe('итог оплаты', () => {
  it('считает отмеченных и собранное по взносу', () => {
    const list = [
      entry('CONFIRMED', true, 1),
      entry('CONFIRMED', false, 2),
      entry('WITHDRAWN', true, 3),
    ];

    expect(paymentSummary(list, 2000)).toEqual({ paid: 2, total: 3, collected: 4000 });
  });

  it('лист ожидания взноса не платит и в счёт не идёт', () => {
    expect(paymentSummary([entry('CONFIRMED', true, 1), entry('WAITLIST', false, 2)], 0)).toEqual({
      paid: 1,
      total: 1,
      collected: 0,
    });
  });

  it('постороннему оплата не видна — итога нет', () => {
    expect(paymentSummary([entry('CONFIRMED', null, 1)], 2000)).toBeNull();
  });
});
