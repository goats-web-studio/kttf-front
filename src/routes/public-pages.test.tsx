import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '@/app/router';
import { ru } from '@/common/i18n/ru';
import { playerName } from '@/features/players/player-name';
import { CLUB, pageOf, PLAYERS, RESULTS, TOURNAMENT, TOURNAMENT_ID } from '@/test/fixtures';

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

  if (url.includes('/clubs')) {
    return reply(pageOf([CLUB]));
  }

  if (url.includes('/players')) {
    return reply(pageOf([PLAYERS.first, PLAYERS.second]));
  }

  throw new Error(`Неожидаемый запрос: ${url}`);
}

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
    // Победитель назван в нескольких разделах сразу: местах, таблице и
    // журнале рейтинга — это разные части одного ответа.
    expect((await screen.findAllByText(playerName(PLAYERS.first))).length).toBeGreaterThan(1);
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
    renderAt('/ratings?city=Алматы');

    await screen.findAllByRole('row');

    expect(requests.some((url) => url.includes('/players') && url.includes('city=Алматы'))).toBe(
      true,
    );
    expect(screen.getByText(`${ru['filter.city']}: Алматы`)).toBeDefined();
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
      screen.getAllByText(ru['tournament.status.REG_OPEN']).some((node) =>
        node.closest('.MuiChip-root'),
      ),
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
