import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '@/app/router';
import { fill } from '@/common/i18n';
import { ru } from '@/common/i18n/ru';
import { playerName } from '@/features/players/player-name';
import {
  CITIES,
  CLUB,
  pageOf,
  placesReply,
  PLAYERS,
  RESULTS,
  TOURNAMENT,
  TOURNAMENT_ID,
} from '@/test/fixtures';

/**
 * Публичные экраны от адреса до данных — ТЗ 9.1, 9.2, 9.4.
 *
 * Проверяется связка целиком: маршрут, запрос по контракту, разбор ответа,
 * показ. Отдельно от неё компоненты уже проверены на фикстуре, а здесь
 * стережётся то, что между ними, — адрес запроса и путь данных до экрана.
 * Все три страницы открываются без сессии: это критерий готовности MVP.
 */

function reply(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function answer(url: string): Response {
  const places = placesReply(url);
  if (places !== undefined) {
    return reply(places);
  }

  if (/\/tournaments\/[^/]+\/results$/.test(url)) {
    return reply(RESULTS);
  }

  // Состав участников — отдельный запрос страницы турнира (ТЗ 4.3). Проверка
  // ветки записи живёт в `features/tournaments/registration.test.tsx`.
  if (url.includes('/registrations')) {
    return reply([]);
  }

  if (url.includes('/tournaments')) {
    return reply(pageOf([TOURNAMENT]));
  }

  if (/\/clubs\/[^/?]+\/members$/.test(url)) {
    return reply([OWNER]);
  }

  if (/\/clubs\/[^/?]+$/.test(url)) {
    return reply(CLUB);
  }

  if (url.includes('/clubs')) {
    return reply(pageOf([CLUB]));
  }

  if (url.includes('/players')) {
    return reply(pageOf([PLAYERS.first, PLAYERS.second]));
  }

  throw new Error(`Неожидаемый запрос: ${url}`);
}

/** Владелец клуба с профилем игрока — состав на странице клуба. */
const OWNER = {
  userId: '00000000-0000-4000-8000-0000000000aa',
  role: 'OWNER',
  playerId: PLAYERS.first.id,
  name: playerName(PLAYERS.first),
};

function renderAt(path: string): void {
  window.history.pushState({}, '', path);

  // Повторы выключены: иначе отказ, вызванный опечаткой в адресе запроса,
  // превращается в таймаут теста вместо понятной ошибки.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter({ queryClient, session: null });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

/** Адреса запросов к API за тест — проверка, что фильтр из ссылки дошёл до сервера. */
let requests: string[] = [];

beforeEach(() => {
  requests = [];
  vi.stubGlobal('fetch', (input: unknown) => {
    requests.push(decodeURIComponent(String(input)));
    return Promise.resolve(answer(String(input)));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('календарь турниров', () => {
  it('показывает турнир ссылкой на его результаты', async () => {
    renderAt('/tournaments');

    const link = await screen.findByRole('link', { name: TOURNAMENT.name });

    expect(link.getAttribute('href')).toBe(`/tournaments/${TOURNAMENT_ID}`);
  });
});

describe('страница турнира', () => {
  it('открывается без входа и показывает результаты', async () => {
    renderAt(`/tournaments/${TOURNAMENT_ID}`);

    expect(await screen.findByRole('heading', { name: TOURNAMENT.name })).toBeDefined();
    // Разделы — вкладками, а не лентой: сначала места, остальное по вкладке.
    expect(await screen.findByRole('heading', { name: ru['results.places.title'] })).toBeDefined();
    expect((await screen.findAllByText(playerName(PLAYERS.first))).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('tab', { name: ru['results.tabs.ratings'] }));

    expect(await screen.findByRole('heading', { name: ru['results.ratings.title'] })).toBeDefined();
    expect(screen.queryByRole('heading', { name: ru['results.places.title'] })).toBeNull();
  });

  it('называет клуб, хотя турнир несёт только его идентификатор', async () => {
    renderAt(`/tournaments/${TOURNAMENT_ID}`);

    expect(await screen.findByText(CLUB.name)).toBeDefined();
  });
});

describe('рейтинг', () => {
  it('показывает игроков в порядке, который задал сервер', async () => {
    renderAt('/ratings');

    const rows = await screen.findAllByRole('row');
    // Первая строка — заголовки таблицы.
    const players = rows.slice(1).map((row) => row.textContent);

    expect(players[0]).toContain(PLAYERS.first.lastName);
    expect(players[1]).toContain(PLAYERS.second.lastName);
  });
});

describe('неверная ссылка на турнир', () => {
  it('объясняет оборванную ссылку вместо просьбы проверить поля', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve({
        ok: false,
        status: 400,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              error: { code: 'VALIDATION_FAILED', message: 'Request failed schema validation' },
            }),
          ),
      } as unknown as Response),
    );

    renderAt('/tournaments/af194089');

    // Ссылку на результаты пересылают в чат клуба, и обрывается она там же.
    expect(await screen.findByText(ru['tournament.notFound'])).toBeDefined();
  });
});

/**
 * Фильтры в адресе — docs/07-design-system.md, 6.2.
 *
 * Ссылку на рейтинг города пересылают в WhatsApp: открытая заново, она
 * обязана показать тот же список, а кривая — не ронять страницу.
 */
describe('фильтры в адресе', () => {
  it('ссылка с городом открывает рейтинг этого города', async () => {
    // Город в адресе — идентификатор записи справочника (ADR-046).
    renderAt(`/ratings?city=${CITIES.almaty.id}`);

    await screen.findAllByRole('row');

    expect(
      requests.some(
        (url) => url.includes('/players') && url.includes(`cityId=${CITIES.almaty.id}`),
      ),
    ).toBe(true);
    // Подпись чипа — название из справочника, а не идентификатор из адреса.
    expect(await screen.findByText(`${ru['filter.city']}: ${CITIES.almaty.name}`)).toBeDefined();
  });

  it('город вне справочника фильтр не снимает и подписан словом', async () => {
    const hidden = '00000000-0000-4000-8000-0000000000c9';
    renderAt(`/clubs?city=${hidden}`);

    expect(
      await screen.findByText(`${ru['filter.city']}: ${ru['places.city.unknown']}`),
    ).toBeDefined();
    expect(requests.some((url) => url.includes('/clubs') && url.includes(`cityId=${hidden}`))).toBe(
      true,
    );
  });

  it('выбор города в календаре кладёт в адрес его идентификатор', async () => {
    renderAt('/tournaments');

    await screen.findByRole('link', { name: TOURNAMENT.name });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: ru['filter.city'] }));
    fireEvent.click(await screen.findByRole('option', { name: CITIES.astana.name }));

    await waitFor(() => {
      expect(window.location.search).toContain(`city=${CITIES.astana.id}`);
    });
    await waitFor(() => {
      expect(
        requests.some(
          (url) => url.includes('/tournaments') && url.includes(`cityId=${CITIES.astana.id}`),
        ),
      ).toBe(true);
    });
  });

  it('кривая ссылка отбрасывает фильтр, а не показывает ошибку', async () => {
    renderAt('/ratings?club=abc&page=zero');

    await screen.findAllByRole('row');

    const players = requests.find((url) => url.includes('/players'));
    expect(players).not.toContain('clubId');
    expect(players).toContain('page=1');
  });

  it('выбор состояния в календаре попадает в адрес', async () => {
    renderAt('/tournaments');

    await screen.findByRole('link', { name: TOURNAMENT.name });
    // Список MUI открывается нажатием, а не сменой значения родного select.
    fireEvent.mouseDown(screen.getByRole('combobox', { name: ru['filter.status'] }));
    fireEvent.click(await screen.findByRole('option', { name: ru['tournament.status.REG_OPEN'] }));

    await waitFor(() => {
      expect(window.location.search).toContain('status=REG_OPEN');
    });
    // Чип активного фильтра — отдельно от выбранного значения в поле.
    expect(
      screen
        .getAllByText(ru['tournament.status.REG_OPEN'])
        .some((node) => node.closest('.MuiChip-root')),
    ).toBe(true);
  });

  it('пустой ответ по фильтру предлагает снять фильтры, а не «нет данных»', async () => {
    vi.stubGlobal('fetch', (input: unknown) => {
      const url = String(input);
      return Promise.resolve(url.includes('/players') ? reply(pageOf([])) : answer(url));
    });

    renderAt('/ratings?search=Нетакого');

    expect(await screen.findByText(ru['ratings.notFound.title'])).toBeDefined();
    const [resetAll] = screen.getAllByRole('button', { name: ru['filter.resetAll'] });
    if (resetAll === undefined) {
      throw new Error('Нет кнопки «Сбросить все»');
    }
    fireEvent.click(resetAll);

    await waitFor(() => {
      expect(window.location.search).toBe('');
    });
    expect(await screen.findByText(ru['ratings.emptyState.title'])).toBeDefined();
  });
});

describe('главная', () => {
  it('в ленте — итоги турнира с победителем из результатов', async () => {
    renderAt('/');

    const title = await screen.findByText(
      fill(ru['home.news.result.title'], { name: TOURNAMENT.name }),
    );
    // Победитель приходит отдельным запросом результатов, а не из списка.
    expect(
      await screen.findByText(
        new RegExp(fill(ru['home.news.result.winner'], { name: playerName(PLAYERS.first) })),
      ),
    ).toBeDefined();
    expect(title.closest('a')?.getAttribute('href')).toBe(`/tournaments/${TOURNAMENT_ID}`);
  });

  it('поиск на первом экране ведёт в рейтинг с запросом', async () => {
    renderAt('/');

    fireEvent.change(await screen.findByRole('searchbox', { name: ru['ratings.search'] }), {
      target: { value: 'Иванов' },
    });
    fireEvent.click(screen.getByRole('button', { name: ru['home.hero.find'] }));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/ratings');
    });
    expect(decodeURIComponent(window.location.search)).toContain('Иванов');
  });
});

describe('клубы', () => {
  it('раздел есть в шапке на любой публичной странице', async () => {
    renderAt('/ratings');

    const links = await screen.findAllByRole('link', { name: ru['nav.clubs'] });

    expect(links[0]?.getAttribute('href')).toBe('/clubs');
  });

  it('клуб не заводится со списка — только заявкой', async () => {
    // Клуб заводит администратор по заявке «Напишите нам» — ADR-049.
    renderAt('/clubs');

    const apply = await screen.findByRole('link', { name: ru['clubs.apply'] });

    expect(apply.getAttribute('href')).toBe('/feedback');
    expect(screen.queryByRole('link', { name: ru['club.create'] })).toBeNull();
  });

  it('список ведёт на страницу клуба', async () => {
    renderAt('/clubs');

    const link = await screen.findByRole('link', { name: CLUB.name });

    expect(link.getAttribute('href')).toBe(`/clubs/${CLUB.id}`);
  });

  it('страница клуба открывается без входа: турниры, игроки и состав клуба', async () => {
    renderAt(`/clubs/${CLUB.id}`);

    expect(await screen.findByRole('heading', { name: CLUB.name })).toBeDefined();
    expect(await screen.findByText(new RegExp(ru['club.role.OWNER']))).toBeDefined();
    // Турниры и игроки запрошены именно этого клуба, а не всей страны.
    await waitFor(() => {
      expect(requests.some((url) => url.includes('/tournaments') && url.includes(CLUB.id))).toBe(
        true,
      );
      expect(requests.some((url) => url.includes('/players') && url.includes(CLUB.id))).toBe(true);
    });
  });

  it('прошедший турнир клуба виден ссылкой на результаты', async () => {
    renderAt(`/clubs/${CLUB.id}`);

    const link = await screen.findByRole('link', { name: TOURNAMENT.name });

    expect(link.getAttribute('href')).toBe(`/tournaments/${TOURNAMENT_ID}`);
  });
});
