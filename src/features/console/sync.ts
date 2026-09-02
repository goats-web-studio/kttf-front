import type { RejectedOperation, TournamentSnapshotView } from '@kttf/shared/types';

import { fetchSnapshot, sendOperations } from './api';
import { applyPending } from './offline-state';
import {
  countAttempt,
  markRejected,
  markSynced,
  pending,
  readSnapshot,
  toOperations,
  writeSnapshot,
} from './outbox';

/**
 * Синхронизация очереди с сервером — ТС 6.3.
 *
 * Одна функция на все три повода отправки (восстановление сети, таймер,
 * кнопка судьи): расходиться им незачем, а разойдясь, они дали бы три разных
 * поведения при одном и том же состоянии очереди.
 *
 * Снимок сервера — источник истины по всему, что сервер уже знает. Поверх
 * него накладывается то, что ещё не отправлено: иначе ответ, пришедший в
 * момент ввода счёта, стёр бы этот счёт с экрана судьи.
 */

export interface SyncOutcome {
  readonly snapshot: TournamentSnapshotView;
  /** Осталось в очереди после отправки. */
  readonly queued: number;
  readonly rejected: readonly RejectedOperation[];
}

/**
 * Состояние турнира к началу работы: сначала диск, потом сеть.
 *
 * Порядок именно такой. Судья открывает консоль в зале, где сети может не
 * быть вовсе, и снимок с прошлого раза для него полезнее спиннера. Сеть
 * догонит следующей же синхронизацией.
 */
export async function loadState(tournamentId: string): Promise<TournamentSnapshotView> {
  const stored = await readSnapshot(tournamentId);

  if (stored !== undefined) {
    return applyPending(stored, await pending(tournamentId));
  }

  const snapshot = await fetchSnapshot(tournamentId);

  await writeSnapshot(snapshot);

  return snapshot;
}

/**
 * Отправка очереди и приём снимка.
 *
 * Пустая очередь — не повод пропустить отправку: ответ приносит свежий снимок,
 * а турнир мог измениться на другом устройстве.
 */
export async function syncTournament(tournamentId: string): Promise<SyncOutcome> {
  const stored = await readSnapshot(tournamentId);
  const sent = await pending(tournamentId);

  await countAttempt(sent);

  const result = await sendOperations(tournamentId, {
    lastServerVersion: stored?.version ?? 0,
    operations: toOperations(sent),
  });

  await markSynced(sent, result.applied);
  await markRejected(sent, result.rejected);
  await writeSnapshot(result.snapshot);

  // Очередь перечитывается: пока запрос шёл, судья мог ввести ещё счёт, и
  // его действие обязано остаться на экране.
  const left = await pending(tournamentId);

  return {
    snapshot: applyPending(result.snapshot, left),
    queued: left.length,
    rejected: result.rejected,
  };
}
