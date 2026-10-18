/**
 * Календарь турниров — арифметика дат без разметки (ADR-052).
 *
 * Отдельно от компонентов, потому что здесь ошибаются молча: неделя с
 * воскресенья вместо понедельника, турнир в 23:30 по Алматы, уехавший по UTC
 * в следующий день, месяц, начавшийся в субботу. Всё проверяется без DOM.
 *
 * **Дни — по часам человека, а не по UTC.** Ключ дня `YYYY-MM-DD` берётся из
 * местной даты: в Казахстане полночь по UTC — это пять утра, и вечерний
 * турнир иначе попадал бы в клетку следующего дня.
 */

/** Месяц в адресе: `2026-10`. */
export type MonthKey = string;

/** День: `2026-10-19`. */
export type DayKey = string;

export interface CalendarDay {
  readonly key: DayKey;
  /** Число месяца. */
  readonly day: number;
  /** День этого месяца; хвосты соседних месяцев — `false`. */
  readonly inMonth: boolean;
}

const MONTH = /^(\d{4})-(\d{2})$/;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Ключ дня по местной дате. */
export function dayKeyOf(date: Date): DayKey {
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Ключ дня момента из ответа сервера (`startsAt`). */
export function dayKeyOfIso(iso: string): DayKey {
  return dayKeyOf(new Date(iso));
}

/** Месяц, в котором лежит момент. */
export function monthOf(date: Date): MonthKey {
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}`;
}

/** Строка из адреса — месяц или `undefined`, если она не похожа на месяц. */
export function parseMonth(value: string): MonthKey | undefined {
  const match = MONTH.exec(value);
  const month = Number(match?.[2]);

  return match !== null && month >= 1 && month <= 12 ? value : undefined;
}

function partsOf(month: MonthKey): { readonly year: number; readonly index: number } {
  const [year = '1970', number = '01'] = month.split('-');

  return { year: Number(year), index: Number(number) - 1 };
}

/** Соседний месяц: `shiftMonth('2026-12', 1)` — `2027-01`. */
export function shiftMonth(month: MonthKey, delta: number): MonthKey {
  const { year, index } = partsOf(month);

  return monthOf(new Date(year, index + delta, 1));
}

/** Первый день месяца — для подписи месяца через `Intl`. */
export function firstDayOf(month: MonthKey): Date {
  const { year, index } = partsOf(month);

  return new Date(year, index, 1);
}

/**
 * Границы месяца по часам человека: от полуночи первого числа до последнего
 * мига последнего. Уходят в запрос `from`/`to` моментами времени.
 */
export function monthRange(month: MonthKey): { readonly from: Date; readonly to: Date } {
  const { year, index } = partsOf(month);

  return {
    from: new Date(year, index, 1, 0, 0, 0, 0),
    to: new Date(year, index + 1, 0, 23, 59, 59, 999),
  };
}

/**
 * Сетка месяца неделями с понедельника, как в календарях Казахстана и у
 * RTTF. Первая и последняя недели добиваются днями соседних месяцев, чтобы
 * в каждой неделе было семь клеток: пустые клетки в начале сетки съезжали
 * бы на телефоне, а с днями соседних месяцев глаз сразу видит границу.
 */
export function monthGrid(month: MonthKey): readonly (readonly CalendarDay[])[] {
  const { year, index } = partsOf(month);
  const first = new Date(year, index, 1);
  // getDay(): воскресенье — 0. Сдвиг до понедельника той же недели.
  const lead = (first.getDay() + 6) % 7;
  const start = new Date(year, index, 1 - lead);
  const last = new Date(year, index + 1, 0);
  const trail = (7 - ((last.getDay() + 6) % 7) - 1) % 7;
  const total = lead + last.getDate() + trail;
  const weeks: CalendarDay[][] = [];

  for (let offset = 0; offset < total; offset += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
    const day: CalendarDay = {
      key: dayKeyOf(date),
      day: date.getDate(),
      inMonth: date.getMonth() === index,
    };

    if (offset % 7 === 0) {
      weeks.push([day]);
    } else {
      weeks.at(-1)?.push(day);
    }
  }

  return weeks;
}

/**
 * Турниры по дням: ключ дня → турниры этого дня по времени старта.
 * Порядок внутри дня не зависит от того, как пришёл ответ.
 */
export function byDay<T extends { readonly startsAt: string; readonly id: string }>(
  items: readonly T[],
): ReadonlyMap<DayKey, readonly T[]> {
  const days = new Map<DayKey, T[]>();

  for (const item of items) {
    const key = dayKeyOfIso(item.startsAt);
    days.set(key, [...(days.get(key) ?? []), item]);
  }

  for (const [key, list] of days) {
    days.set(
      key,
      [...list].sort(
        (left, right) =>
          Date.parse(left.startsAt) - Date.parse(right.startsAt) || left.id.localeCompare(right.id),
      ),
    );
  }

  return days;
}

/**
 * Группы списка по датам в том порядке, в каком турниры пришли: «Ближайшие»
 * — от ранних, «Прошедшие» — от свежих. Сервер уже упорядочил, и
 * пересортировка здесь перевернула бы один из блоков.
 */
export function groupByDate<T extends { readonly startsAt: string }>(
  items: readonly T[],
): readonly (readonly [DayKey, readonly T[]])[] {
  const groups: [DayKey, T[]][] = [];

  for (const item of items) {
    const key = dayKeyOfIso(item.startsAt);
    const last = groups.at(-1);

    if (last?.[0] === key) {
      last[1].push(item);
    } else {
      groups.push([key, [item]]);
    }
  }

  return groups;
}

/** Начало сегодняшнего дня по часам человека — граница «Ближайшие / Прошедшие». */
export function startOfToday(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Дата дня для `Intl`: полдень, чтобы смена часового пояса не сдвинула число. */
export function dateOfDay(key: DayKey): Date {
  const [year = '1970', month = '01', day = '01'] = key.split('-');

  return new Date(Number(year), Number(month) - 1, Number(day), 12);
}
