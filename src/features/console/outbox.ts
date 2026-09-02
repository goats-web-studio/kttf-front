import type { RejectedOperation, SyncOperation, TournamentSnapshotView } from '@kttf/shared/types';

import { db, type OutboxItem, type QueuedOperation } from './db';

/**
 * Очередь исходящих операций — ТЗ 6.4, ТС 6.2.
 *
 * Судья нажал — операция легла на диск. Всё остальное (отправка, повтор,
 * ответ сервера) происходит потом и без его участия: запрет №1 брифа не
 * допускает, чтобы ввод счёта ждал сети.
 *
 * Ничего не пересчитывается здесь и не решается: очередь только помнит, что
 * было сделано, и в каком порядке.
 */

/** Тело операции без того, что проставляет очередь. */
export type NewOperation =
  | Omit<Extract<SyncOperation, { type: 'MATCH_ASSIGN' }>, 'clientOpId' | 'seq' | 'createdAt'>
  | Omit<Extract<SyncOperation, { type: 'MATCH_RESULT' }>, 'clientOpId' | 'seq' | 'createdAt'>
  | Omit<Extract<SyncOperation, { type: 'MATCH_EDIT' }>, 'clientOpId' | 'seq' | 'createdAt'>
  | Omit<Extract<SyncOperation, { type: 'MATCH_CANCEL' }>, 'clientOpId' | 'seq' | 'createdAt'>
  | Omit<Extract<SyncOperation, { type: 'TIE_DECISION' }>, 'clientOpId' | 'seq' | 'createdAt'>
  | Omit<Extract<SyncOperation, { type: 'PLAYER_WITHDRAW' }>, 'clientOpId' | 'seq' | 'createdAt'>;

/**
 * Готовая операция: с идентификатором и временем действия судьи.
 *
 * Собирается **до** записи на диск, потому что экран меняется раньше диска:
 * судья нажал — счёт на экране, а Dexie допишет следом (запрет №1 брифа).
 * Идемпотентность синхронизации держится на `clientOpId`: он выдаётся один
 * раз здесь и переживает любое число повторных отправок.
 */
export function newOperation(operation: NewOperation): QueuedOperation {
  return { ...operation, clientOpId: crypto.randomUUID(), createdAt: new Date().toISOString() };
}

export async function enqueue(
  tournamentId: string,
  operation: QueuedOperation,
): Promise<OutboxItem> {
  const item: Omit<OutboxItem, 'seq'> = {
    tournamentId,
    clientOpId: operation.clientOpId,
    operation,
    createdAt: Date.now(),
    syncedAt: null,
    rejectedReason: null,
    attempts: 0,
  };

  const seq = await db.outbox.add(item);

  return { ...item, seq };
}

/** Неотправленное по турниру, в порядке действий судьи. */
export async function pending(tournamentId: string): Promise<OutboxItem[]> {
  const items = await db.outbox.where({ tournamentId }).toArray();

  return items
    .filter((item) => item.syncedAt === null && item.rejectedReason === null)
    .sort((left, right) => left.seq - right.seq);
}

/** Отклонённое сервером: судья видит это списком и решает сам, что делать. */
export async function rejectedItems(tournamentId: string): Promise<OutboxItem[]> {
  const items = await db.outbox.where({ tournamentId }).toArray();

  return items.filter((item) => item.rejectedReason !== null);
}

/**
 * Операции очереди в том виде, в каком их принимает сервер.
 *
 * `seq` берётся из ключа Dexie: он и есть порядок действий судьи, а сервер
 * применяет операции строго по нему (ТС 6.3).
 */
export function toOperations(items: readonly OutboxItem[]): SyncOperation[] {
  return items.map((item) => ({ ...item.operation, seq: item.seq }));
}

export async function markSynced(items: readonly OutboxItem[], applied: readonly string[]): Promise<void> {
  const accepted = new Set(applied);
  const now = Date.now();

  await db.transaction('rw', db.outbox, async () => {
    for (const item of items) {
      if (!accepted.has(item.clientOpId)) continue;

      await db.outbox.update(item.seq, { syncedAt: now });
    }
  });
}

/**
 * Отметка отклонённых.
 *
 * Отклонённая операция **не повторяется**: сервер уже сказал, что она не
 * ложится на состояние турнира, и повтор дал бы тот же отказ вечно. Она
 * остаётся в очереди помеченной, чтобы судья увидел, что именно из введённого
 * не легло.
 */
export async function markRejected(
  items: readonly OutboxItem[],
  rejected: readonly RejectedOperation[],
): Promise<void> {
  const reasons = new Map(rejected.map((entry) => [entry.clientOpId, entry.reason]));

  await db.transaction('rw', db.outbox, async () => {
    for (const item of items) {
      const reason = reasons.get(item.clientOpId);

      if (reason === undefined) continue;

      await db.outbox.update(item.seq, { rejectedReason: reason });
    }
  });
}

/** Счётчик попыток: по нему видно, что очередь стоит, а не просто ждёт сети. */
export async function countAttempt(items: readonly OutboxItem[]): Promise<void> {
  await db.transaction('rw', db.outbox, async () => {
    for (const item of items) {
      await db.outbox.update(item.seq, { attempts: item.attempts + 1 });
    }
  });
}

/** Забыть отклонённое: судья прочитал отказ и убрал его с глаз. */
export async function forget(seq: number): Promise<void> {
  await db.outbox.delete(seq);
}

export async function readSnapshot(
  tournamentId: string,
): Promise<TournamentSnapshotView | undefined> {
  return (await db.snapshots.get(tournamentId))?.snapshot;
}

export async function writeSnapshot(snapshot: TournamentSnapshotView): Promise<void> {
  await db.snapshots.put({
    tournamentId: snapshot.tournament.id,
    snapshot,
    storedAt: Date.now(),
  });
}
