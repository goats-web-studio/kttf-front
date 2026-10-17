import type {
  CreateTournamentInput,
  TournamentView,
  UpdateTournamentInput,
} from '@kttf/shared/types';

/** Поля, которые форма задаёт всегда. */
const REQUIRED = ['name', 'entryFee', 'level', 'tableCount', 'reviewOutOfRating'] as const;

/** Необязательные условия — их можно и задать, и стереть (ADR-044). */
const OPTIONAL = [
  'maxParticipants',
  'birthYearFrom',
  'birthYearTo',
  'genderLimit',
  'description',
  'prizeInfo',
] as const;

/**
 * Правка турнира — только изменённое.
 *
 * Отправлять всё подряд нельзя по двум причинам. ТС 7.5 отвергает пустую
 * правку. И смена схемы проведения сбрасывает жеребьёвку (ADR-044): схема,
 * отправленная без изменений, стёрла бы расстановку, которую организатор уже
 * поправил руками. `null` значит «изменений нет».
 *
 * Стёртое в форме условие уходит `null` — снятая планка обязана перестать
 * отсекать игроков.
 */
export function tournamentPatch(
  tournament: TournamentView,
  values: CreateTournamentInput,
): UpdateTournamentInput | null {
  const patch: Record<string, unknown> = {};

  for (const field of REQUIRED) {
    if (values[field] !== undefined && values[field] !== tournament[field]) {
      patch[field] = values[field];
    }
  }

  for (const field of OPTIONAL) {
    const next = values[field] ?? null;
    if (next !== tournament[field]) {
      patch[field] = next;
    }
  }

  // Моменты сравниваются временем, а не строкой: сервер и форма пишут один и
  // тот же момент по-разному (с миллисекундами и без).
  if (!sameMoment(values.startsAt, tournament.startsAt)) {
    patch.startsAt = values.startsAt;
  }
  if (!sameMoment(values.registrationEndsAt ?? null, tournament.registrationEndsAt)) {
    patch.registrationEndsAt = values.registrationEndsAt ?? null;
  }

  // Планки рейтинга приходят строкой (ADR-014), а уходят числом.
  for (const field of ['ratingCapMin', 'ratingCapMax'] as const) {
    const next = values[field] ?? null;
    const stored = tournament[field] === null ? null : Number(tournament[field]);
    if (next !== stored) {
      patch[field] = next;
    }
  }

  if (!sameShape(values.formatConfig, tournament.formatConfig)) {
    patch.formatConfig = values.formatConfig;
  }
  if (!sameShape(values.seedingConfig ?? null, tournament.seedingConfig)) {
    patch.seedingConfig = values.seedingConfig ?? null;
  }

  return Object.keys(patch).length === 0 ? null : patch;
}

function sameMoment(left: string | null, right: string | null): boolean {
  if (left === null || right === null) return left === right;
  return new Date(left).getTime() === new Date(right).getTime();
}

/**
 * Одинаковы ли две конфигурации по содержанию.
 *
 * Порядок ключей не важен: форма собирает объект в своём порядке, сервер
 * отдаёт в порядке схемы. Отсутствующий ключ и `undefined` — одно и то же.
 */
export function sameShape(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (typeof left !== 'object' || typeof right !== 'object' || left === null || right === null) {
    return false;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((item, index) => sameShape(item, right[index]))
    );
  }

  const a = left as Record<string, unknown>;
  const b = right as Record<string, unknown>;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);

  return [...keys].every((key) => sameShape(a[key], b[key]));
}
