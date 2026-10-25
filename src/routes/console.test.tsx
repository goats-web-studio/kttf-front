import type { AuthUserView, TournamentSnapshotView } from '@kttf/shared/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '@/app/router';
import { fill } from '@/common/i18n';
import { ru } from '@/common/i18n/ru';
import { db } from '@/features/console/db';
import { pending } from '@/features/console/outbox';
import { CONSOLE_SNAPSHOT, PLAYERS, RESULTS, TOURNAMENT, TOURNAMENT_ID } from '@/test/fixtures';

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
  login: null,
  email: null,
  locale: 'ru',
  telegramId: null,
  createdAt: '2026-08-30T00:00:00.000Z',
  playerId: null,
  clubRoles: [],
  isAdmin: false,
  coach: null,
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

  if (url.endsWith('/results')) {
    return Promise.resolve(reply(RESULTS));
  }

  if (url.endsWith('/finish')) {
    return Promise.resolve(reply({ ...TOURNAMENT, status: 'RATED' }));
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
  it('показывает столы и очередь', async () => {
    renderConsole();

    expect(await screen.findByText(ru['console.tables.title'])).toBeDefined();
    // Первый в очереди отмечен как ждущий дольше всех — ТЗ 6.1.
    // Подсказки — одной строкой через точку, поэтому ищется вхождение.
    expect(await screen.findByText(new RegExp(ru['console.hint.waiting']))).toBeDefined();
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

    // Действие первое: коснуться стола, за которым идёт встреча.
    const card = await screen.findByRole('button', {
      name: new RegExp(PLAYERS.first.lastName),
    });

    fireEvent.click(card);

    // Действие второе: нажать счёт. Больше между ними ничего нет — ТЗ 6.3.
    fireEvent.click(await screen.findByRole('button', { name: '3:1' }));

    // Ответ сервера не придёт никогда, а счёт обязан быть на экране:
    // подтверждение внизу и стол, ждущий следующую пару.
    expect(
      await screen.findByText(fill(ru['console.toast.recorded'], { score: '3:1' })),
    ).toBeDefined();
    // Стол со введённым счётом свободен, а сыгранная пара видна подписью.
    expect(screen.getByText(ru['console.table.justPlayed'])).toBeDefined();
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
    expect(await screen.findByText(ru['console.tables.title'])).toBeDefined();
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

    expect(
      await screen.findByRole('heading', { name: ru['console.standings.title'] }),
    ).toBeDefined();
    expect(screen.queryByText(ru['console.tie.title'])).toBeNull();
  });

  it('спрашивает, когда сыграна последняя встреча группы', async () => {
    snapshot = withTie(true);

    renderConsole();

    // Сверху предупреждение, ниже на той же странице — сама панель равенства.
    expect(await screen.findByText(ru['console.tie.alert'])).toBeDefined();
    expect(screen.getByText(ru['console.tie.title'])).toBeDefined();
  });
});

describe('сетка плей-офф', () => {
  /** Снимок с плей-офф из одной сыгранной встречи, вне столов. */
  function withBracket(): TournamentSnapshotView {
    const stage = CONSOLE_SNAPSHOT.stages[0];
    const match = stage?.matches[0];
    if (stage === undefined || match === undefined) throw new Error('фикстура без встречи');

    const knockoutId = '00000000-0000-4000-8000-0000000000f1';

    return {
      ...CONSOLE_SNAPSHOT,
      stages: [
        ...CONSOLE_SNAPSHOT.stages,
        {
          ...stage,
          id: knockoutId,
          type: 'KNOCKOUT',
          name: 'Плей-офф',
          groups: [],
          matches: [
            {
              ...match,
              id: '00000000-0000-4000-8000-0000000000f2',
              stageId: knockoutId,
              groupId: null,
              bracketRound: 1,
              bracketSlot: 0,
              sourceA: null,
              sourceB: null,
              status: 'FINISHED',
              tableNumber: null,
              setsA: 3,
              setsB: 1,
            },
          ],
        },
      ],
    };
  }

  it('без плей-офф вкладки «Сетка» нет', async () => {
    renderConsole();

    expect(await screen.findByRole('tab', { name: ru['console.standings.title'] })).toBeDefined();
    expect(screen.queryByRole('tab', { name: ru['console.bracket.title'] })).toBeNull();
  });

  it('касание встречи в сетке открывает её окно', async () => {
    snapshot = withBracket();

    renderConsole();

    fireEvent.click(await screen.findByRole('tab', { name: ru['console.bracket.title'] }));
    fireEvent.click(
      await screen.findByRole('button', { name: new RegExp(`${PLAYERS.first.lastName}.*3`) }),
    );

    // Встреча сыграна — в окне исправление результата, как из списка сыгранных.
    expect(
      await screen.findByRole('button', { name: ru['console.dialog.editResult'] }),
    ).toBeDefined();
  });
});

/** Последняя операция в очереди на диске — то, что судья только что сделал. */
async function lastQueued(count: number): Promise<unknown> {
  await waitFor(async () => {
    expect(await pending(TOURNAMENT_ID)).toHaveLength(count);
  });

  return (await pending(TOURNAMENT_ID)).at(-1)?.operation;
}

describe('действия в окнах', () => {
  it('свободный стол зовёт пару из очереди', async () => {
    renderConsole();

    fireEvent.click(
      await screen.findByRole('button', { name: new RegExp(ru['console.table.call']) }),
    );
    // Окно стола предлагает очередь: единственная ждущая пара — третий с четвёртым.
    fireEvent.click(
      await screen.findByRole('button', { name: new RegExp(PLAYERS.third.lastName) }),
    );

    expect(await lastQueued(1)).toMatchObject({
      type: 'MATCH_ASSIGN',
      payload: { tableNumber: 2 },
    });
  });

  it('встреча из очереди ставится на выбранный стол', async () => {
    renderConsole();

    fireEvent.click(
      await screen.findByRole('button', { name: new RegExp(PLAYERS.third.lastName) }),
    );
    fireEvent.click(await screen.findByRole('button', { name: `${ru['console.table.number']} 2` }));

    expect(await lastQueued(1)).toMatchObject({
      type: 'MATCH_ASSIGN',
      payload: { tableNumber: 2 },
    });
  });

  it('стол, занятый идущей встречей, выбрать нельзя', async () => {
    renderConsole();

    fireEvent.click(
      await screen.findByRole('button', { name: new RegExp(PLAYERS.third.lastName) }),
    );

    const busy = await screen.findByRole('button', { name: `${ru['console.table.number']} 1` });

    expect((busy as HTMLButtonElement).disabled).toBe(true);
  });

  it('идущую встречу можно перенести на другой стол', async () => {
    renderConsole();

    fireEvent.click(
      await screen.findByRole('button', { name: new RegExp(PLAYERS.first.lastName) }),
    );
    fireEvent.click(await screen.findByRole('button', { name: ru['console.dialog.moveTable'] }));
    fireEvent.click(await screen.findByRole('button', { name: `${ru['console.table.number']} 2` }));

    expect(await lastQueued(1)).toMatchObject({
      type: 'MATCH_ASSIGN',
      payload: { tableNumber: 2 },
    });
  });

  it('назначение отменяется из подтверждения', async () => {
    renderConsole();

    fireEvent.click(await screen.findByRole('button', { name: `${ru['console.queue.assign']} 2` }));
    fireEvent.click(await screen.findByRole('button', { name: ru['console.toast.undo'] }));

    expect(await lastQueued(2)).toMatchObject({ type: 'MATCH_CANCEL' });
  });

  it('исправление сыгранной встречи уходит правкой, а не новым результатом', async () => {
    renderConsole();

    fireEvent.click(
      await screen.findByRole('button', { name: new RegExp(PLAYERS.first.lastName) }),
    );
    fireEvent.click(await screen.findByRole('button', { name: '3:1' }));
    await lastQueued(1);

    // Сыгранные — своя вкладка под столами и очередью.
    fireEvent.click(screen.getByRole('tab', { name: ru['console.played.title'] }));

    const played = screen
      .getByRole('heading', { name: ru['console.played.title'] })
      .closest('section');
    if (played === null) throw new Error('нет блока сыгранных');
    fireEvent.click(
      await within(played).findByRole('button', { name: new RegExp(PLAYERS.first.lastName) }),
    );
    fireEvent.click(await screen.findByRole('button', { name: ru['console.dialog.editResult'] }));
    fireEvent.click(await screen.findByRole('button', { name: '3:2' }));

    // Правка пишется в журнал отдельным типом — ТЗ 6.3.
    expect(await lastQueued(2)).toMatchObject({
      type: 'MATCH_EDIT',
      payload: { setsA: 3, setsB: 2 },
    });
  });
});

describe('завершение турнира', () => {
  const winner = `${PLAYERS.first.lastName} ${PLAYERS.first.firstName}`;

  it('сначала показывает итоговые места, закрывает турнир только подтверждение', async () => {
    // Всё сыграно, турнир ещё идёт — внизу появляется кнопка завершения.
    // Несыгранная встреча снята — турнир доигран.
    snapshot = {
      ...CONSOLE_SNAPSHOT,
      stages: RESULTS.stages.map((stage) => ({
        ...stage,
        matches: stage.matches.map((match) =>
          match.status === 'PENDING' ? { ...match, status: 'CANCELLED' as const } : match,
        ),
      })),
    };
    renderConsole();

    fireEvent.click(await screen.findByRole('button', { name: ru['console.finish'] }));

    const dialog = await screen.findByRole('dialog', { name: ru['console.finish.title'] });
    expect(await within(dialog).findByText(winner)).toBeDefined();
    // Окно открылось, а на сервер завершение ещё не ушло.
    expect(sent.some((url) => url.endsWith('/finish'))).toBe(false);

    fireEvent.click(within(dialog).getByRole('button', { name: ru['console.finish.confirm'] }));

    expect(await screen.findByRole('heading', { name: ru['console.done.title'] })).toBeDefined();
    expect(sent.some((url) => url.endsWith('/finish'))).toBe(true);
  });

  it('закрытый турнир — итоги вместо столов, счёт не вводится', async () => {
    snapshot = {
      ...CONSOLE_SNAPSHOT,
      tournament: { ...CONSOLE_SNAPSHOT.tournament, status: 'RATED' },
    };
    renderConsole();

    expect(await screen.findByRole('heading', { name: ru['console.done.title'] })).toBeDefined();
    expect(await screen.findByText(winner)).toBeDefined();
    expect(screen.queryByText(ru['console.hint.tap'])).toBeNull();
    expect(screen.queryByRole('heading', { name: ru['console.tables.title'] })).toBeNull();
    expect(
      screen.getByRole('link', { name: ru['console.done.results'] }).getAttribute('href'),
    ).toBe(`/tournaments/${TOURNAMENT_ID}`);
  });

  it('назад ведёт на страницу турнира, а не в пустой список', async () => {
    renderConsole();

    const back = await screen.findByRole('link', { name: ru['console.back'] });
    expect(back.getAttribute('href')).toBe(`/tournaments/${TOURNAMENT_ID}`);
  });
});

describe('изменение рейтинга в таблице — ADR-077', () => {
  it('у сыгравших — прогноз дельты, у не игравших — прочерк', async () => {
    const stage = CONSOLE_SNAPSHOT.stages[0];
    const first = stage?.matches[0];
    if (stage === undefined || first === undefined) throw new Error('фикстура без встречи');

    snapshot = {
      ...CONSOLE_SNAPSHOT,
      stages: [
        {
          ...stage,
          matches: stage.matches.map((match) =>
            match.id === first.id
              ? // Слабый обыграл сильного: при разрыве больше 100 победа фаворита дельты не даёт.
                { ...match, status: 'FINISHED', setsA: 1, setsB: 3, resultType: 'NORMAL' }
              : match,
          ),
        },
        ...CONSOLE_SNAPSHOT.stages.slice(1),
      ],
    };

    renderConsole();

    await screen.findByRole('heading', { name: ru['console.standings.title'] });
    const cells = [...document.querySelectorAll('[data-delta]')].map((cell) => cell.textContent);

    // Проигравший сильный — в минусе; кто ещё не играл рейтинговых — прочерк.
    expect(cells).toContain('-7.00');
    expect(cells).toContain('—');
  });
});
