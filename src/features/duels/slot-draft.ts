import {
  DUEL_HORIZON_DAYS,
  DUEL_SLOT_MAX_MINUTES,
  DUEL_SLOT_MIN_MINUTES,
  type DuelSlotInput,
} from '@kttf/shared/types';

import type { MessageKey } from '@/common/i18n';

/**
 * Вариант времени в форме — «дата, с — до» (ADR-065 §3). День выбирается
 * календарём, часы набираются текстом «19:00»: родное поле времени на
 * Android крутит 12-часовой циферблат по языку системы (как в часах клуба).
 *
 * Время — местное, как его видит человек в Алматы; на сервер уходит ISO с
 * зоной, сервер хранит момент.
 */
export interface SlotDraft {
  /** `YYYY-MM-DD`; пусто — день не выбран. */
  readonly day: string;
  readonly from: string;
  readonly to: string;
}

export const EMPTY_SLOT: SlotDraft = { day: '', from: '', to: '' };

/** «19:00», «19.00», «1900», «9:30» → часы и минуты; иначе `null`. */
export function parseTime(value: string): { hours: number; minutes: number } | null {
  const match = /^(\d{1,2})[:.]?(\d{2})$/.exec(value.trim());
  if (match === null) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  return hours <= 23 && minutes <= 59 ? { hours, minutes } : null;
}

function localMoment(day: string, time: { hours: number; minutes: number }): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (match === null) return null;

  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    time.hours,
    time.minutes,
  );
}

/** Черновик в тело запроса; недописанный — `null`. */
export function toSlotInput(draft: SlotDraft): DuelSlotInput | null {
  const from = parseTime(draft.from);
  const to = parseTime(draft.to);
  if (from === null || to === null) return null;

  const startsAt = localMoment(draft.day, from);
  const endsAt = localMoment(draft.day, to);
  if (startsAt === null || endsAt === null) return null;

  return { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() };
}

/**
 * Что не так с вариантом — теми же правилами, что проверит сервер
 * (`duelSlotInputSchema` и `DUEL_TIME_INVALID`), чтобы человек узнал об
 * ошибке у поля, а не отказом после отправки.
 */
export function slotProblem(draft: SlotDraft, now: Date): MessageKey | null {
  if (draft.day === '' || draft.from.trim() === '' || draft.to.trim() === '') {
    return 'duel.slot.error.incomplete';
  }

  const slot = toSlotInput(draft);
  if (slot === null) return 'duel.slot.error.time';

  const start = Date.parse(slot.startsAt);
  const minutes = (Date.parse(slot.endsAt) - start) / 60_000;

  if (minutes < DUEL_SLOT_MIN_MINUTES || minutes > DUEL_SLOT_MAX_MINUTES) {
    return 'duel.slot.error.length';
  }
  if (start <= now.getTime()) return 'duel.slot.error.past';
  if (start > now.getTime() + DUEL_HORIZON_DAYS * 24 * 60 * 60_000) return 'duel.slot.error.far';

  return null;
}
