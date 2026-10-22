import type {
  MatchView,
  ParticipantRatingView,
  ResultParticipantView,
  StageView,
  TieGroupView,
  TournamentResultsView,
  TournamentStandingsView,
} from '@kttf/shared/types';

import { finalRound, isPlacement } from '@/common/ui/bracket-model';

/**
 * Сводки для страницы турнира — то, что зритель ищет в таблицах: победы и
 * поражения, сеты, где игрок выбыл, изменение рейтинга за встречу.
 *
 * Это показ, а не правило: места, очки и равенства приходят от сервера
 * посчитанными общим движком (запрет №2 брифа). Здесь только сложение
 * сыгранного для подписи и раскладка ответа по игрокам.
 */

/** Сыгранное игроком в турнире: встречи, победы, поражения, сеты. */
export interface PlayerTally {
  readonly played: number;
  readonly wins: number;
  readonly losses: number;
  readonly setsWon: number;
  readonly setsLost: number;
}

const EMPTY: PlayerTally = { played: 0, wins: 0, losses: 0, setsWon: 0, setsLost: 0 };

function isPlayed(match: MatchView): boolean {
  return (
    match.setsA !== null &&
    match.setsB !== null &&
    match.playerAId !== null &&
    match.playerBId !== null
  );
}

/** Сыгранное каждым участником по всем этапам. */
export function tallies(stages: readonly StageView[]): ReadonlyMap<string, PlayerTally> {
  const result = new Map<string, PlayerTally>();

  for (const match of stages.flatMap((stage) => stage.matches)) {
    if (!isPlayed(match)) continue;

    const setsA = match.setsA ?? 0;
    const setsB = match.setsB ?? 0;

    for (const [id, own, other] of [
      [match.playerAId, setsA, setsB],
      [match.playerBId, setsB, setsA],
    ] as const) {
      if (id === null) continue;

      const was = result.get(id) ?? EMPTY;

      result.set(id, {
        played: was.played + 1,
        wins: was.wins + (own > other ? 1 : 0),
        losses: was.losses + (own < other ? 1 : 0),
        setsWon: was.setsWon + own,
        setsLost: was.setsLost + other,
      });
    }
  }

  return result;
}

/** Изменение рейтинга игрока за встречу: ключ — `встреча:игрок`. */
export function deltasByMatch(
  ratings: readonly ParticipantRatingView[],
): ReadonlyMap<string, string> {
  const result = new Map<string, string>();

  for (const rating of ratings) {
    for (const event of rating.events) {
      if (event.matchId !== null) result.set(`${event.matchId}:${rating.playerId}`, event.delta);
    }
  }

  return result;
}

/** Рейтинг участника для подписи у фамилии: снимок на старте, иначе текущий. */
export function startRatings(
  participants: readonly ResultParticipantView[],
  ratings: readonly ParticipantRatingView[],
): ReadonlyMap<string, string> {
  const atStart = new Map(ratings.map((rating) => [rating.playerId, rating.ratingAtStart]));

  return new Map(
    participants.map((participant) => [
      participant.player.id,
      atStart.get(participant.player.id) ?? participant.player.rating,
    ]),
  );
}

/** Средний рейтинг поля, целым — мера силы турнира. `null` без участников. */
export function averageRating(ratings: ReadonlyMap<string, string>): number | null {
  const values = [...ratings.values()].map(Number).filter((value) => Number.isFinite(value));

  if (values.length === 0) return null;

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/** Сколько встреч закрыто из скольких. Вычеркнутые не считаются вовсе. */
export function matchProgress(stages: readonly StageView[]): {
  readonly played: number;
  readonly total: number;
} {
  const matches = stages.flatMap((stage) => stage.matches).filter((m) => m.status !== 'CANCELLED');

  return { played: matches.filter(isPlayed).length, total: matches.length };
}

/** Где игрок закончил турнир. */
export type Finish =
  | { readonly kind: 'CHAMPION' }
  /** Проиграл в сетке: `fromFinal` 0 — финал, 1 — полуфинал… */
  | { readonly kind: 'BRACKET'; readonly fromFinal: number; readonly consolation: boolean }
  | { readonly kind: 'THIRD_PLACE'; readonly won: boolean }
  /** Остался в группе: метка группы и место в ней. */
  | { readonly kind: 'GROUP'; readonly label: string; readonly place: number | null };

/**
 * Где закончил каждый: победитель, круг вылета в сетке, встреча за третье
 * место или группа с местом в ней. Берётся последнее по ходу турнира.
 */
export function finishes(
  stages: readonly StageView[],
  standings: TournamentStandingsView,
): ReadonlyMap<string, Finish> {
  const result = new Map<string, Finish>();

  for (const group of standings.groups) {
    for (const row of group.rows) {
      result.set(row.participant, { kind: 'GROUP', label: group.label, place: row.place });
    }
  }

  for (const stage of [...stages].sort((left, right) => left.order - right.order)) {
    if (stage.type !== 'KNOCKOUT' && stage.type !== 'CONSOLATION') continue;

    const final = finalRound(stage.matches);
    const consolation = stage.type === 'CONSOLATION';

    for (const match of [...stage.matches].sort(
      (left, right) => (left.bracketRound ?? 0) - (right.bracketRound ?? 0),
    )) {
      if (!isPlayed(match)) continue;

      const aWon = (match.setsA ?? 0) > (match.setsB ?? 0);
      const winner = aWon ? match.playerAId : match.playerBId;
      const loser = aWon ? match.playerBId : match.playerAId;

      if (winner === null || loser === null) continue;

      if (isPlacement(match)) {
        result.set(winner, { kind: 'THIRD_PLACE', won: true });
        result.set(loser, { kind: 'THIRD_PLACE', won: false });
        continue;
      }

      const fromFinal = final - (match.bracketRound ?? final);

      result.set(loser, { kind: 'BRACKET', fromFinal, consolation });

      if (fromFinal === 0 && !consolation) result.set(winner, { kind: 'CHAMPION' });
    }
  }

  return result;
}

/** Место строкой: «3», а у делящих — диапазон «5–8». `null` — не определено. */
export function placeLabel(
  participant: ResultParticipantView,
  shared: readonly TieGroupView[],
): string | null {
  if (participant.place !== null) return String(participant.place);

  const tie = shared.find((group) => group.participants.includes(participant.player.id));

  if (tie === undefined || tie.places.length === 0) return null;

  return `${String(Math.min(...tie.places))}–${String(Math.max(...tie.places))}`;
}

/**
 * Порядок итоговой таблицы: определённые места, затем делящие по началу
 * диапазона, затем остальные — по месту в группе, при равном — по исходному
 * порядку. Сервер отдаёт неопределённых в порядке фамилий, и делящие 5–8
 * терялись среди выбывших из групп.
 */
export function orderPlacements(
  participants: readonly ResultParticipantView[],
  shared: readonly TieGroupView[],
  finish: ReadonlyMap<string, Finish>,
): readonly ResultParticipantView[] {
  const key = (participant: ResultParticipantView): number => {
    if (participant.place !== null) return participant.place;

    const tie = shared.find((group) => group.participants.includes(participant.player.id));

    if (tie !== undefined) return Math.min(...tie.places);

    const end = finish.get(participant.player.id);

    return 10_000 + (end?.kind === 'GROUP' ? (end.place ?? 99) : 100);
  };

  return participants
    .map((participant, index) => ({ participant, index, key: key(participant) }))
    .sort((left, right) => left.key - right.key || left.index - right.index)
    .map((entry) => entry.participant);
}

/** Сколько минут шла встреча; `null`, если время не записано. */
export function matchMinutes(match: MatchView): number | null {
  if (match.startedAt === null || match.finishedAt === null) return null;

  const minutes = Math.round(
    (new Date(match.finishedAt).getTime() - new Date(match.startedAt).getTime()) / 60_000,
  );

  return minutes > 0 ? minutes : null;
}

/** Всё, что страница турнира показывает сверх ответа сервера, — одним разом. */
export interface ResultsModel {
  readonly names: ReadonlyMap<string, string>;
  /** Рейтинг у фамилии: снимок на старте, до старта — текущий. */
  readonly ratings: ReadonlyMap<string, string>;
  /** Итог рейтинга за турнир по игроку. */
  readonly rating: ReadonlyMap<string, ParticipantRatingView>;
  readonly tallies: ReadonlyMap<string, PlayerTally>;
  readonly deltas: ReadonlyMap<string, string>;
  readonly finishes: ReadonlyMap<string, Finish>;
}

export function buildResultsModel(
  data: TournamentResultsView,
  names: ReadonlyMap<string, string>,
): ResultsModel {
  return {
    names,
    ratings: startRatings(data.participants, data.ratings),
    rating: new Map(data.ratings.map((rating) => [rating.playerId, rating])),
    tallies: tallies(data.stages),
    deltas: deltasByMatch(data.ratings),
    finishes: finishes(data.stages, data.standings),
  };
}
