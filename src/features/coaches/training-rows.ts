import {
  setClubTrainingsSchema,
  setCoachTrainingsSchema,
  type ClubTrainingInput,
  type CoachTrainingInput,
  type PriceUnit,
  type TrainingAudience,
  type TrainingBooking,
  type TrainingCoachRef,
  type TrainingEnrollment,
  type TrainingKind,
  type TrainingLink,
  type TrainingPlace,
  type TrainingView,
} from '@kttf/shared/types';

import { newRowKey, parseInteger, textOrNull } from './editor/form-model';
import { isForChildren } from './labels';
import { emptyScheduleLine, scheduleLinesOf, scheduleOf, type ScheduleLine } from './schedule';

/**
 * Строки тренировок в формах кабинета — тренера и клуба (ADR-059,
 * решение владельца от 20.10.2026: тренировку заводит тренер или клуб).
 *
 * `id` строки обязательно уходит обратно: по нему сервер узнаёт тренировку
 * и сохраняет её связь со второй стороной. Строка без `id` — новая
 * тренировка, и связь у неё начнётся заново.
 */

/** Поля, общие у тренера и клуба, — как их вписал человек. */
interface TrainingRowBase {
  /** Ключ строки — для перестановки и React, на сервер не уходит. */
  readonly key: string;
  readonly id: string | undefined;
  readonly kind: TrainingKind;
  readonly audiences: readonly TrainingAudience[];
  readonly kidsFromAge: string;
  readonly title: string;
  /** Расписание строками «дни + время» (T3); пустая строка ничего не значит. */
  readonly scheduleLines: readonly ScheduleLine[];
  /** Примечание к расписанию. */
  readonly schedule: string;
  readonly enrollment: TrainingEnrollment | null;
  readonly price: string;
  readonly unit: PriceUnit;
  readonly note: string;
  /** «Подробнее» — простой текст до 1000 знаков. */
  readonly description: string;
  /** Связь со второй стороной — только для показа. */
  readonly link: TrainingLink;
}

function baseOf(training: TrainingView): TrainingRowBase {
  return {
    key: newRowKey(),
    id: training.id,
    kind: training.kind,
    audiences: training.audiences,
    kidsFromAge: training.kidsFromAge === null ? '' : String(training.kidsFromAge),
    title: training.title,
    // Слоты собираются обратно в строки; без них — одна пустая, чтобы
    // было куда вписать.
    scheduleLines:
      training.slots.length === 0 ? [emptyScheduleLine()] : scheduleLinesOf(training.slots),
    schedule: training.schedule ?? '',
    enrollment: training.enrollment,
    price: training.priceKzt === null ? '' : String(training.priceKzt),
    unit: training.unit,
    note: training.note ?? '',
    description: training.description ?? '',
    link: training.link,
  };
}

function emptyBase(): TrainingRowBase {
  return {
    key: newRowKey(),
    id: undefined,
    kind: 'GROUP',
    audiences: [],
    kidsFromAge: '',
    title: '',
    scheduleLines: [emptyScheduleLine()],
    schedule: '',
    enrollment: null,
    price: '',
    unit: 'MONTH',
    note: '',
    description: '',
    link: 'NONE',
  };
}

/**
 * Общие поля — в тело. Возраст ребёнка уходит только у тренировки для
 * детей или подростков: снятая «дети» не оставляет невидимого поля, которое
 * сервер отвергнет. Без цены единица ни к чему — «по договорённости».
 */
function baseInput(row: TrainingRowBase) {
  const price = parseInteger(row.price);

  return {
    ...(row.id === undefined ? {} : { id: row.id }),
    kind: row.kind,
    audiences: [...row.audiences],
    kidsFromAge: isForChildren(row.audiences) ? parseInteger(row.kidsFromAge) : null,
    title: row.title.trim(),
    // Строка с несколькими днями уходит слотами по одному на день.
    slots: scheduleOf(row.scheduleLines).slots,
    schedule: textOrNull(row.schedule),
    enrollment: row.enrollment,
    priceKzt: price,
    unit: price === null ? ('NONE' as const) : row.unit,
    note: textOrNull(row.note),
    description: textOrNull(row.description),
  };
}

/**
 * Строки расписания без ошибок. Схема ловит пересечения слотов, но не
 * строку без дней: такая не дала бы ни одного слота и пропала бы молча.
 */
function schedulesValid(rows: readonly TrainingRowBase[]): boolean {
  return rows.every((row) => scheduleOf(row.scheduleLines).valid);
}

// ---------------------------------------------------------------- тренер

/** Место «в клубе»: клуб KTTF или зал вне KTTF названием и адресом. */
export type ClubPlaceMode = 'club' | 'venue';

export interface CoachTrainingRow extends TrainingRowBase {
  readonly place: TrainingPlace;
  readonly mode: ClubPlaceMode;
  readonly clubId: string | null;
  /** Название выбранного клуба — для поля выбора, на сервер не уходит. */
  readonly clubName: string;
  readonly venueName: string;
  readonly venueAddress: string;
  /**
   * Кто записывает и принимает оплату. «Клуб» — только у клуба KTTF; в
   * зале вне KTTF, на выезде и онлайн — всегда тренер.
   */
  readonly booking: TrainingBooking;
}

/** Можно ли выбрать «записывает клуб»: место «в клубе» и выбран клуб KTTF. */
export function canBookViaClub(row: Pick<CoachTrainingRow, 'place' | 'mode' | 'clubId'>): boolean {
  return row.place === 'CLUB' && row.mode === 'club' && row.clubId !== null;
}

/**
 * Строки формы тренера — только его собственные тренировки. Клубные, где
 * он подтвердил участие, ведёт клуб: тренер видит их отдельно и может
 * только отказаться.
 */
export function coachTrainingRowsOf(trainings: readonly TrainingView[]): CoachTrainingRow[] {
  return trainings
    .filter((training) => training.author === 'COACH')
    .map((training) => ({
      ...baseOf(training),
      place: training.place,
      mode: training.venue === null ? 'club' : 'venue',
      clubId: training.club?.id ?? null,
      clubName: training.club?.name ?? '',
      venueName: training.venue?.name ?? '',
      venueAddress: training.venue?.address ?? '',
      booking: training.booking,
    }));
}

export function emptyCoachTrainingRow(): CoachTrainingRow {
  return {
    ...emptyBase(),
    place: 'CLUB',
    mode: 'club',
    clubId: null,
    clubName: '',
    venueName: '',
    venueAddress: '',
    booking: 'COACH',
  };
}

/**
 * Строки тренера — в тело `PUT /coaches/:id/trainings`. `null` — в форме
 * ошибка. У места «в клубе» уходит ровно одно: клуб или зал с адресом; у
 * выезда и онлайна места нет вовсе.
 */
export function toCoachTrainingInputs(
  rows: readonly CoachTrainingRow[],
): CoachTrainingInput[] | null {
  const trainings = rows.map((row): CoachTrainingInput => {
    const place =
      row.place !== 'CLUB'
        ? { clubId: null, venueName: null, venueAddress: null }
        : row.mode === 'club'
          ? { clubId: row.clubId, venueName: null, venueAddress: null }
          : {
              clubId: null,
              venueName: textOrNull(row.venueName),
              venueAddress: textOrNull(row.venueAddress),
            };

    return {
      ...baseInput(row),
      place: row.place,
      ...place,
      // Запись через клуб — только в клубе KTTF; иначе записывает тренер.
      booking: canBookViaClub(row) ? row.booking : 'COACH',
    };
  });

  return schedulesValid(rows) && setCoachTrainingsSchema.safeParse({ trainings }).success
    ? trainings
    : null;
}

// ---------------------------------------------------------------- клуб

export interface ClubTrainingRow extends TrainingRowBase {
  /** Тренер со страницей; `null` — тренировка клуба без тренера. */
  readonly coach: TrainingCoachRef | null;
}

export function clubTrainingRowsOf(trainings: readonly TrainingView[]): ClubTrainingRow[] {
  return trainings.map((training) => ({ ...baseOf(training), coach: training.coach }));
}

export function emptyClubTrainingRow(): ClubTrainingRow {
  return { ...emptyBase(), coach: null };
}

/** Строки клуба — в тело `PUT /clubs/:id/trainings`. Место — сам клуб. */
export function toClubTrainingInputs(rows: readonly ClubTrainingRow[]): ClubTrainingInput[] | null {
  const trainings = rows.map((row): ClubTrainingInput => ({
    ...baseInput(row),
    coachId: row.coach?.id ?? null,
  }));

  return schedulesValid(rows) && setClubTrainingsSchema.safeParse({ trainings }).success
    ? trainings
    : null;
}
