import type {
  MatchResultInput,
  MatchUpdateResult,
  MatchView,
  StageView,
  TournamentResultsView,
} from '@kttf/shared/types';

/**
 * Состояние турнира в консоли и его изменения.
 *
 * Чистые функции над снимком: ни одна из них не ходит в сеть. Это прямое
 * следствие запрета №1 — ввод счёта не ждёт ответа сервера. Судья нажимает
 * «3:1», экран меняется сразу, запрос уходит следом.
 *
 * Ничего не пересчитывается: места, очки и таблицы приходят от сервера.
 * Здесь только подстановка того, что уже известно.
 */

function mapStages(
  state: TournamentResultsView,
  change: (match: MatchView) => MatchView,
): TournamentResultsView {
  return {
    ...state,
    stages: state.stages.map((stage) => ({ ...stage, matches: stage.matches.map(change) })),
  };
}

/** Подстановка встречи, пришедшей от сервера. */
export function replaceMatch(
  state: TournamentResultsView,
  match: MatchView,
): TournamentResultsView {
  return mapStages(state, (current) => (current.id === match.id ? match : current));
}

/**
 * Итог действия над встречей целиком — ТС 7.6.
 *
 * Кроме самой встречи применяются `updated` (победитель уехал в следующий
 * круг) и `nextStage` (плей-офф, достроенный по итогам групп). Ради этого
 * сервер их и возвращает: турнир не перезапрашивается, и экран не мигает
 * посреди зала.
 */
export function applyUpdate(
  state: TournamentResultsView,
  update: MatchUpdateResult,
): TournamentResultsView {
  const changed = new Map([update.match, ...update.updated].map((match) => [match.id, match]));
  const applied = mapStages(state, (current) => changed.get(current.id) ?? current);

  return update.nextStage === null ? applied : withStage(applied, update.nextStage);
}

/** Достроенный этап заменяет прежний с тем же идентификатором либо добавляется. */
function withStage(state: TournamentResultsView, stage: StageView): TournamentResultsView {
  const known = state.stages.some((current) => current.id === stage.id);

  return {
    ...state,
    stages: known
      ? state.stages.map((current) => (current.id === stage.id ? stage : current))
      : [...state.stages, stage].sort((left, right) => left.order - right.order),
  };
}

/**
 * Счёт, применённый до ответа сервера.
 *
 * Номер стола намеренно не снимается: сервер его тоже не снимает, и стол
 * остаётся занятым закрытой встречей, пока судья не позовёт следующую пару
 * (ТЗ 6.1). Продвижение победителя по сетке здесь не изобретается — его
 * посчитает сервер и пришлёт в `updated`.
 */
export function withOptimisticResult(
  state: TournamentResultsView,
  matchId: string,
  input: MatchResultInput,
  now: string,
): TournamentResultsView {
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
  state: TournamentResultsView,
  matchId: string,
  tableNumber: number,
  now: string,
): TournamentResultsView {
  return mapStages(state, (match) =>
    match.id === matchId
      ? { ...match, tableNumber, status: 'PLAYING', startedAt: now, finishedAt: null }
      : match,
  );
}

/** Возврат встречи в очередь — ТЗ 6.3, ADR-021: снимаются счёт и стол. */
export function withOptimisticCancel(
  state: TournamentResultsView,
  matchId: string,
): TournamentResultsView {
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
export function namesOf(state: TournamentResultsView): ReadonlyMap<string, string> {
  return new Map(
    state.participants.map((participant) => [
      participant.player.id,
      `${participant.player.lastName} ${participant.player.firstName}`,
    ]),
  );
}

/** Рейтинг участника на старте турнира — ТЗ 6.6 требует его рядом с фамилией. */
export function ratingsOf(state: TournamentResultsView): ReadonlyMap<string, string> {
  return new Map(
    state.participants.map((participant) => [participant.player.id, participant.player.rating]),
  );
}
