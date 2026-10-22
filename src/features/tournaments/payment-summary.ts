import type { RegistrationView } from '@kttf/shared/types';

export interface PaymentSummary {
  /** Сколько участников отмечено «Оплатил». */
  readonly paid: number;
  /** Из скольких: участники в составе, кроме листа ожидания. */
  readonly total: number;
  /** Собрано взносов, ₸: отмеченные × взнос турнира. */
  readonly collected: number;
}

/**
 * Итог отметок «Оплатил» — ADR-062.
 *
 * Лист ожидания в счёт не идёт: он не играет и взноса не платит. Снявшиеся
 * идут: взнос мог быть уже отдан, и организатор должен это видеть.
 *
 * @returns `null`, если оплата смотрящему не видна.
 */
export function paymentSummary(
  participants: readonly RegistrationView[],
  entryFee: number,
): PaymentSummary | null {
  const counted = participants.filter((registration) => registration.status !== 'WAITLIST');

  if (counted.some((registration) => registration.paid === null)) return null;

  const paid = counted.filter((registration) => registration.paid === true).length;

  return { paid, total: counted.length, collected: paid * entryFee };
}
