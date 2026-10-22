import type {
  MatchResultInput,
  MatchView,
  RegistrationStatus,
  TournamentSnapshotView,
} from '@kttf/shared/types';

import { formatRating } from '@/common/i18n';

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

/**
 * Снятие участника или возврат в игру до ответа сервера — ADR-061.
 *
 * Меняется только статус записи. Техпобеды в таблице и в сетке считает
 * сервер и пришлёт снимком; консоль по статусу лишь перестаёт ждать встречи
 * снявшегося (`isSettled`). Возврат после старта сервер записывает как
 * «играет» — так же и здесь.
 */
export function withOptimisticWithdraw(
  state: TournamentSnapshotView,
  registrationId: string,
  status: RegistrationStatus,
): TournamentSnapshotView {
  const next = status === 'CONFIRMED' && state.tournament.status === 'RUNNING' ? 'PLAYING' : status;

  return {
    ...state,
    registrations: state.registrations.map((registration) =>
      registration.id === registrationId ? { ...registration, status: next } : registration,
    ),
  };
}

/** Снявшиеся и не явившиеся: их несыгранные встречи решены снятием. */
export function withdrawnOf(state: TournamentSnapshotView): ReadonlySet<string> {
  return new Set(
    state.registrations
      .filter(
        (registration) => registration.status === 'WITHDRAWN' || registration.status === 'NO_SHOW',
      )
      .map((registration) => registration.player.id),
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
 * старта снимка ещё нет — тогда показывается текущий рейтинг. Целым, как
 * везде (ADR-053).
 */
export function ratingsOf(state: TournamentSnapshotView): ReadonlyMap<string, string> {
  return new Map(
    state.registrations.map((registration) => [
      registration.player.id,
      formatRating(registration.ratingAtStart ?? registration.player.rating),
    ]),
  );
}
