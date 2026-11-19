import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ru } from '@/common/i18n/ru';
import { COACH_LIST_ITEM } from '@/test/coach-fixtures';
import { CLUB, pageOf, PLAYERS } from '@/test/fixtures';

import LiveSearch, { SEARCH_DEBOUNCE_MS } from './live-search';

/**
 * Живой поиск первого экрана: пауза после набора, запрос по контракту,
 * поиск сразу по трём разделам, клавиатура комбобокса и переходы.
 */

const PLAYER_ROWS = [
  {
    ...PLAYERS.first,
    ratingUpdatedAt: null,
    blade: null,
    rubberForehand: null,
    rubberBackhand: null,
  },
  {
    ...PLAYERS.second,
    ratingUpdatedAt: null,
    blade: null,
    rubberForehand: null,
    rubberBackhand: null,
  },
];

/** Запрос, на который сервер ничего не находит. */
const NOTHING = 'Ыыы';

let requests: string[] = [];

function reply(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

beforeEach(() => {
  requests = [];
  vi.stubGlobal('fetch', (input: unknown) => {
    const url = decodeURIComponent(String(input));
    requests.push(url);
    if (url.includes(`search=${NOTHING}`)) return Promise.resolve(reply(pageOf([])));
    if (url.includes('/players?')) return Promise.resolve(reply(pageOf(PLAYER_ROWS)));
    if (url.includes('/clubs?')) {
      return Promise.resolve(reply(pageOf([{ ...CLUB, nextTournamentAt: null }])));
    }
    if (url.includes('/coaches?')) return Promise.resolve(reply(pageOf([COACH_LIST_ITEM])));
    throw new Error(`Неожидаемый запрос: ${url}`);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderSearch() {
  const root = createRootRoute({
    component: () => (
      <>
        <LiveSearch />
        <Outlet />
      </>
    ),
  });
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return router;
}

async function input(): Promise<HTMLInputElement> {
  return screen.findByRole<HTMLInputElement>('combobox', { name: ru['home.search.label'] });
}

function type(field: HTMLInputElement, value: string): void {
  fireEvent.focus(field);
  fireEvent.change(field, { target: { value } });
}

const searches = (path: string): string[] => requests.filter((url) => url.includes(`${path}?`));

describe('живой поиск', () => {
  it('ждёт паузы в наборе и ищет по последнему тексту — пять строк', async () => {
    renderSearch();
    const field = await input();

    type(field, 'Е');
    type(field, 'Ер');
    type(field, 'Ерж');
    // Запрос не уходит на каждую букву — только после паузы.
    expect(searches('/players')).toEqual([]);

    const players = await screen.findByRole('group', { name: ru['home.search.scope.players'] });
    expect(within(players).getByRole('option', { name: /Ержанов Асан/ })).toBeDefined();
    expect(searches('/players')).toHaveLength(1);
    expect(searches('/players')[0]).toContain('search=Ерж');
    expect(searches('/players')[0]).toContain('limit=5');
    expect(searches('/players')[0]).toContain('page=1');
    // Переключателя разделов нет: клубы и тренеры ищутся тем же запросом.
    expect(searches('/clubs')[0]).toContain('search=Ерж');
    expect(searches('/coaches')[0]).toContain('search=Ерж');
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(field.getAttribute('aria-expanded')).toBe('true');
  });

  it('с одной буквы подсказки нет', async () => {
    renderSearch();
    const field = await input();

    type(field, 'Е');
    await new Promise((resolve) => setTimeout(resolve, SEARCH_DEBOUNCE_MS + 100));

    expect(searches('/players')).toEqual([]);
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(field.getAttribute('aria-expanded')).toBe('false');
  });

  it('три раздела с заголовками, каждый по пять строк', async () => {
    renderSearch();
    type(await input(), 'Ал');

    const listbox = await screen.findByRole('listbox');
    expect(
      await within(listbox).findByRole('group', { name: ru['home.search.scope.players'] }),
    ).toBeDefined();
    const clubs = within(listbox).getByRole('group', { name: ru['home.search.scope.clubs'] });
    const coaches = within(listbox).getByRole('group', { name: ru['home.search.scope.coaches'] });

    expect(within(clubs).getByRole('option', { name: new RegExp(CLUB.name) })).toBeDefined();
    expect(
      within(coaches).getByRole('option', { name: new RegExp(COACH_LIST_ITEM.player.lastName) }),
    ).toBeDefined();
    for (const path of ['/players', '/clubs', '/coaches']) {
      expect(searches(path)[0]).toContain('search=Ал');
      expect(searches(path)[0]).toContain('limit=5');
    }
  });

  it('стрелки двигают выделение, Escape закрывает подсказку', async () => {
    renderSearch();
    const field = await input();
    type(field, 'Ерж');
    const options = await screen.findAllByRole('option');
    // Два игрока, клуб, тренер и строка «все результаты».
    expect(options).toHaveLength(5);

    fireEvent.keyDown(field, { key: 'ArrowDown' });
    expect(field.getAttribute('aria-activedescendant')).toBe(options[0]?.id);
    expect(options[0]?.getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(field, { key: 'ArrowDown' });
    expect(field.getAttribute('aria-activedescendant')).toBe(options[1]?.id);

    fireEvent.keyDown(field, { key: 'ArrowUp' });
    fireEvent.keyDown(field, { key: 'ArrowUp' });
    // Вверх с первой строки — на последнюю.
    expect(field.getAttribute('aria-activedescendant')).toBe(options[4]?.id);

    fireEvent.keyDown(field, { key: 'Escape' });
    expect(field.getAttribute('aria-expanded')).toBe('false');
    expect(field.hasAttribute('aria-activedescendant')).toBe(false);
  });

  it('Enter на выделенной строке открывает профиль игрока', async () => {
    const router = renderSearch();
    const field = await input();
    type(field, 'Ерж');
    await screen.findAllByRole('option');

    fireEvent.keyDown(field, { key: 'ArrowDown' });
    fireEvent.keyDown(field, { key: 'Enter' });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/players/${PLAYERS.first.id}`);
    });
  });

  it('Enter без выделения ведёт в рейтинг игроков с запросом', async () => {
    const router = renderSearch();
    const field = await input();
    type(field, 'Ерж');

    fireEvent.keyDown(field, { key: 'Enter' });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/players');
    });
    expect(router.state.location.search).toMatchObject({ search: 'Ерж' });
  });

  it('клик по клубу открывает страницу клуба', async () => {
    const router = renderSearch();
    type(await input(), 'Ала');

    fireEvent.click(await screen.findByRole('option', { name: new RegExp(CLUB.name) }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/clubs/${CLUB.id}`);
    });
  });

  it('тренер открывается по адресу своей страницы', async () => {
    const router = renderSearch();
    const field = await input();
    type(field, 'Ива');

    // Тренер в фикстуре — тот же человек, что и игрок: берём строку из раздела тренеров.
    const coaches = await screen.findByRole('group', { name: ru['home.search.scope.coaches'] });
    fireEvent.click(
      within(coaches).getByRole('option', { name: new RegExp(COACH_LIST_ITEM.player.lastName) }),
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/coaches/${COACH_LIST_ITEM.slug}`);
    });
  });

  it('ничего не нашлось — подсказка проверить написание', async () => {
    renderSearch();
    type(await input(), NOTHING);

    expect(await screen.findByText(ru['home.search.empty'])).toBeDefined();
    expect(screen.queryAllByRole('option')).toEqual([]);
  });
});
