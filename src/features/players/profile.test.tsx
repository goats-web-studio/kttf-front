import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import type { AuthUserView, PlayerSummaryView, PlayerTournamentView } from '@kttf/shared/types';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '@/app/router';
import { ru } from '@/common/i18n/ru';
import { useSessionStore } from '@/features/auth/session-store';
import {
  CLUB,
  EMPTY_RATING_HISTORY,
  HEAD_TO_HEAD,
  pageOf,
  PLAYER_IDS,
  PLAYERS,
  RATING_HISTORY,
  TOURNAMENT_ID,
  USER_WITH_PROFILE,
} from '@/test/fixtures';

import { playerName } from './player-name';

/**
 * Публичный профиль игрока — ТЗ 9.3, от адреса до экрана.
 *
 * Проверяется связка целиком: маршрут, запросы по контракту ТС 7.2 и
 * ADR-048 и путь данных до человека. Отдельно от неё геометрия кривой проверена в
 * `rating-scale.test.ts` — здесь стережётся то, что между ними: адрес
 * запроса, выбор соперника и числа, которые не считает клиент.
 */

const PLAYER_ID = PLAYER_IDS.first;

/** История подменяется на пустую в тесте игрока без турниров. */
let history = RATING_HISTORY;
/** Сервер отвечает «не найдено» — игрока с таким идентификатором нет. */
let missing = false;

const CUP = { id: TOURNAMENT_ID, name: 'Кубок Алматы', startsAt: '2026-03-14T09:00:00.000Z' };

const SUMMARY: PlayerSummaryView = {
  playerId: PLAYER_IDS.first,
  rank: 8,
  rankedPlayers: 120,
  maxRating: '612.40',
  period: 'ALL',
  tournaments: 3,
  wins: 11,
  losses: 4,
  firstTournament: CUP,
  favoriteClub: { id: CLUB.id, name: CLUB.name, tournaments: 3 },
  bestWins: [
    {
      matchId: '00000000-0000-4000-8000-0000000000e1',
      tournament: CUP,
      playedAt: '2026-03-14T12:00:00.000Z',
      opponent: PLAYERS.second,
      opponentRating: '640.00',
      setsFor: 3,
      setsAgainst: 2,
      delta: '9.10',
    },
  ],
  awards: [{ tournament: CUP, place: 1 }],
};

const TOURNAMENT_ROW: PlayerTournamentView = {
  tournament: { ...CUP, status: 'RATED', club: { id: CLUB.id, name: CLUB.name } },
  place: 5,
  placeTo: 8,
  participants: 16,
  ratingBefore: '480.00',
  delta: '12.50',
  ratingAfter: '492.50',
  matches: [
    {
      matchId: '00000000-0000-4000-8000-0000000000e2',
      stageName: 'Плей-офф',
      groupLabel: null,
      roundFromFinal: 0,
      placement: false,
      playedAt: '2026-03-14T12:00:00.000Z',
      opponent: PLAYERS.second,
      setsFor: 3,
      setsAgainst: 1,
      won: true,
      resultType: 'NORMAL',
      delta: '6.00',
    },
  ],
};

let summary = SUMMARY;
let tournaments: PlayerTournamentView[] = [TOURNAMENT_ROW];
/** Всего турниров у игрока: больше страницы — появляется «Показать ещё». */
let total = 1;
let requested: string[] = [];

function reply(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function notFound(): Response {
  return {
    ok: false,
    status: 404,
    text: () =>
      Promise.resolve(
        JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Player not found' } }),
      ),
  } as unknown as Response;
}

function answer(url: string): Response {
  requested.push(url);

  if (missing && url.includes('/players/')) {
    return notFound();
  }

  if (url.includes('/rating-history')) {
    return reply(history);
  }

  if (url.includes('/head-to-head/')) {
    return reply(HEAD_TO_HEAD);
  }

  if (url.includes('/summary')) {
    return reply(summary);
  }

  if (url.includes('/tournaments?')) {
    return reply({ items: tournaments, total, page: url.includes('page=2') ? 2 : 1, limit: 5 });
  }

  if (url.includes('/clubs')) {
    return reply(pageOf([CLUB]));
  }

  if (url.includes('/players/')) {
    return reply(PLAYERS.first);
  }

  throw new Error(`Неожидаемый запрос: ${url}`);
}

function renderProfile(
  id: string = PLAYER_ID,
  user: AuthUserView | null = null,
): { readonly container: HTMLElement } {
  useSessionStore.setState({
    user,
    accessToken: user === null ? null : 'access-token',
    isRestoring: false,
  });
  window.history.pushState({}, '', `/players/${id}`);

  // Повторы выключены: иначе отказ, вызванный опечаткой в адресе запроса,
  // превращается в таймаут теста вместо понятной ошибки.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter({ queryClient, session: user });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  history = RATING_HISTORY;
  missing = false;
  summary = SUMMARY;
  tournaments = [TOURNAMENT_ROW];
  total = 1;
  requested = [];
  vi.stubGlobal('fetch', (input: unknown) => Promise.resolve(answer(String(input))));
});

afterEach(() => {
  vi.unstubAllGlobals();
  useSessionStore.setState({ user: null, accessToken: null, isRestoring: false });
});

describe('карточка игрока', () => {
  it('открывается без входа и показывает рейтинг как он пришёл', async () => {
    renderProfile();

    expect(
      await screen.findByRole('heading', { name: playerName(PLAYERS.first), level: 1 }),
    ).toBeDefined();
    // Строкой, а не числом: сотая доля обязана дожить до экрана (ADR-014).
    expect(screen.getAllByText(PLAYERS.first.rating).length).toBeGreaterThan(0);
    // Максимальный — из сводки сервера.
    expect(await screen.findByText(SUMMARY.maxRating)).toBeDefined();
  });

  it('называет клуб, хотя игрок несёт только его идентификатор', async () => {
    renderProfile();

    expect((await screen.findAllByText(new RegExp(CLUB.name))).length).toBeGreaterThan(0);
  });

  it('свой профиль — с правкой и кабинетом', async () => {
    renderProfile(PLAYER_ID, USER_WITH_PROFILE);

    const edit = await screen.findByRole('link', { name: ru['profile.edit'] });
    // Правка анкеты — в «Настройках», а не в кабинете (ADR-048).
    expect(edit.getAttribute('href')).toBe('/settings/profile');
  });

  it('чужой — без них', async () => {
    renderProfile(PLAYER_ID, null);

    await screen.findByRole('heading', { name: playerName(PLAYERS.first), level: 1 });
    expect(screen.queryByRole('link', { name: ru['profile.edit'] })).toBeNull();
  });
});

describe('ссылка не ведёт к игроку', () => {
  it('оборванный идентификатор объясняется один раз и без запросов', async () => {
    // Так выглядит скопированная наполовину ссылка. Сервер ответил бы отказом
    // проверки схемы, а его общий текст — про заполненные поля, которых на
    // этой странице нет ни одного.
    renderProfile('d07bac4c');

    expect(await screen.findByRole('alert')).toBeDefined();
    expect(screen.getByText(ru['player.notFound'])).toBeDefined();
    expect(requested.filter((url) => url.includes('/players/'))).toHaveLength(0);
  });

  it('несуществующий игрок объясняется тем же сообщением', async () => {
    missing = true;

    renderProfile();

    expect(await screen.findByText(ru['player.notFound'])).toBeDefined();
    expect(screen.queryByText(ru['profile.results.title'])).toBeNull();
  });
});

describe('кривая рейтинга', () => {
  it('рисует точку на каждый турнир истории', async () => {
    const { container } = renderProfile();

    await screen.findByRole('heading', { name: ru['profile.rating.title'] });

    // Только точки графика: иконки страницы — тоже svg с кружками.
    expect(container.querySelectorAll('[data-rating-chart] circle')).toHaveLength(
      RATING_HISTORY.points.length,
    );
  });

  it('без обсчитанных турниров показывает строку, а не пустой холст', async () => {
    history = EMPTY_RATING_HISTORY;

    const { container } = renderProfile();

    expect(await screen.findByText(ru['player.history.empty'])).toBeDefined();
    expect(container.querySelector('[data-rating-chart]')).toBeNull();
  });
});

describe('общая статистика', () => {
  it('место, игры и частый клуб — как посчитал сервер', async () => {
    renderProfile();

    expect(await screen.findByText(ru['profile.stats.rank'])).toBeDefined();
    expect(screen.getByText(`${String(SUMMARY.wins)} — ${String(SUMMARY.losses)}`)).toBeDefined();
    expect(screen.getByText(/из 120/)).toBeDefined();
  });

  it('период уходит запросом, а не режется на клиенте', async () => {
    renderProfile();

    const stats = await screen.findByRole('radiogroup', { name: ru['profile.stats.period'] });
    fireEvent.click(within(stats).getByRole('radio', { name: ru['profile.period.YEAR'] }));

    await waitFor(() => {
      expect(requested.some((url) => url.includes('/summary?period=YEAR'))).toBe(true);
    });
  });

  it('награды — медалями', async () => {
    renderProfile();

    expect(await screen.findByText(ru['profile.awards.title'])).toBeDefined();
  });

  it('без призовых мест блока наград нет', async () => {
    summary = { ...SUMMARY, awards: [] };

    renderProfile();

    await screen.findByText(ru['profile.stats.rank']);
    expect(screen.queryByText(ru['profile.awards.title'])).toBeNull();
  });
});

describe('результаты по турнирам', () => {
  it('место диапазоном, круг сетки словами, изменение рейтинга', async () => {
    renderProfile();

    expect(await screen.findByText('5–8')).toBeDefined();
    expect(screen.getByText(`${ru['results.bracket.final']} · Плей-офф`)).toBeDefined();
    expect(screen.getByText('+12.50')).toBeDefined();
  });

  it('у идущего турнира места нет — так и написано', async () => {
    tournaments = [
      {
        ...TOURNAMENT_ROW,
        tournament: { ...TOURNAMENT_ROW.tournament, status: 'RUNNING' },
        place: null,
        placeTo: null,
      },
    ];

    renderProfile();

    expect(await screen.findByText(ru['profile.results.running'])).toBeDefined();
  });

  it('«Показать ещё» подгружает следующую страницу', async () => {
    total = 6;

    renderProfile();

    fireEvent.click(await screen.findByRole('button', { name: ru['profile.results.more'] }));

    await waitFor(() => {
      expect(requested.some((url) => url.includes('/tournaments?page=2'))).toBe(true);
    });
  });
});

describe('личный счёт', () => {
  it('запрашивается по выбранному сопернику и показывает счёт сервера', async () => {
    renderProfile();

    const [opponent] = await screen.findAllByRole('button', {
      name: playerName(PLAYERS.second),
    });
    if (opponent === undefined) throw new Error('нет соперника');

    fireEvent.click(opponent);

    // Победы и сеты считает сервер. Ждём именно счёт, а не заголовок:
    // заголовок появляется раньше ответа.
    expect(
      await screen.findByText(`${String(HEAD_TO_HEAD.wins)} : ${String(HEAD_TO_HEAD.losses)}`),
    ).toBeDefined();
    expect(
      requested.some((url) =>
        url.includes(`/players/${PLAYER_ID}/head-to-head/${PLAYER_IDS.second}`),
      ),
    ).toBe(true);
  });

  it('до выбора соперника не запрашивается вовсе', async () => {
    renderProfile();

    await screen.findByText(ru['profile.results.title']);

    expect(requested.some((url) => url.includes('/head-to-head/'))).toBe(false);
  });
});
