import type { AuthUserView, DrawResult, TournamentView } from '@kttf/shared/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '@/app/router';
import { ru } from '@/common/i18n/ru';
import { useSessionStore } from '@/features/auth/session-store';
import { playerName } from '@/features/players/player-name';
import {
  CLUB,
  pageOf,
  PLAYERS,
  PLAYER_IDS,
  REGISTRATIONS,
  RESULTS,
  TOURNAMENT,
  TOURNAMENT_ID,
  USER_WITH_PROFILE,
  USER_WITHOUT_PROFILE,
} from '@/test/fixtures';

/**
 * Проведение турнира организатором — ТЗ 4.1.
 *
 * Проверяется путь, без которого заведённый в интерфейсе турнир остаётся
 * черновиком навсегда: публикация, открытие и закрытие записи, жеребьёвка,
 * старт. Таблица переходов сервера здесь не переписывается — она проверена
 * в `lifecycle.test.ts` со стороны кнопок и на сервере со стороны правил.
 */

interface Sent {
  readonly url: string;
  readonly method: string;
}

let sent: Sent[] = [];
let tournament: TournamentView = { ...TOURNAMENT, status: 'DRAFT', startedAt: null };
/** Ответ жеребьёвки: одноклубники, которых не удалось развести (ADR-011). */
let draw: DrawResult = {
  tournamentId: TOURNAMENT_ID,
  stages: RESULTS.stages,
  clubCollisions: [],
};
/** Отказ сервера на действие. `null` — успех. */
let refusal: string | null = null;

function reply(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function answer(url: string, init: RequestInit | undefined): Response {
  const method = init?.method ?? 'GET';

  if (method !== 'GET') {
    sent.push({ url, method });

    if (refusal !== null) {
      return {
        ok: false,
        status: 400,
        text: () =>
          Promise.resolve(JSON.stringify({ error: { code: refusal, message: 'refused' } })),
      } as unknown as Response;
    }

    return reply(url.endsWith('/draw') ? draw : tournament);
  }

  if (url.includes('/registrations')) return reply(REGISTRATIONS);
  if (/\/tournaments\/[^/]+\/results$/.test(url)) return reply({ ...RESULTS, tournament });
  if (url.includes('/clubs')) return reply(pageOf([CLUB]));
  if (/\/players\/[^/?]+$/.test(url)) return reply(PLAYERS.first);
  if (url.includes('/players')) return reply(pageOf([PLAYERS.second]));

  throw new Error(`Неожидаемый запрос: ${url}`);
}

function renderTournament(user: AuthUserView | null): void {
  useSessionStore.setState({
    user,
    accessToken: user === null ? null : 'token',
    isRestoring: false,
  });
  window.history.pushState({}, '', `/tournaments/${TOURNAMENT_ID}`);

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter({ queryClient, session: user });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  sent = [];
  tournament = { ...TOURNAMENT, status: 'DRAFT', startedAt: null };
  draw = { tournamentId: TOURNAMENT_ID, stages: RESULTS.stages, clubCollisions: [] };
  refusal = null;
  vi.stubGlobal('fetch', (input: unknown, init: RequestInit | undefined) =>
    Promise.resolve(answer(String(input), init)),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  useSessionStore.setState({ user: null, accessToken: null, isRestoring: false });
});

describe('панель проведения', () => {
  it('организатору показывает шаг, который ведёт турнир вперёд', async () => {
    renderTournament(USER_WITH_PROFILE);

    expect(await screen.findByText(ru['lifecycle.title'])).toBeDefined();
    expect(screen.getByText(ru['lifecycle.hint.DRAFT'])).toBeDefined();
  });

  it('никому, кроме организатора клуба-хозяина, не показывается', async () => {
    renderTournament(USER_WITHOUT_PROFILE);

    // Состав дожидаемся, чтобы страница успела отрисоваться целиком:
    // иначе панели нет просто потому, что данных ещё нет.
    expect(await screen.findByText(ru['participants.title'])).toBeDefined();
    expect(screen.queryByText(ru['lifecycle.title'])).toBeNull();
  });

  it('публикует черновик', async () => {
    renderTournament(USER_WITH_PROFILE);

    fireEvent.click(await screen.findByRole('button', { name: ru['lifecycle.publish'] }));

    await waitFor(() => {
      expect(sent.some((request) => request.url.endsWith('/publish'))).toBe(true);
    });
    expect(sent[0]?.method).toBe('POST');
  });

  it('перед стартом предлагает и жеребьёвку, и начало турнира', async () => {
    tournament = { ...tournament, status: 'REG_CLOSED' };

    renderTournament(USER_WITH_PROFILE);

    expect(await screen.findByRole('button', { name: ru['lifecycle.draw'] })).toBeDefined();
    expect(screen.getByRole('button', { name: ru['lifecycle.start'] })).toBeDefined();
  });

  it('после жеребьёвки называет несведённых одноклубников поимённо', async () => {
    tournament = { ...tournament, status: 'REG_CLOSED' };
    draw = {
      ...draw,
      clubCollisions: [
        { club: CLUB.id, group: 'Группа A', participants: [PLAYER_IDS.first, PLAYER_IDS.third] },
      ],
    };

    renderTournament(USER_WITH_PROFILE);

    fireEvent.click(await screen.findByRole('button', { name: ru['lifecycle.draw'] }));

    // Организатор обязан увидеть их здесь, а не обнаружить в зале (ADR-011).
    const list = await screen.findByRole('list', { name: ru['draw.collisions'] });

    expect(within(list).getByText(new RegExp(playerName(PLAYERS.first)))).toBeDefined();
  });

  it('отменяет турнир только после подтверждения', async () => {
    renderTournament(USER_WITH_PROFILE);

    fireEvent.click(await screen.findByRole('button', { name: ru['lifecycle.cancel'] }));

    // Первое нажатие ничего не отправляет: обратного перехода у отмены нет.
    expect(sent).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: ru['lifecycle.cancelYes'] }));

    await waitFor(() => {
      expect(sent.some((request) => request.url.endsWith('/cancel'))).toBe(true);
    });
  });

  it('отказ сервера показывает причиной, а не молчанием', async () => {
    tournament = { ...tournament, status: 'REG_CLOSED' };
    refusal = 'VALIDATION_FAILED';

    renderTournament(USER_WITH_PROFILE);

    fireEvent.click(await screen.findByRole('button', { name: ru['lifecycle.start'] }));

    expect(await screen.findByRole('alert')).toBeDefined();
  });
});

describe('расстановка до старта', () => {
  it('организатор видит состав групп, пока турнир не начат', async () => {
    tournament = { ...tournament, status: 'REG_CLOSED' };

    renderTournament(USER_WITH_PROFILE);

    expect(await screen.findByText(ru['draw.title'])).toBeDefined();
    // Состав группы — тот же, что придёт в консоль судьи.
    expect(screen.getByText('Группа A')).toBeDefined();
  });

  it('у начатого турнира не показывается: менять расстановку уже нечем', async () => {
    tournament = { ...tournament, status: 'RUNNING', startedAt: '2026-09-05T09:00:00.000Z' };

    renderTournament(USER_WITH_PROFILE);

    expect(await screen.findByText(ru['lifecycle.title'])).toBeDefined();
    expect(screen.queryByText(ru['draw.title'])).toBeNull();
  });
});
