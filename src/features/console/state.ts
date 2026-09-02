import type { MatchResultInput, MatchView, TournamentSnapshotView } from '@kttf/shared/types';

/**
 * Снимок турнира в консоли и его изменения.
 *
 * Чистые функции над снимком: ни одна из них не ходит в сеть. Это прямое
 * следствие запрета №1 — ввод счёта не ждёт ответа сервера. Судья нажимает
 * «3:1», экран меняется сразу, операция ложится в очередь на диск.
 *
 * Ничего не пересчитывается: места, очки и таблицы приходят от сервера
 * снимком. Здесь только подстановка того, что уже известно.
 */

function mapStages(
  state: TournamentSnapshotView,
  change: (match: MatchView) => MatchView,
): TournamentSnapshotView {
  return {
    ...state,
    stages: state.stages.map((stage) => ({ ...stage, matches: stage.matches.map(change) })),
  };
}

/**
 * Счёт, применённый до ответа сервера.
 *
 * Номер стола намеренно не снимается: сервер его тоже не снимает, и стол
 * остаётся занятым закрытой встречей, пока судья не позовёт следующую пару
 * (ТЗ 6.1). Продвижение победителя по сетке здесь не изобретается — его
 * посчитает сервер и пришлёт следующим снимком.
 */
export function withOptimisticResult(
  state: TournamentSnapshotView,
  matchId: string,
  input: MatchResultInput,
  now: string,
): TournamentSnapshotView {
  return mapStages(state, (match) =>
    match.id === matchId
      ? {
          ...match,
          setsA: input.setsA,
          setsB: input.setsB,
          resultType: input.resultType,
          status: 'FINISHED',
          finishedAt: now,
        }
      : match,
  );
}

/** Назначение на стол, применённое до ответа сервера. */
export function withOptimisticAssign(
  state: TournamentSnapshotView,
  matchId: string,
  tableNumber: number,
  now: string,
): TournamentSnapshotView {
  return mapStages(state, (match) =>
    match.id === matchId
      ? { ...match, tableNumber, status: 'PLAYING', startedAt: now, finishedAt: null }
      : match,
  );
}

/** Возврат встречи в очередь — ТЗ 6.3, ADR-021: снимаются счёт и стол. */
export function withOptimisticCancel(
  state: TournamentSnapshotView,
  matchId: string,
): TournamentSnapshotView {
  return mapStages(state, (match) =>
    match.id === matchId
      ? {
          ...match,
          setsA: null,
          setsB: null,
          resultType: null,
          tableNumber: null,
          status: 'PENDING',
          startedAt: null,
          finishedAt: null,
        }
      : match,
  );
}

/** Имена участников: таблицы и карточки встреч ссылаются на игрока по id. */
export function namesOf(state: TournamentSnapshotView): ReadonlyMap<string, string> {
  return new Map(
    state.registrations.map((registration) => [
      registration.player.id,
      `${registration.player.lastName} ${registration.player.firstName}`,
    ]),
  );
}

/**
 * Рейтинг участника рядом с фамилией — ТЗ 6.6.
 *
 * Берётся снимок на старте турнира (ТС 5.4), а не текущее значение: в зале
 * важно, с чем игрок в турнир вошёл, и это число не меняется по ходу. До
 * старта снимка ещё нет — тогда показывается текущий рейтинг.
 */
export function ratingsOf(state: TournamentSnapshotView): ReadonlyMap<string, string> {
  return new Map(
    state.registrations.map((registration) => [
      registration.player.id,
      registration.ratingAtStart ?? registration.player.rating,
    ]),
  );
}
