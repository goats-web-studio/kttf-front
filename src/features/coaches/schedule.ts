import {
  TRAINING_SLOTS_MAX,
  groupSlots,
  type NextSession,
  type TrainingEnrollment,
  type TrainingSlot,
} from '@kttf/shared/types';

import { fill, formatWeekday, type Locale, type MessageKey } from '@/common/i18n';
import { formatMinutes, parseMinutes, weekdayDate } from '@/features/clubs/club-time';

import { newRowKey } from './editor/form-model';

/**
 * Расписание тренировки по дням — T3 (ADR-059, `docs/11` 3.3.1).
 *
 * В форме — строки «дни чипами + время с … до …», как их удобно вписывать:
 * «пн, ср 18:00–19:30» и отдельной строкой «сб 11:00–12:30». На сервер
 * строка уходит слотами, по одному на день; при загрузке слоты собираются
 * обратно в строки (`groupSlots`). Дни — короткими именами `Intl`, как в
 * часах клуба.
 */

export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

/** Строка расписания, как её вписал человек: время — текстом «18:00». */
export interface ScheduleLine {
  /** Ключ строки — для React, на сервер не уходит. */
  readonly key: string;
  readonly weekdays: readonly number[];
  readonly start: string;
  readonly end: string;
}

export function emptyScheduleLine(): ScheduleLine {
  return { key: newRowKey(), weekdays: [], start: '', end: '' };
}

/** Слоты с сервера — в строки формы. */
export function scheduleLinesOf(slots: readonly TrainingSlot[]): ScheduleLine[] {
  return groupSlots(slots).map((group) => ({
    key: newRowKey(),
    weekdays: group.weekdays,
    start: formatMinutes(group.startMin),
    end: formatMinutes(group.endMin),
  }));
}

/** Что не так со строкой — текст у самой строки. */
export type ScheduleLineError = 'days' | 'time' | 'order' | 'overlap' | 'many';

export const SCHEDULE_ERROR_KEYS: Readonly<Record<ScheduleLineError, MessageKey>> = {
  days: 'training.schedule.error.days',
  time: 'training.schedule.error.time',
  order: 'training.schedule.error.order',
  overlap: 'training.schedule.error.overlap',
  many: 'training.schedule.error.many',
};

/** Пустая строка — только что добавленная и не тронутая: её просто нет. */
export function isBlankLine(line: Pick<ScheduleLine, 'weekdays' | 'start' | 'end'>): boolean {
  return line.weekdays.length === 0 && line.start.trim() === '' && line.end.trim() === '';
}

interface ParsedLine {
  readonly weekdays: readonly number[];
  readonly startMin: number;
  readonly endMin: number;
}

export interface ScheduleResult {
  /** Слоты по одному на день, по порядку недели. */
  readonly slots: TrainingSlot[];
  /** Ошибка каждой строки; `null` — строка в порядке или пустая. */
  readonly errors: readonly (ScheduleLineError | null)[];
  readonly valid: boolean;
}

/**
 * Строки формы — в слоты. Правило пересечения то же, что у схемы
 * (`trainingSlotsSchema`): в один день занятия не пересекаются, встык —
 * можно. Пересекающиеся строки помечены обе.
 */
export function scheduleOf(lines: readonly ScheduleLine[]): ScheduleResult {
  const errors: (ScheduleLineError | null)[] = lines.map(() => null);
  const parsed: (ParsedLine | null)[] = lines.map((line, index) => {
    if (isBlankLine(line)) return null;

    const startMin = parseMinutes(line.start);
    const endMin = parseMinutes(line.end);

    if (line.weekdays.length === 0) {
      errors[index] = 'days';
    } else if (startMin === null || endMin === null || startMin >= 24 * 60) {
      errors[index] = 'time';
    } else if (endMin <= startMin) {
      errors[index] = 'order';
    } else {
      return { weekdays: [...new Set(line.weekdays)], startMin, endMin };
    }

    return null;
  });

  parsed.forEach((line, index) => {
    parsed.forEach((other, otherIndex) => {
      if (line === null || other === null || otherIndex === index) return;

      const sameDay = line.weekdays.some((day) => other.weekdays.includes(day));
      const crossing = line.startMin < other.endMin && other.startMin < line.endMin;

      if (sameDay && crossing) errors[index] = 'overlap';
    });
  });

  let count = 0;

  parsed.forEach((line, index) => {
    if (line === null) return;

    count += line.weekdays.length;
    if (count > TRAINING_SLOTS_MAX && errors[index] === null) errors[index] = 'many';
  });

  const slots = parsed
    .flatMap((line) =>
      line === null
        ? []
        : line.weekdays.map((weekday) => ({
            weekday,
            startMin: line.startMin,
            endMin: line.endMin,
          })),
    )
    .sort((a, b) => a.weekday - b.weekday || a.startMin - b.startMin);

  return { slots, errors, valid: errors.every((error) => error === null) };
}

/**
 * Расписание осталось строкой в примечании, а дней и времени нет: такую
 * тренировку не найдут фильтры дней и времени — редактор просит перенести.
 */
export function needsScheduleMove(row: {
  readonly scheduleLines: readonly ScheduleLine[];
  readonly schedule: string;
}): boolean {
  return row.schedule.trim() !== '' && scheduleOf(row.scheduleLines).slots.length === 0;
}

/** «пн» — короткое имя дня, как в часах клуба. */
export function weekdayShort(weekday: number, locale: Locale): string {
  return formatWeekday(weekdayDate(weekday), locale, 'short');
}

/** «пн, ср, пт 18:00–19:30 · сб 11:00–12:30»; без слотов — пустая строка. */
export function scheduleText(slots: readonly TrainingSlot[], locale: Locale): string {
  return groupSlots(slots)
    .map(
      (group) =>
        `${group.weekdays.map((day) => weekdayShort(day, locale)).join(', ')} ${formatMinutes(group.startMin)}–${formatMinutes(group.endMin)}`,
    )
    .join(' · ');
}

/**
 * Расписание целиком одной строкой: дни и время, за ними примечание.
 * Без слотов — примечание как раньше; нет ничего — `null`.
 */
export function fullScheduleText(
  training: { readonly slots: readonly TrainingSlot[]; readonly schedule: string | null },
  locale: Locale,
): string | null {
  const parts = [scheduleText(training.slots, locale), training.schedule ?? ''].filter(
    (part) => part !== '',
  );

  return parts.length === 0 ? null : parts.join(' · ');
}

/** «Ближайшее: сегодня в 18:00», «завтра в 18:00», «в пт в 18:00». */
export function nextSessionText(
  next: NextSession,
  t: (key: MessageKey) => string,
  locale: Locale,
): string {
  const time = formatMinutes(next.startMin);

  if (next.inDays === 0) return fill(t('training.next.today'), { time });
  if (next.inDays === 1) return fill(t('training.next.tomorrow'), { time });

  return fill(t('training.next.weekday'), { day: weekdayShort(next.weekday, locale), time });
}

/** Метка набора: тон и текст. */
export const ENROLLMENT_KEYS: Readonly<Record<TrainingEnrollment, MessageKey>> = {
  OPEN: 'training.enrollment.OPEN',
  FEW: 'training.enrollment.FEW',
  CLOSED: 'training.enrollment.CLOSED',
};

export const ENROLLMENT_TONES: Readonly<Record<TrainingEnrollment, 'ok' | 'warn' | 'ink'>> = {
  OPEN: 'ok',
  FEW: 'warn',
  CLOSED: 'ink',
};
