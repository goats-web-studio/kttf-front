import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '@/app/router';
import { ru } from '@/common/i18n/ru';
import {
  CLUB,
  EMPTY_RATING_HISTORY,
  HEAD_TO_HEAD,
  pageOf,
  PLAYER_IDS,
  PLAYER_MATCHES,
  PLAYERS,
  RATING_HISTORY,
  TOURNAMENT_ID,
} from '@/test/fixtures';

import { playerName } from './player-name';

/**
 * Публичный профиль игрока — ТЗ 9.3, от адреса до экрана.
 *
 * Проверяется связка целиком: маршрут, три запроса по контракту ТС 7.2 и
 * путь данных до человека. Отдельно от неё геометрия кривой проверена в
 * `rating-scale.test.ts` — здесь стережётся то, что между ними: адрес
 * запроса, выбор соперника и числа, которые не считает клиент.
 */

const PLAYER_ID = PLAYER_IDS.first;

/** История подменяется на пустую в тесте игрока без турниров. */
let history = RATING_HISTORY;
/** Сервер отвечает «не найдено» — игрока с таким идентификатором нет. */
let missing = false;
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

  if (url.includes('/matches')) {
    return reply(pageOf(PLAYER_MATCHES));
  }

  if (url.includes('/clubs')) {
    return reply(pageOf([CLUB]));
  }

  if (url.includes('/players/')) {
    return reply(PLAYERS.first);
  }

  throw new Error(`Неожидаемый запрос: ${url}`);
}

function renderProfile(id: string = PLAYER_ID): { readonly container: HTMLElement } {
  window.history.pushState({}, '', `/players/${id}`);

  // Повторы выключены: иначе отказ, вызванный опечаткой в адресе запроса,
  // превращается в таймаут теста вместо понятной ошибки.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter({ queryClient, session: null });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  history = RATING_HISTORY;
  missing = false;
  requested = [];
  vi.stubGlobal('fetch', (input: unknown) => Promise.resolve(answer(String(input))));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('карточка игрока', () => {
  it('открывается без входа и показывает рейтинг как он пришёл', async () => {
    renderProfile();

    expect(
      await screen.findByRole('heading', { name: playerName(PLAYERS.first), level: 1 }),
    ).toBeDefined();
    // Строкой, а не числом: сотая доля обязана дожить до экрана (ADR-014).
    // Значение встречается дважды — в карточке и последней точкой истории.
    expect(screen.getAllByText(PLAYERS.first.rating).length).toBeGreaterThan(0);
  });

  it('называет клуб, хотя игрок несёт только его идентификатор', async () => {
    renderProfile();

    expect((await screen.findByText(new RegExp(CLUB.name))).textContent).toContain(CLUB.name);
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
    // Три запроса на заведомо неверную ссылку — это три одинаковых отказа.
    expect(requested.filter((url) => url.includes('/players/'))).toHaveLength(0);
  });

  it('несуществующий игрок объясняется тем же сообщением', async () => {
    missing = true;

    renderProfile();

    expect(await screen.findByText(ru['player.notFound'])).toBeDefined();
    expect(screen.queryByText(ru['player.matches.title'])).toBeNull();
  });
});

describe('кривая рейтинга', () => {
  it('рисует точку на каждый турнир истории', async () => {
    const { container } = renderProfile();

    await screen.findByText(ru['player.history.title']);

    expect(container.querySelectorAll('circle')).toHaveLength(RATING_HISTORY.points.length);
  });

  it('ведёт со строки истории на результаты турнира', async () => {
    renderProfile();

    // Турнир назван и в истории рейтинга, и в истории встреч: ссылка ведёт
    // на его результаты из обеих.
    const links = await screen.findAllByRole('link', { name: 'Кубок Алматы' });

    expect(links.length).toBeGreaterThan(0);

    for (const link of links) {
      expect(link.getAttribute('href')).toBe(`/tournaments/${TOURNAMENT_ID}`);
    }
  });

  it('называет ручную корректировку, а не показывает пустую ссылку', async () => {
    renderProfile();

    // Корректировка не привязана к турниру, но из кривой её не выкинуть:
    // рейтинг после неё другой.
    expect(await screen.findByText(ru['player.history.adjustment'])).toBeDefined();
  });

  it('без обсчитанных турниров показывает строку, а не пустой холст', async () => {
    history = EMPTY_RATING_HISTORY;

    const { container } = renderProfile();

    expect(await screen.findByText(ru['player.history.empty'])).toBeDefined();
    expect(container.querySelector('svg')).toBeNull();
  });
});

describe('история встреч', () => {
  it('называет исход словом, а не цветом строки', async () => {
    renderProfile();

    expect((await screen.findAllByText(ru['player.matches.won'])).length).toBeGreaterThan(0);
    expect(screen.getAllByText(ru['player.matches.lost']).length).toBeGreaterThan(0);
  });

  it('различает нулевую дельту и неначисленную', async () => {
    renderProfile();

    // Турнир ещё не обсчитан — это не то же самое, что изменение на ноль.
    expect(await screen.findByText(ru['player.matches.notRated'])).toBeDefined();
    // Ноль остаётся без знака: техническая победа рейтинг не двигает.
    expect(screen.getByText('0.00')).toBeDefined();
  });

  it('объясняет пустого соперника, а не оставляет прочерк', async () => {
    renderProfile();

    expect(await screen.findByText(ru['player.matches.noOpponent'])).toBeDefined();
    expect(screen.getByText(ru['match.resultType.WALKOVER'])).toBeDefined();
  });
});

describe('личный счёт', () => {
  it('запрашивается по выбранному сопернику и показывает счёт сервера', async () => {
    renderProfile();

    const opponent = await screen.findByRole('button', { name: playerName(PLAYERS.second) });

    fireEvent.click(opponent);

    // Победы и сеты считает сервер: по видимой странице истории они были бы
    // неверными. Ждём именно счёт, а не заголовок: заголовок стоит снаружи
    // ожидания запроса и появляется раньше ответа.
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

    await screen.findByText(ru['player.matches.title']);

    expect(requested.some((url) => url.includes('/head-to-head/'))).toBe(false);
  });
});
