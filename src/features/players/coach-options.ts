import type { CityRef, CoachListItemView, PlayerListItemView } from '@kttf/shared/types';

import { coachPhoto } from '@/features/coaches/labels';

/**
 * Варианты поля «Тренер» в анкете (ADR-035, ADR-059): тренеры KTTF со
 * страницей — поиском на сервере, ниже «Другие» — игроки, на которых уже
 * ссылались, — и последним «Вписать: „…“». Выбор из первых двух групп
 * кладёт `coachPlayerId`, вписанное — `coachName`: одно из двух.
 */
export type CoachOption =
  | {
      readonly kind: 'kttf';
      readonly playerId: string;
      readonly name: string;
      readonly photoUrl: string | null;
      readonly city: CityRef | null;
      readonly rating: string | null;
    }
  | {
      readonly kind: 'player';
      readonly playerId: string;
      readonly name: string;
      readonly photoUrl: string | null;
      readonly city: CityRef | null;
      readonly rating: string | null;
    }
  | { readonly kind: 'typed'; readonly name: string };

/** С какой длины текста идёт поиск на сервере. */
export const COACH_SEARCH_MIN = 2;

/** Сколько тренеров KTTF в подсказке. */
export const COACH_SEARCH_LIMIT = 10;

const fullName = (person: { readonly lastName: string; readonly firstName: string }): string =>
  `${person.lastName} ${person.firstName}`;

/** Текст для поиска на сервере: от двух букв, иначе подсказка без поиска. */
export function coachSearchText(input: string): string | undefined {
  const text = input.trim();

  return text.length >= COACH_SEARCH_MIN ? text : undefined;
}

/** Совпадение по словам: «сер тим» находит «Сериков Тимур». */
function matches(name: string, input: string): boolean {
  const words = input.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = name.toLowerCase();

  return words.every((word) => haystack.includes(word));
}

/**
 * Варианты по порядку групп. Игрок, у которого есть страница тренера, —
 * только в «Тренерах KTTF», без повтора в «Других». «Вписать» — только
 * если текст есть и он не совпадает с именем найденного дословно.
 */
export function coachOptions(
  input: string,
  coaches: readonly CoachListItemView[],
  referenced: readonly PlayerListItemView[],
): CoachOption[] {
  const text = input.trim();
  const kttf: CoachOption[] = coaches.map((coach) => ({
    kind: 'kttf',
    playerId: coach.player.id,
    name: fullName(coach.player),
    photoUrl: coachPhoto(coach),
    city: coach.city ?? coach.player.city,
    rating: coach.player.rating,
  }));
  const kttfIds = new Set(coaches.map((coach) => coach.player.id));
  const others: CoachOption[] = referenced
    .filter((player) => !kttfIds.has(player.id))
    .filter((player) => text === '' || matches(fullName(player), text))
    .map((player) => ({
      kind: 'player',
      playerId: player.id,
      name: fullName(player),
      photoUrl: player.photoUrl,
      city: player.city,
      rating: player.rating,
    }));
  const exact = [...kttf, ...others].some(
    (option) => option.name.toLowerCase() === text.toLowerCase(),
  );

  return [
    ...kttf,
    ...others,
    ...(text === '' || exact ? [] : [{ kind: 'typed' as const, name: text }]),
  ];
}

/**
 * Что показать в поле при открытии анкеты: тренер из списка — по имени из
 * профиля (`coachName` сервер подставляет сам, ADR-035), даже если его нет
 * в текущей выдаче; вписанный — строкой.
 */
export function initialCoachOption(
  coachPlayerId: string | undefined,
  coachName: string | null | undefined,
): CoachOption | null {
  if (coachPlayerId !== undefined) {
    return {
      kind: 'player',
      playerId: coachPlayerId,
      name: coachName ?? '',
      photoUrl: null,
      city: null,
      rating: null,
    };
  }
  if (coachName !== undefined && coachName !== null && coachName !== '') {
    return { kind: 'typed', name: coachName };
  }

  return null;
}

/** Поля анкеты по выбранному варианту: одно из двух, очистка — оба пустые. */
export function coachFields(option: CoachOption | null): {
  readonly coachPlayerId: string | undefined;
  readonly coachName: string | undefined;
} {
  if (option === null) return { coachPlayerId: undefined, coachName: undefined };
  if (option.kind === 'typed') return { coachPlayerId: undefined, coachName: option.name };

  return { coachPlayerId: option.playerId, coachName: undefined };
}

/** Один и тот же вариант — для `isOptionEqualToValue`. */
export function sameCoachOption(a: CoachOption, b: CoachOption): boolean {
  if (a.kind === 'typed' || b.kind === 'typed') return a.kind === b.kind && a.name === b.name;

  return a.playerId === b.playerId;
}
