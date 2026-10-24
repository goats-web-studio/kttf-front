import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import type {
  AuthUserView,
  PlayerBestWinsView,
  PlayerProfileView,
  PlayerSummaryView,
  PlayerTournamentView,
} from '@kttf/shared/types';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '@/app/router';
import { formatRating } from '@/common/i18n';
import { ru } from '@/common/i18n/ru';
import { useSessionStore } from '@/features/auth/session-store';
import {
  CLUB,
  EMPTY_RATING_HISTORY,
  HEAD_TO_HEAD,
  pageOf,
  PLAYER_IDS,
  PLAYER_PROFILE,
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

const CLUB_REF = { id: CLUB.id, name: CLUB.name };
const OTHER_CLUB = { id: '00000000-0000-4000-8000-0000000000c9', name: 'Спин-Астана' };
const AUTUMN = {
  id: '00000000-0000-4000-8000-0000000000a7',
  name: 'Осенний кубок',
  startsAt: '2025-10-04T09:00:00.000Z',
};

const SUMMARY: PlayerSummaryView = {
  playerId: PLAYER_IDS.first,
  rank: 8,
  rankedPlayers: 120,
  maxRating: '612.40',
  maxRatingAt: '2026-03-14T09:00:00.000Z',
  period: 'ALL',
  tournaments: 3,
  wins: 11,
  losses: 4,
  firstTournament: CUP,
  favoriteClub: { ...CLUB_REF, tournaments: 3 },
  awards: [
    { tournament: CUP, club: CLUB_REF, place: 1 },
    { tournament: AUTUMN, club: OTHER_CLUB, place: 3 },
  ],
};

const BEST_WINS: PlayerBestWinsView = {
  period: 'ALL',
  items: [
    {
      matchId: '00000000-0000-4000-8000-0000000000e1',
      tournament: CUP,
      startedAt: '2026-03-14T11:41:00.000Z',
      playedAt: '2026-03-14T12:00:00.000Z',
      ratingBefore: '471.30',
      opponent: PLAYERS.second,
      opponentRating: '640.00',
      setsFor: 3,
      setsAgainst: 2,
      delta: '9.10',
      durationMinutes: 19,
    },
  ],
};

/** Полный профиль — с отметкой посещения; у игрока без аккаунта её нет. */
let profile: PlayerProfileView = PLAYER_PROFILE;

const TOURNAMENT_ROW: PlayerTournamentView = {
  tournament: { ...CUP, status: 'RATED', level: 'REGIONAL', club: CLUB_REF },
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
      startedAt: '2026-03-14T11:35:00.000Z',
      playedAt: '2026-03-14T12:00:00.000Z',
      opponent: PLAYERS.second,
      opponentRating: '505.20',
      ratingBefore: '486.50',
      setsFor: 3,
      setsAgainst: 1,
      won: true,
      resultType: 'NORMAL',
      delta: '6.00',
      durationMinutes: 25,
    },
    {
      matchId: '00000000-0000-4000-8000-0000000000e3',
      stageName: 'Плей-офф',
      groupLabel: null,
      roundFromFinal: 1,
      placement: false,
      // Внесена без вызова к столу: ни времени, ни длительности.
      startedAt: null,
      playedAt: '2026-03-14T11:00:00.000Z',
      opponent: PLAYERS.third,
      opponentRating: '455.00',
      ratingBefore: '490.00',
      setsFor: 1,
      setsAgainst: 3,
      won: false,
      resultType: 'NORMAL',
      delta: '-3.50',
      durationMinutes: null,
    },
  ],
};

let summary = SUMMARY;
let bestWins = BEST_WINS;
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

  if (url.includes('/best-wins')) {
    return reply(bestWins);
  }

  if (url.includes('/tournaments?')) {
    return reply({ items: tournaments, total, page: url.includes('page=2') ? 2 : 1, limit: 5 });
  }

  if (url.includes('/clubs')) {
    return reply(pageOf([CLUB]));
  }

  if (url.includes('/players/')) {
    return reply(profile);
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
  bestWins = BEST_WINS;
  profile = PLAYER_PROFILE;
  tournaments = [TOURNAMENT_ROW];
  total = 1;
  requested = [];
  vi.stubGlobal('fetch', (input: unknown) => Promise.resolve(answer(String(input))));
});

/** Ширина экрана для `useMediaQuery`: в jsdom `matchMedia` нет, и без неё — телефон. */
function asDesktop(): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('min-width'),
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }));
}

/** Элемент, без которого тест дальше бессмыслен: отсутствие — понятная ошибка. */
function found(root: ParentNode, selector: string): HTMLElement {
  const element = root.querySelector(selector);

  if (!(element instanceof HTMLElement)) {
    throw new Error(`Нет элемента ${selector}`);
  }

  return element;
}

function required<T>(value: T | undefined): T {
  if (value === undefined) {
    throw new Error('Нет ожидаемой строки');
  }

  return value;
}

afterEach(() => {
  vi.unstubAllGlobals();
  useSessionStore.setState({ user: null, accessToken: null, isRestoring: false });
});

describe('карточка игрока', () => {
  it('открывается без входа и показывает рейтинг целым', async () => {
    renderProfile();

    expect(
      await screen.findByRole('heading', { name: playerName(PLAYERS.first), level: 1 }),
    ).toBeDefined();
    // Сотые остаются в журнале, на экране рейтинг целый (ADR-053).
    expect(screen.getAllByText(formatRating(PLAYERS.first.rating)).length).toBeGreaterThan(0);
    // Максимальный — из сводки сервера.
    expect((await screen.findAllByText(formatRating(SUMMARY.maxRating))).length).toBeGreaterThan(0);
  });

  it('рейтинг — со звездой, одним компонентом во всех блоках', async () => {
    renderProfile();

    await screen.findAllByText(formatRating(SUMMARY.maxRating));
    // Шапка профиля, а не сайта: у обеих тег header.
    const header = screen
      .getByRole('heading', { name: playerName(PLAYERS.first), level: 1 })
      .closest('header');

    expect(header?.querySelector('[data-rating-value]')?.textContent).toBe(
      formatRating(PLAYERS.first.rating),
    );
    // Звезда — знак, а не текст: чтецу экрана она не читается.
    expect(header?.querySelector('[data-rating-value] svg')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
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

describe('в сети и последнее посещение', () => {
  it('заходил только что — точка «в сети» у имени и дата посещения', async () => {
    profile = {
      ...PLAYER_PROFILE,
      userId: '00000000-0000-4000-8000-0000000000f1',
      createdAt: '2025-03-12T08:00:00.000Z',
      lastSeenAt: '2025-10-18T09:00:00.000Z',
      online: true,
    };

    renderProfile();

    expect(await screen.findByText(ru['profile.online'])).toBeDefined();
    expect(screen.getByText(/последнее посещение: 18 октября 2025/)).toBeDefined();
  });

  it('давно не заходил — без точки, но с датой', async () => {
    profile = {
      ...PLAYER_PROFILE,
      userId: '00000000-0000-4000-8000-0000000000f1',
      lastSeenAt: '2025-10-18T09:00:00.000Z',
      online: false,
    };

    renderProfile();

    expect(await screen.findByText(/последнее посещение/)).toBeDefined();
    expect(screen.queryByText(ru['profile.online'])).toBeNull();
  });

  it('у игрока без аккаунта статуса нет вовсе', async () => {
    renderProfile();

    await screen.findByRole('heading', { name: playerName(PLAYERS.first), level: 1 });
    expect(screen.queryByText(ru['profile.online'])).toBeNull();
    expect(screen.queryByText(/последнее посещение/)).toBeNull();
  });
});

describe('фото в шапке профиля', () => {
  it('открывается крупно в окне просмотра и закрывается крестиком', async () => {
    profile = { ...PLAYER_PROFILE, photoUrl: '/files/players/photo.webp' };

    renderProfile();

    const name = playerName(PLAYERS.first);
    fireEvent.click(await screen.findByRole('button', { name: `Открыть фото: ${name}` }));

    const dialog = await screen.findByRole('dialog', { name });
    expect(within(dialog).getByRole('img', { name }).getAttribute('src')).toBe(
      '/files/players/photo.webp',
    );

    fireEvent.click(within(dialog).getByRole('button', { name: ru['profile.photo.close'] }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('без фото открывать нечего — кнопки нет, только инициалы', async () => {
    renderProfile();

    await screen.findByRole('heading', { name: playerName(PLAYERS.first), level: 1 });
    expect(screen.queryByRole('button', { name: /Открыть фото/ })).toBeNull();
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

  it('сетка со значениями и датами, заливка под кривой', async () => {
    const { container } = renderProfile();

    await screen.findByRole('heading', { name: ru['profile.rating.title'] });
    const chart = container.querySelector('[data-rating-chart]');

    expect(chart?.querySelectorAll('text').length).toBeGreaterThan(3);
    expect(chart?.querySelector('path[fill^="url("]')).not.toBeNull();
  });

  it('над графиком — максимальный с датой', async () => {
    const { container } = renderProfile();

    await waitFor(() => {
      expect(container.querySelector('[data-rating-peak]')?.textContent).toContain('14 марта');
    });
    expect(container.querySelector('[data-rating-peak]')?.textContent).toContain(
      formatRating(SUMMARY.maxRating),
    );
  });

  it('стрелками с клавиатуры — подсказка о турнире: дата, турнир, рейтинг, изменение', async () => {
    const { container } = renderProfile();

    const chart = await screen.findByRole('figure', { name: ru['profile.chart.hint'] });
    fireEvent.keyDown(chart, { key: 'ArrowRight' });

    const tip = container.querySelector('[data-rating-tip]');
    const [first] = RATING_HISTORY.points;
    if (first === undefined) throw new Error('нет точки');

    expect(tip?.textContent).toContain(first.tournamentName ?? '');
    expect(tip?.textContent).toContain(formatRating(first.ratingAfter));
    expect(tip?.textContent).toContain(`+${first.delta}`);

    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    // Корректировка вне турнира названа словами, а не пустой строкой.
    expect(container.querySelector('[data-rating-tip]')?.textContent).toContain(
      ru['player.history.adjustment'],
    );

    fireEvent.keyDown(chart, { key: 'Escape' });
    expect(container.querySelector('[data-rating-tip]')).toBeNull();
  });

  it('точка турнира ведёт на его страницу, корректировка — никуда', async () => {
    const { container } = renderProfile();

    const chart = await screen.findByRole('figure', { name: ru['profile.chart.hint'] });
    const [first] = RATING_HISTORY.points;
    if (first?.tournamentId == null) throw new Error('нет турнира у первой точки');

    // Корректировка: подсказка без «Открыть турнир», Enter оставляет на месте.
    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    expect(container.querySelector('[data-rating-tip]')?.textContent).not.toContain(
      ru['profile.chart.open'],
    );
    fireEvent.keyDown(chart, { key: 'Enter' });
    expect(window.location.pathname).toBe(`/players/${PLAYER_ID}`);

    // Турнир: подсказка зовёт открыть, Enter переходит.
    fireEvent.keyDown(chart, { key: 'Home' });
    expect(container.querySelector('[data-rating-tip]')?.textContent).toContain(
      ru['profile.chart.open'],
    );
    fireEvent.keyDown(chart, { key: 'Enter' });
    await waitFor(() => {
      expect(window.location.pathname).toBe(`/tournaments/${first.tournamentId ?? ''}`);
    });
  });

  it('щелчок мышью по графику открывает турнир под указателем', async () => {
    const { container } = renderProfile();

    await screen.findByRole('figure', { name: ru['profile.chart.hint'] });
    const svg = container.querySelector('[data-rating-chart]');
    if (svg === null) throw new Error('нет графика');
    const [first] = RATING_HISTORY.points;

    // Левый край холста — первая точка.
    fireEvent.pointerDown(svg, { pointerType: 'mouse', clientX: 0, clientY: 10 });
    fireEvent.click(svg, { clientX: 0, clientY: 10 });
    await waitFor(() => {
      expect(window.location.pathname).toBe(`/tournaments/${first?.tournamentId ?? ''}`);
    });
  });

  it('без обсчитанных турниров показывает строку, а не пустой холст', async () => {
    history = EMPTY_RATING_HISTORY;

    const { container } = renderProfile();

    expect(await screen.findByText(ru['player.history.empty'])).toBeDefined();
    expect(container.querySelector('[data-rating-chart]')).toBeNull();
  });
});

describe('общая статистика', () => {
  it('место — в плашке рейтинга, игры с долей побед — в статистике, как посчитал сервер', async () => {
    const { container } = renderProfile();

    await waitFor(() => {
      expect(container.querySelector('[data-rank]')?.textContent).toBe('#8 из 120 в рейтинге');
    });
    expect(screen.getByText(`${String(SUMMARY.wins)} — ${String(SUMMARY.losses)}`)).toBeDefined();
    const percent = Math.round((SUMMARY.wins / (SUMMARY.wins + SUMMARY.losses)) * 100);
    expect(container.querySelector('[data-win-rate]')?.textContent).toBe(
      `${String(percent)}% побед`,
    );
  });

  it('период уходит запросом, а не режется на клиенте', async () => {
    renderProfile();

    const stats = await screen.findByRole('radiogroup', { name: ru['profile.stats.period'] });
    fireEvent.click(within(stats).getByRole('radio', { name: ru['profile.period.YEAR'] }));

    await waitFor(() => {
      expect(requested.some((url) => url.includes('/summary?period=YEAR'))).toBe(true);
    });
  });

  it('награды — строкой на клуб, медаль ведёт на турнир и называет его', async () => {
    const { container } = renderProfile();

    await waitFor(() => {
      expect(container.querySelector('[data-fact="achievements"] [data-awards]')).not.toBeNull();
    });

    expect(container.querySelectorAll('[data-award-club]')).toHaveLength(2);
    const medal = screen.getByRole('link', { name: /1 место — Кубок Алматы/ });
    expect(medal.getAttribute('href')).toBe(`/tournaments/${CUP.id}`);
    expect(
      container.querySelector(`[data-award-club="${OTHER_CLUB.id}"] [data-medal="3"]`),
    ).not.toBeNull();
  });

  it('«Все призовые турниры» раскрывает список строками', async () => {
    const { container } = renderProfile();

    fireEvent.click(await screen.findByRole('button', { name: ru['profile.awards.all'] }));

    expect(container.querySelectorAll('[data-award-list] tr')).toHaveLength(2);
    expect(screen.getByRole('button', { name: ru['profile.awards.hide'] })).toBeDefined();
  });

  it('без призовых мест блока наград нет', async () => {
    summary = { ...SUMMARY, awards: [] };

    const { container } = renderProfile();

    await waitFor(() => {
      expect(container.querySelector('[data-fact="achievements"]')).not.toBeNull();
    });
    expect(container.querySelector('[data-medal-tally]')).toBeNull();
    expect(container.querySelector('[data-awards]')).toBeNull();
  });
});

describe('лучшие победы', () => {
  it('свой запрос и свой период, отдельно от статистики', async () => {
    renderProfile();

    const tabs = await screen.findByRole('radiogroup', { name: ru['profile.bestWins.period'] });
    expect(requested.some((url) => url.includes('/best-wins?period=ALL'))).toBe(true);

    fireEvent.click(within(tabs).getByRole('radio', { name: ru['profile.period.HALF'] }));

    await waitFor(() => {
      expect(requested.some((url) => url.includes('/best-wins?period=HALF'))).toBe(true);
    });
    expect(requested.some((url) => url.includes('/summary?period=HALF'))).toBe(false);
  });

  it('на десктопе — таблица: оба рейтинга, счёт, изменение, минуты', async () => {
    asDesktop();
    const { container } = renderProfile();

    await waitFor(() => {
      expect(container.querySelector('[data-best-wins="table"]')).not.toBeNull();
    });
    const table = found(container, '[data-best-wins="table"]');
    const [row] = within(table).getAllByRole('row').slice(1);
    if (row === undefined) throw new Error('нет строки');

    expect(row.textContent).toContain('471');
    expect(row.textContent).not.toContain('471.30');
    expect(row.textContent).toContain('Смагулов Асан640');
    expect(row.textContent).toContain('+9.10');
    expect(row.textContent).toContain('19');
    // Соперник — ссылкой на его профиль.
    expect(
      within(row)
        .getByRole('link', { name: playerName(PLAYERS.second) })
        .getAttribute('href'),
    ).toBe(`/players/${PLAYER_IDS.second}`);
  });

  it('на телефоне — карточками, без таблицы', async () => {
    const { container } = renderProfile();

    await waitFor(() => {
      expect(container.querySelector('[data-best-wins="cards"]')).not.toBeNull();
    });
    expect(container.querySelector('[data-best-wins="table"]')).toBeNull();
    expect(container.querySelector('[data-best-wins="cards"]')?.textContent).toContain('19 мин');
  });

  it('пусто за период — так и написано', async () => {
    bestWins = { period: 'ALL', items: [] };

    renderProfile();

    expect(await screen.findByText(ru['profile.bestWins.empty'])).toBeDefined();
  });
});

describe('результаты по турнирам', () => {
  it('шапка турнира — уровень, участники и «я» с рейтингом на старте', async () => {
    const { container } = renderProfile(PLAYER_ID, USER_WITH_PROFILE);

    await screen.findByText('5–8');
    const card = found(container, `[data-result="${CUP.id}"]`);

    expect(card.textContent).toContain(ru['tournament.level.REGIONAL']);
    expect(card.textContent).toContain('участников: 16');
    expect(card.querySelector('[data-result-me]')?.textContent).toMatch(/^Я480на старте/);
  });

  it('на чужом профиле вместо «Я» — имя игрока', async () => {
    const { container } = renderProfile();

    await screen.findByText('5–8');

    expect(container.querySelector('[data-result-me]')?.textContent).toContain(
      playerName(PLAYERS.first),
    );
  });

  it('встречи таблицей: время, рейтинг соперника, счёт цветом победы, минуты', async () => {
    asDesktop();
    const { container } = renderProfile();

    await waitFor(() => {
      expect(container.querySelector('[data-result-table]')).not.toBeNull();
    });
    const table = found(container, '[data-result-table]');
    const [won, lost] = within(found(table, 'tbody')).getAllByRole('row');

    expect(won?.textContent).toContain('505');
    expect(won?.textContent).not.toContain('505.20');
    expect(won?.textContent).toContain('25');
    expect(within(required(won)).getByLabelText(`${ru['player.matches.won']} 3:1`)).toBeDefined();
    // Без вызова к столу — прочерки, а не нули.
    expect(lost?.textContent).toContain('—');
    expect(within(required(lost)).getByLabelText(`${ru['player.matches.lost']} 1:3`)).toBeDefined();
  });

  it('итоговая строка: победы и поражения, сумма изменений, минуты, рейтинг после', async () => {
    const { container } = renderProfile();

    await screen.findByText('5–8');
    const total = container.querySelector('[data-result-total]');

    expect(total?.textContent).toContain('Победы: 1 · Поражения: 1');
    expect(total?.textContent).toContain('+12.50');
    expect(total?.textContent).toContain('25 мин');
    // Рейтинг после — целым, половина вверх; сумма изменений — с сотыми.
    expect(total?.textContent).toContain('Рейтинг после 493');
  });

  it('место диапазоном, круг сетки словами, изменение рейтинга', async () => {
    renderProfile();

    expect(await screen.findByText('5–8')).toBeDefined();
    expect(screen.getByText(`${ru['results.bracket.final']} · Плей-офф`)).toBeDefined();
    expect(screen.getAllByText('+12.50').length).toBeGreaterThan(0);
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

describe('шапка-визитка и карточки «кто он» (ADR-060)', () => {
  it('«Форма» — точка на каждую встречу, победа и поражение различимы не только цветом', async () => {
    const { container } = renderProfile();

    await waitFor(() => {
      expect(container.querySelectorAll('[data-form-strip] [data-form]')).toHaveLength(2);
    });
    // Свежая справа: в турнире последней сыграна проигранная встреча.
    const dots = [...container.querySelectorAll('[data-form-strip] [data-form]')];
    expect(dots.map((dot) => dot.getAttribute('data-form'))).toEqual(['win', 'loss']);
    expect(dots[0]?.getAttribute('aria-label')).toContain(playerName(PLAYERS.second));
  });

  it('рука и хват — метками, своя страница тренера — красной меткой-ссылкой', async () => {
    profile = {
      ...PLAYER_PROFILE,
      playingHand: 'LEFT',
      grip: 'PENHOLD',
      ownCoachSlug: 'smagulov-asan',
    };

    renderProfile();

    const badge = await screen.findByRole('link', { name: ru['profile.chip.coach'] });
    expect(badge.getAttribute('href')).toBe('/coaches/smagulov-asan');
    expect(screen.getByText(ru['profile.chip.hand.LEFT'])).toBeDefined();
    expect(screen.getByText(ru['profile.chip.grip.PENHOLD'])).toBeDefined();
  });

  it('без своей опубликованной страницы метки «Тренер KTTF» нет', async () => {
    renderProfile();

    await screen.findByRole('heading', { name: playerName(PLAYERS.first), level: 1 });
    expect(screen.queryByText(ru['profile.chip.coach'])).toBeNull();
  });

  it('«Сравнить со мной» открывает личный счёт против вошедшего игрока', async () => {
    renderProfile(PLAYER_ID, { ...USER_WITH_PROFILE, playerId: PLAYER_IDS.second });

    fireEvent.click(await screen.findByRole('button', { name: ru['profile.compare'] }));

    expect(
      await screen.findByText(`${String(HEAD_TO_HEAD.wins)} : ${String(HEAD_TO_HEAD.losses)}`),
    ).toBeDefined();
    expect(
      requested.some((url) =>
        url.includes(`/players/${PLAYER_ID}/head-to-head/${PLAYER_IDS.second}`),
      ),
    ).toBe(true);
  });

  it('без входа сравнивать не с кем — кнопки нет', async () => {
    renderProfile();
    await screen.findByRole('heading', { name: playerName(PLAYERS.first), level: 1 });
    expect(screen.queryByRole('button', { name: ru['profile.compare'] })).toBeNull();
  });

  it('«Вызвать на дуэль» — вошедшему на чужом профиле игрока с аккаунтом (ADR-065)', async () => {
    profile = { ...PLAYER_PROFILE, userId: '00000000-0000-4000-8000-000000000062' };
    renderProfile(PLAYER_ID, { ...USER_WITH_PROFILE, playerId: PLAYER_IDS.second });

    const challenge = await screen.findByRole('link', { name: ru['profile.challenge'] });
    expect(challenge.getAttribute('href')).toBe(`/duels/new?opponent=${PLAYER_ID}`);
  });

  it('игроку без аккаунта вызова нет: его некому принять', async () => {
    renderProfile(PLAYER_ID, { ...USER_WITH_PROFILE, playerId: PLAYER_IDS.second });
    await screen.findByRole('heading', { name: playerName(PLAYERS.first), level: 1 });
    expect(screen.queryByRole('link', { name: ru['profile.challenge'] })).toBeNull();
  });

  it('на своём профиле вызова нет', async () => {
    profile = { ...PLAYER_PROFILE, userId: '00000000-0000-4000-8000-000000000062' };
    renderProfile(PLAYER_ID, USER_WITH_PROFILE);
    await screen.findByRole('heading', { name: playerName(PLAYERS.first), level: 1 });
    expect(screen.queryByRole('link', { name: ru['profile.challenge'] })).toBeNull();
  });

  it('гостю вызова нет', async () => {
    profile = { ...PLAYER_PROFILE, userId: '00000000-0000-4000-8000-000000000062' };
    renderProfile();
    await screen.findByRole('heading', { name: playerName(PLAYERS.first), level: 1 });
    expect(screen.queryByRole('link', { name: ru['profile.challenge'] })).toBeNull();
  });

  it('«Достижения» — медали по достоинству, победы с долей, первый турнир', async () => {
    const { container } = renderProfile();

    await waitFor(() => {
      expect(container.querySelector('[data-fact="achievements"]')).not.toBeNull();
    });
    const card = found(container, '[data-fact="achievements"]');
    const golds = SUMMARY.awards.filter((award) => award.place === 1).length;

    expect(
      within(card).getByLabelText(`1 место — ${String(golds)}`, { selector: 'li' }),
    ).toBeDefined();
    expect(card.textContent).toContain(ru['profile.stats.first']);
  });

  it('«Об игроке» — «о себе» и с какого времени на сайте', async () => {
    profile = { ...PLAYER_PROFILE, bio: 'Играю с детства' };
    const { container } = renderProfile();

    await waitFor(() => {
      expect(container.querySelector('[data-fact="about"] [data-bio]')?.textContent).toBe(
        'Играю с детства',
      );
    });
    expect(found(container, '[data-fact="about"]').textContent).toContain(ru['profile.since']);
  });
});

describe('результаты свёрнуты до итога', () => {
  const EARLIER: PlayerTournamentView = {
    ...TOURNAMENT_ROW,
    tournament: { ...TOURNAMENT_ROW.tournament, ...AUTUMN },
  };

  it('раскрыт последний турнир, у остальных — итог и кнопка встреч', async () => {
    tournaments = [TOURNAMENT_ROW, EARLIER];
    total = 2;
    const { container } = renderProfile();

    await waitFor(() => {
      expect(container.querySelectorAll('[data-result]')).toHaveLength(2);
    });
    const [last, earlier] = [...container.querySelectorAll('[data-result]')];

    expect(last?.querySelector('[data-result-cards]')).not.toBeNull();
    expect(earlier?.querySelector('[data-result-cards]')).toBeNull();
    expect(earlier?.querySelector('[data-result-summary]')?.textContent).toContain('1–1');

    fireEvent.click(
      within(required(earlier as HTMLElement | undefined)).getByRole('button', {
        name: 'Встречи (2)',
      }),
    );

    expect(earlier?.querySelector('[data-result-cards]')).not.toBeNull();
  });
});
