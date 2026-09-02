import type { AuthUserView, TournamentSnapshotView } from '@kttf/shared/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '@/app/router';
import { ru } from '@/common/i18n/ru';
import { db } from '@/features/console/db';
import { pending } from '@/features/console/outbox';
import { CONSOLE_SNAPSHOT, PLAYERS, TOURNAMENT_ID } from '@/test/fixtures';

/**
 * Консоль судьи — ТЗ 6, офлайн-режим ТЗ 6.4.
 *
 * Главное, что здесь проверяется, — запрет №1 брифа: ввод счёта не ждёт сети.
 * Сервер в тесте не отвечает вовсе, и счёт обязан оказаться на экране, а
 * операция — на диске.
 */

const SIGNED_IN: AuthUserView = {
  id: '00000000-0000-4000-8000-000000000001',
  phone: '+77011234567',
  email: null,
  locale: 'ru',
  createdAt: '2026-08-30T00:00:00.000Z',
  playerId: null,
  clubRoles: [],
};

/** Запросы, ушедшие на сервер: по ним видно, что действие правда отправлено. */
let sent: string[] = [];
/** Снимок, который отдаёт сервер. Тесты равенства меняют его под себя. */
let snapshot: TournamentSnapshotView = CONSOLE_SNAPSHOT;

function reply(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function answer(url: string): Promise<Response> {
  if (url.endsWith('/snapshot')) {
    return Promise.resolve(reply(snapshot));
  }

  // Сервер молчит. Для консоли это обычное состояние зала, а не сбой:
  // именно поэтому ввод счёта не имеет права его дожидаться.
  return new Promise<Response>(() => undefined);
}

function renderConsole(): void {
  window.history.pushState({}, '', `/console/${TOURNAMENT_ID}`);

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter({ queryClient, session: SIGNED_IN });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  sent = [];
  snapshot = CONSOLE_SNAPSHOT;
  await db.snapshots.clear();
  await db.outbox.clear();
  vi.stubGlobal('fetch', (input: unknown) => {
    const url = String(input);

    sent.push(url);

    return answer(url);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('экран проведения', () => {
  it('показывает идущую встречу и очередь', async () => {
    renderConsole();

    expect(await screen.findByText(ru['console.playing.title'])).toBeDefined();
    // Первый в очереди отмечен как ждущий дольше всех — ТЗ 6.1.
    expect(await screen.findByText(ru['console.hint.waiting'])).toBeDefined();
  });

  it('предлагает свободный стол, а не занятый', async () => {
    renderConsole();

    // Стол 1 занят идущей встречей, значит предлагается второй.
    expect(
      await screen.findByRole('button', { name: `${ru['console.queue.assign']} 2` }),
    ).toBeDefined();
  });

  it('закрывает встречу двумя действиями и не ждёт сервера', async () => {
    renderConsole();

    // Действие первое: раскрыть карточку идущей встречи.
    const card = await screen.findByRole('button', {
      name: new RegExp(PLAYERS.first.lastName),
    });

    fireEvent.click(card);

    // Действие второе: нажать счёт. Больше между ними ничего нет — ТЗ 6.3.
    fireEvent.click(await screen.findByRole('button', { name: '3:1' }));

    // Ответ сервера не придёт никогда, а счёт обязан быть на экране.
    expect(await screen.findByText('3:1')).toBeDefined();
  });

  it('введённое ложится в очередь на диск — ТЗ 6.4', async () => {
    renderConsole();

    fireEvent.click(
      await screen.findByRole('button', { name: new RegExp(PLAYERS.first.lastName) }),
    );
    fireEvent.click(await screen.findByRole('button', { name: '3:1' }));

    // Список в памяти не пережил бы перезагрузку вкладки посреди турнира.
    await waitFor(async () => {
      expect(await pending(TOURNAMENT_ID)).toHaveLength(1);
    });

    const [queued] = await pending(TOURNAMENT_ID);

    expect(queued?.operation).toMatchObject({
      type: 'MATCH_RESULT',
      payload: { setsA: 3, setsB: 1 },
    });
  });

  it('состояние связи и длина очереди видны постоянно — ТС 6.4', async () => {
    renderConsole();

    expect(await screen.findByRole('status')).toBeDefined();
    expect(screen.getByRole('button', { name: ru['console.sync.now'] })).toBeDefined();

    fireEvent.click(
      await screen.findByRole('button', { name: new RegExp(PLAYERS.first.lastName) }),
    );
    fireEvent.click(await screen.findByRole('button', { name: '3:1' }));

    // Судья видит, что счёт ещё не уехал, до конца турнира, а не после него.
    expect(await screen.findByText(ru['console.sync.queued'], { exact: false })).toBeDefined();
  });

  it('снимок берётся с диска, когда сети нет вовсе', async () => {
    await db.snapshots.put({
      tournamentId: TOURNAMENT_ID,
      snapshot: CONSOLE_SNAPSHOT,
      storedAt: Date.now(),
    });

    // Сеть отсутствует целиком: ни один запрос не отвечает.
    vi.stubGlobal('fetch', () => new Promise<Response>(() => undefined));

    renderConsole();

    // Судья открыл консоль в зале без интернета и обязан увидеть турнир.
    expect(await screen.findByText(ru['console.playing.title'])).toBeDefined();
    expect(sent).toHaveLength(0);
  });
});

describe('разрешение равенства', () => {
  /** Снимок, у которого равенство есть, а встречи ещё идут. */
  function withTie(played: boolean): TournamentSnapshotView {
    const stage = CONSOLE_SNAPSHOT.stages[0];
    if (stage === undefined) throw new Error('фикстура без этапа');

    return {
      ...CONSOLE_SNAPSHOT,
      stages: [
        {
          ...stage,
          matches: stage.matches.map((match) =>
            played ? { ...match, status: 'FINISHED' } : match,
          ),
        },
      ],
      standings: {
        ...CONSOLE_SNAPSHOT.standings,
        groups: CONSOLE_SNAPSHOT.standings.groups.map((group) => ({
          ...group,
          stageId: stage.id,
          // Круговая: единственная группа — сам этап, отдельной группы нет.
          groupId: null,
        })),
      },
    };
  }

  it('не спрашивает судью, пока группа не доиграна', async () => {
    // В начале турнира по нулям стоят все, и равенство есть у всех со всеми.
    // Решение, принятое в этот момент, попало бы в журнал (ADR-008).
    snapshot = withTie(false);

    renderConsole();

    expect(await screen.findByText(ru['console.standings.title'])).toBeDefined();
    expect(screen.queryByText(ru['console.tie.title'])).toBeNull();
  });

  it('спрашивает, когда сыграна последняя встреча группы', async () => {
    snapshot = withTie(true);

    renderConsole();

    expect(await screen.findByText(ru['console.tie.title'])).toBeDefined();
  });
});
