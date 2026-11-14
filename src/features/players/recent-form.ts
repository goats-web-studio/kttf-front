import type {
  DuelView,
  PlayerTournamentMatchView,
  PlayerTournamentView,
  RatingPointView,
} from '@kttf/shared/types';

import { playerName } from './player-name';

/** Сколько последних встреч показывает «Форма» в шапке профиля. */
export const FORM_SIZE = 10;

/** Где сыграна встреча «Формы»: на турнире или дуэлью (ADR-065). */
export type FormSource = 'TOURNAMENT' | 'DUEL' | 'SPARRING';

/** Встреча «Формы» — одного вида для турнира и дуэли. */
export interface FormEntry {
  readonly key: string;
  readonly source: FormSource;
  readonly won: boolean;
  /** Счёт «свои : чужие». `null` — у дуэли счёт не пришёл. */
  readonly score: readonly [number, number] | null;
  /** Имя соперника. `null` — техническая победа без соперника. */
  readonly opponent: string | null;
  /** Когда сыграна: по этому моменту турнир и дуэли встают в один ряд. */
  readonly at: string;
  /** Изменение рейтинга. `null` — турнир ещё не обсчитан. */
  readonly delta: string | null;
  /** Куда ведёт точка: турнир или дуэль. */
  readonly href: string;
  /** Название турнира; у дуэли — `null`. */
  readonly tournamentName: string | null;
}

/** Точка истории рейтинга по дуэли и сама дуэль, если она загрузилась. */
export interface DuelFormInput {
  readonly point: RatingPointView & { readonly duel: NonNullable<RatingPointView['duel']> };
  readonly detail: DuelView | undefined;
}

/**
 * Последние встречи, свежая первой, — для «Формы» в шапке профиля.
 *
 * Турнирные встречи и рейтинговые дуэли — в одном ряду по времени: дуэль
 * меняет рейтинг так же, как встреча турнира, и «Форма» без неё показывала
 * бы не ту картину, что график.
 *
 * Турниры приходят свежими сверху, а встречи внутри турнира — по ходу
 * турнира (ADR-048). Ряд сливается, а не сортируется заново: у встречи без
 * отметки времени порядок внутри турнира иначе потерялся бы.
 */
export function recentForm(
  input: {
    readonly tournaments: readonly PlayerTournamentView[];
    readonly duels?: readonly DuelFormInput[];
    readonly playerId?: string;
  },
  size = FORM_SIZE,
): readonly FormEntry[] {
  const fromTournaments = input.tournaments.flatMap((item) =>
    [...item.matches].reverse().map((match) => tournamentEntry(match, item.tournament)),
  );
  const fromDuels = (input.duels ?? [])
    .map((duel) => duelEntry(duel, input.playerId ?? ''))
    .filter((entry): entry is FormEntry => entry !== null)
    .sort((left, right) => right.at.localeCompare(left.at));

  const form: FormEntry[] = [];
  let t = 0;
  let d = 0;

  while (form.length < size && (t < fromTournaments.length || d < fromDuels.length)) {
    const fromT = fromTournaments[t];
    const fromD = fromDuels[d];

    if (fromD === undefined || (fromT !== undefined && fromT.at >= fromD.at)) {
      if (fromT !== undefined) form.push(fromT);
      t += 1;
    } else {
      form.push(fromD);
      d += 1;
    }
  }

  return form;
}

function tournamentEntry(
  match: PlayerTournamentMatchView,
  tournament: PlayerTournamentView['tournament'],
): FormEntry {
  return {
    key: match.matchId,
    source: 'TOURNAMENT',
    won: match.won,
    score: [match.setsFor, match.setsAgainst],
    opponent: match.opponent === null ? null : playerName(match.opponent),
    at: match.playedAt ?? match.startedAt ?? tournament.startsAt,
    delta: match.delta,
    href: `/tournaments/${tournament.id}`,
    tournamentName: tournament.name,
  };
}

/**
 * Дуэль — из точки истории рейтинга и страницы дуэли.
 *
 * Победителя и счёт знает дуэль. Не загрузилась — победа угадывается по
 * знаку изменения рейтинга; при нулевом изменении (разрыв от 100, ТЗ 7.0)
 * угадать нечем, и такая дуэль в «Форму» не встаёт. Отменённая
 * администратором дуэль не встаёт тоже.
 */
function duelEntry({ point, detail }: DuelFormInput, playerId: string): FormEntry | null {
  if (detail?.annulledAt != null) return null;

  const result = detail?.result ?? null;
  let won: boolean;
  let score: readonly [number, number] | null = null;

  if (result === null) {
    const delta = Number(point.delta);
    if (delta === 0 || Number.isNaN(delta)) return null;
    won = delta > 0;
  } else {
    won = result.winnerId === playerId;
    score = won ? [result.winnerSets, result.loserSets] : [result.loserSets, result.winnerSets];
  }

  return {
    key: `duel-${point.duel.id}`,
    source: point.duel.kind,
    won,
    score,
    opponent: point.duel.opponentName,
    at: point.playedAt,
    delta: point.delta,
    href: `/duels/${point.duel.id}`,
    tournamentName: null,
  };
}
