import type { TournamentSnapshotView } from '@kttf/shared/types';

import type { OutboxItem, QueuedOperation } from './db';
import {
  withOptimisticAssign,
  withOptimisticCancel,
  withOptimisticResult,
  withOptimisticWithdraw,
} from './state';

/**
 * Снимок глазами судьи — ТЗ 6.4.
 *
 * То, что видно в зале, — это снимок сервера плюс неотправленное из очереди.
 * Иначе ответ синхронизации, пришедший в момент, когда судья вводит счёт,
 * стёр бы этот счёт с экрана: сервер о нём ещё не знает.
 *
 * Применяются только те операции, чей результат клиент вправе предсказать:
 * счёт, стол, отмена и статус снятого участника (ADR-061). Решение по
 * равенству меняет места, а их считает движок на сервере — угадывать здесь
 * означало бы второй расчёт на клиенте (запрет №2 брифа). У снятия так же:
 * меняется только статус записи, техпобеды пришлёт сервер.
 */
export function applyOperation(
  snapshot: TournamentSnapshotView,
  operation: QueuedOperation,
): TournamentSnapshotView {
  switch (operation.type) {
    case 'MATCH_ASSIGN':
      return withOptimisticAssign(
        snapshot,
        operation.matchId,
        operation.payload.tableNumber,
        operation.createdAt,
      );

    case 'MATCH_RESULT':
    case 'MATCH_EDIT':
      return withOptimisticResult(
        snapshot,
        operation.matchId,
        operation.payload,
        operation.createdAt,
      );

    case 'MATCH_CANCEL':
      return withOptimisticCancel(snapshot, operation.matchId);

    case 'PLAYER_WITHDRAW':
      return operation.payload.status === undefined
        ? snapshot
        : withOptimisticWithdraw(snapshot, operation.registrationId, operation.payload.status);

    case 'TIE_DECISION':
      return snapshot;
  }
}

/** Снимок сервера с наложенной поверх неотправленной очередью. */
export function applyPending(
  snapshot: TournamentSnapshotView,
  items: readonly OutboxItem[],
): TournamentSnapshotView {
  return items.reduce((current, item) => applyOperation(current, item.operation), snapshot);
}
