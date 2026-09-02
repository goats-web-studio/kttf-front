import type { SyncResult } from '@kttf/shared/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CONSOLE_SNAPSHOT, PLAYING_MATCH_ID, QUEUED_MATCH_ID, TOURNAMENT_ID } from '@/test/fixtures';

import { db } from './db';
import { applyPending } from './offline-state';
import { enqueue, newOperation, pending, rejectedItems, toOperations } from './outbox';
import { loadState, syncTournament } from './sync';

/**
 * Офлайн-режим консоли — ТЗ 6.4, ТС 6.
 *
 * Проверяется то, ради чего он делается: судья в зале без сети продолжает
 * работать, введённое ложится на диск и уходит на сервер, когда связь
 * появится. Ничего из этого не должно зависеть от того, ответил ли сервер.
 */

function reply(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

/** Ответ синхронизации: всё принято, снимок вернулся с выросшей версией. */
function accepted(clientOpIds: readonly string[]): SyncResult {
  return {
    serverVersion: CONSOLE_SNAPSHOT.version + clientOpIds.length,
    applied: [...clientOpIds],
    rejected: [],
    snapshot: { ...CONSOLE_SNAPSHOT, version: CONSOLE_SNAPSHOT.version + clientOpIds.length },
  };
}

let sent: { url: string; body: unknown }[];

function stubFetch(answer: (url: string, body: unknown) => Response): void {
  vi.stubGlobal('fetch', (input: unknown, init?: { body?: string }) => {
    const url = String(input);
    const body = init?.body === undefined ? undefined : (JSON.parse(init.body) as unknown);

    sent.push({ url, body });

    return Promise.resolve(answer(url, body));
  });
}

beforeEach(async () => {
  sent = [];
  await db.snapshots.clear();
  await db.outbox.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('снимок турнира', () => {
  it('первый раз берётся из сети и ложится на диск', async () => {
    stubFetch(() => reply(CONSOLE_SNAPSHOT));

    const state = await loadState(TOURNAMENT_ID);

    expect(state.version).toBe(CONSOLE_SNAPSHOT.version);
    expect(sent[0]?.url).toContain(`/tournaments/${TOURNAMENT_ID}/snapshot`);
    expect(await db.snapshots.get(TOURNAMENT_ID)).toBeDefined();
  });

  it('в следующий раз читается с диска, даже когда сети нет', async () => {
    stubFetch(() => reply(CONSOLE_SNAPSHOT));
    await loadState(TOURNAMENT_ID);

    // Сервер молчит: судья открыл консоль в зале без интернета.
    vi.stubGlobal('fetch', () => new Promise<Response>(() => undefined));

    const state = await loadState(TOURNAMENT_ID);

    expect(state.tournament.id).toBe(TOURNAMENT_ID);
  });

  it('неотправленное накладывается поверх снимка', async () => {
    stubFetch(() => reply(CONSOLE_SNAPSHOT));
    await loadState(TOURNAMENT_ID);

    await enqueue(
      TOURNAMENT_ID,
      newOperation({
        type: 'MATCH_RESULT',
        matchId: PLAYING_MATCH_ID,
        payload: { setsA: 3, setsB: 1, resultType: 'NORMAL' },
      }),
    );

    const state = await loadState(TOURNAMENT_ID);
    const match = state.stages.flatMap((stage) => stage.matches).find((m) => m.id === PLAYING_MATCH_ID);

    // Иначе перезагрузка вкладки посреди турнира стёрла бы с экрана счёт,
    // который сервер ещё не видел.
    expect(match).toMatchObject({ setsA: 3, setsB: 1, status: 'FINISHED' });
  });
});

describe('очередь операций', () => {
  it('порядок в очереди — порядок действий судьи', async () => {
    const first = await enqueue(
      TOURNAMENT_ID,
      newOperation({ type: 'MATCH_ASSIGN', matchId: QUEUED_MATCH_ID, payload: { tableNumber: 2 } }),
    );
    const second = await enqueue(
      TOURNAMENT_ID,
      newOperation({ type: 'MATCH_CANCEL', matchId: QUEUED_MATCH_ID }),
    );

    const queued = await pending(TOURNAMENT_ID);

    expect(queued.map((item) => item.clientOpId)).toEqual([first.clientOpId, second.clientOpId]);
    // Сервер применяет строго по seq (ТС 6.3), и номера обязаны расти.
    expect(toOperations(queued)[0]?.seq).toBeLessThan(toOperations(queued)[1]?.seq ?? 0);
  });

  it('операция переживает перезагрузку страницы', async () => {
    await enqueue(
      TOURNAMENT_ID,
      newOperation({
        type: 'MATCH_RESULT',
        matchId: PLAYING_MATCH_ID,
        payload: { setsA: 3, setsB: 0, resultType: 'NORMAL' },
      }),
    );

    // Список в памяти жил до перезагрузки; диск — нет. Ради этого офлайн
    // и делается: судья закрыл вкладку, счёт остался.
    expect(await pending(TOURNAMENT_ID)).toHaveLength(1);
  });
});

describe('синхронизация', () => {
  it('отправляет очередь и принимает снимок сервера', async () => {
    stubFetch((url) => (url.endsWith('/snapshot') ? reply(CONSOLE_SNAPSHOT) : reply(accepted([]))));
    await loadState(TOURNAMENT_ID);

    const item = await enqueue(
      TOURNAMENT_ID,
      newOperation({
        type: 'MATCH_RESULT',
        matchId: PLAYING_MATCH_ID,
        payload: { setsA: 3, setsB: 1, resultType: 'NORMAL' },
      }),
    );

    stubFetch(() => reply(accepted([item.clientOpId])));

    const outcome = await syncTournament(TOURNAMENT_ID);

    expect(outcome.queued).toBe(0);
    expect(outcome.snapshot.version).toBe(CONSOLE_SNAPSHOT.version + 1);
    expect(await pending(TOURNAMENT_ID)).toHaveLength(0);
  });

  it('отправляет версию снимка, против которого работал судья', async () => {
    stubFetch(() => reply(CONSOLE_SNAPSHOT));
    await loadState(TOURNAMENT_ID);

    stubFetch(() => reply(accepted([])));
    await syncTournament(TOURNAMENT_ID);

    // Первым ушёл запрос снимка, вторым — отправка очереди.
    expect(sent.at(-1)?.body).toMatchObject({ lastServerVersion: CONSOLE_SNAPSHOT.version });
  });

  it('пустая очередь всё равно отправляется: снимок мог измениться', async () => {
    stubFetch(() => reply(accepted([])));

    await syncTournament(TOURNAMENT_ID);

    expect(sent).toHaveLength(1);
  });

  it('отказ сети оставляет очередь на диске', async () => {
    await enqueue(
      TOURNAMENT_ID,
      newOperation({ type: 'MATCH_CANCEL', matchId: PLAYING_MATCH_ID }),
    );

    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')));

    await expect(syncTournament(TOURNAMENT_ID)).rejects.toBeDefined();

    // Молчаливая потеря очереди — то, ради чего запрет №1 и написан.
    expect(await pending(TOURNAMENT_ID)).toHaveLength(1);
  });

  it('отклонённая операция помечается и больше не отправляется', async () => {
    const item = await enqueue(
      TOURNAMENT_ID,
      newOperation({
        type: 'MATCH_RESULT',
        matchId: PLAYING_MATCH_ID,
        payload: { setsA: 3, setsB: 1, resultType: 'NORMAL' },
      }),
    );

    stubFetch(() =>
      reply({
        serverVersion: CONSOLE_SNAPSHOT.version,
        applied: [],
        rejected: [{ clientOpId: item.clientOpId, reason: 'MATCH_ALREADY_FINISHED' }],
        snapshot: CONSOLE_SNAPSHOT,
      }),
    );

    const outcome = await syncTournament(TOURNAMENT_ID);

    expect(outcome.rejected).toHaveLength(1);
    expect(await pending(TOURNAMENT_ID)).toHaveLength(0);
    // Повтор дал бы тот же отказ вечно, поэтому операция остаётся видимой
    // судье, но из очереди на отправку уходит.
    expect(await rejectedItems(TOURNAMENT_ID)).toHaveLength(1);
  });

  it('счёт, введённый во время отправки, не стирается ответом сервера', async () => {
    stubFetch(() => reply(CONSOLE_SNAPSHOT));
    await loadState(TOURNAMENT_ID);

    const late = newOperation({
      type: 'MATCH_RESULT',
      matchId: QUEUED_MATCH_ID,
      payload: { setsA: 3, setsB: 2, resultType: 'NORMAL' },
    });

    // Ответ сервера приходит уже после того, как судья ввёл ещё один счёт.
    vi.stubGlobal('fetch', async () => {
      await enqueue(TOURNAMENT_ID, late);

      return reply(accepted([]));
    });

    const outcome = await syncTournament(TOURNAMENT_ID);
    const match = outcome.snapshot.stages
      .flatMap((stage) => stage.matches)
      .find((current) => current.id === QUEUED_MATCH_ID);

    expect(match).toMatchObject({ setsA: 3, setsB: 2 });
    expect(outcome.queued).toBe(1);
  });
});

describe('наложение очереди на снимок', () => {
  it('решение по равенству оптимистично не применяется', async () => {
    // Места считает движок на сервере: угадать их на клиенте — второй расчёт
    // таблицы (запрет №2 брифа).
    const operation = newOperation({
      type: 'TIE_DECISION',
      payload: { groupId: CONSOLE_SNAPSHOT.standings.groups[0]?.groupId ?? '', orderedIds: [] },
    });

    const item = await enqueue(TOURNAMENT_ID, operation);

    expect(applyPending(CONSOLE_SNAPSHOT, [item])).toEqual(CONSOLE_SNAPSHOT);
  });
});
