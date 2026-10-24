import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '@/app/router';
import { fill, formatDate } from '@/common/i18n';
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

  // Живые блоки главной — ADR-071.
  if (url.includes('/stats/podiums')) {
    return reply(HOME_PODIUMS);
  }

  if (url.includes('/stats/leaders')) {
    return reply({ period: 'MONTH', tournaments: [], wins: [] });
  }

  if (url.includes('/stats/upsets')) {
    return reply(HOME_UPSETS);
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

  // «Тренерский штаб» клуба — T2.1, ADR-059.
  if (/\/clubs\/[^/?]+\/staff$/.test(url)) {
    return reply([]);
  }

  // «Тренировки в клубе» — ADR-059.
  if (/\/clubs\/[^/?]+\/trainings$/.test(url)) {
    return reply([]);
  }

  if (/\/clubs\/[^/?]+\/members$/.test(url)) {
    return reply([OWNER]);
  }

  if (/\/clubs\/[^/?]+$/.test(url)) {
    return reply(CLUB);
  }

  if (/\/clubs\/[^/?]+\/posts/.test(url)) {
    return reply(pageOf([]));
  }

  if (/\/clubs\/[^/?]+\/media/.test(url)) {
    return reply([]);
  }

  if (/\/clubs\/[^/?]+\/summary$/.test(url)) {
    return reply({ matchesRecent: 0, activePlayersRecent: 0, tournamentsHeld: 0, podiums: [] });
  }

  if (url.includes('/clubs')) {
    // Элемент списка — клуб с ближайшим турниром (ADR-055).
    return reply(pageOf([{ ...CLUB, nextTournamentAt: null }]));
  }

  if (url.includes('/players')) {
    // Строка списка — краткий вид и дата обновления рейтинга (ADR-054).
    return reply(
      pageOf([
        { ...PLAYERS.first, ratingUpdatedAt: UPDATED_AT },
        { ...PLAYERS.second, ratingUpdatedAt: null },
      ]),
    );
  }

  throw new Error(`Неожидаемый запрос: ${url}`);
}

/** Призёры турнира на главной: первое место и делённое третье. */
const HOME_PODIUMS = {
  items: [
    {
      tournamentId: TOURNAMENT_ID,
      name: TOURNAMENT.name,
      startsAt: TOURNAMENT.startsAt,
      level: 'CLUB',
      ratingCapMax: '300.00',
      ratingCapMin: null,
      club: { id: CLUB.id, name: CLUB.name },
      participants: 12,
      places: [
        { place: 1, placeTo: null, playerId: PLAYERS.first.id, name: playerName(PLAYERS.first) },
        { place: 3, placeTo: 4, playerId: PLAYERS.third.id, name: playerName(PLAYERS.third) },
      ],
    },
  ],
};

/** Лучшая победа: слабый Ахметов обыграл сильного Ержанова. */
const HOME_UPSETS = {
  period: 'MONTH',
  items: [
    {
      matchId: '00000000-0000-4000-8000-0000000000b1',
      tournament: { id: TOURNAMENT_ID, name: TOURNAMENT.name, startsAt: TOURNAMENT.startsAt },
      club: { id: CLUB.id, name: CLUB.name },
      playedAt: TOURNAMENT.startsAt,
      winner: { id: PLAYERS.fourth.id, name: playerName(PLAYERS.fourth) },
      winnerRating: '300.00',
      winnerDelta: '14.5',
      loser: { id: PLAYERS.first.id, name: playerName(PLAYERS.first) },
      loserRating: '520.00',
      loserDelta: '-14.5',
      setsWinner: 3,
      setsLoser: 1,
    },
  ],
};

/** Последнее изменение рейтинга первого игрока — колонка «Обновлён». */
const UPDATED_AT = '2026-03-14T12:00:00.000Z';

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

/** Месяц турнира-фикстуры: календарь открывается на месяце, а не на всех датах. */
const FIXTURE_MONTH = TOURNAMENT.startsAt.slice(0, 7);

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

describe('календарь турниров', () => {
  it('открывается календарём текущего месяца и грузит месяц целиком', async () => {
    const now = new Date();
    const month = `${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    renderAt('/tournaments');

    await waitFor(() => {
      expect(document.querySelector(`[data-calendar="${month}"]`)).not.toBeNull();
    });
    const query = requests.find((url) => url.includes('/tournaments?'));
    // Сотня на страницу и границы месяца — календарю нужен весь месяц сразу.
    expect(query).toContain('limit=100');
    expect(query).toContain('from=');
    expect(query).toContain('to=');
  });

  it('стрелка ведёт на следующий месяц и кладёт его в адрес', async () => {
    // Далёкий месяц: текущий в адрес не пишется, ссылка на «сейчас» короче.
    renderAt('/tournaments?month=2025-03');

    fireEvent.click(await screen.findByRole('button', { name: ru['tournaments.month.next'] }));

    await waitFor(() => {
      expect(window.location.search).toContain('month=2025-04');
    });
  });

  it('на десктопе — сетка недель с понедельника, турнир в клетке своего дня', async () => {
    asDesktop();
    renderAt(`/tournaments?month=${FIXTURE_MONTH}`);

    await screen.findByRole('link', { name: TOURNAMENT.name });
    const grid = document.querySelector('[data-calendar-grid]');
    const day = TOURNAMENT.startsAt.slice(0, 10);

    expect(grid?.querySelectorAll('[role="columnheader"]')[0]?.textContent).toBe('пн');
    expect(grid?.querySelector(`[data-day="${day}"]`)?.textContent).toContain(TOURNAMENT.name);
  });

  it('на телефоне — лента дней с турнирами, без сетки', async () => {
    renderAt(`/tournaments?month=${FIXTURE_MONTH}`);

    await screen.findByRole('link', { name: TOURNAMENT.name });

    expect(document.querySelector('[data-calendar-grid]')).toBeNull();
    expect(document.querySelector('[data-calendar-agenda]')).not.toBeNull();
  });
});

describe('список турниров', () => {
  it('два блока: «Ближайшие» от ранних, «Прошедшие» от свежих', async () => {
    renderAt('/tournaments?view=list');

    expect(await screen.findByRole('heading', { name: ru['tournaments.upcoming'] })).toBeDefined();
    expect(screen.getByRole('heading', { name: ru['tournaments.past'] })).toBeDefined();

    await waitFor(() => {
      const lists = requests.filter((url) => url.includes('/tournaments?'));
      expect(lists.some((url) => url.includes('order=asc') && url.includes('from='))).toBe(true);
      expect(lists.some((url) => url.includes('order=desc') && url.includes('to='))).toBe(true);
    });
  });

  it('переключатель вида кладёт список в адрес, календарь — по умолчанию', async () => {
    renderAt(`/tournaments?month=${FIXTURE_MONTH}`);

    const views = await screen.findByRole('radiogroup', { name: ru['tournaments.view.label'] });
    fireEvent.click(within(views).getByRole('radio', { name: ru['tournaments.view.list'] }));

    await waitFor(() => {
      expect(window.location.search).toContain('view=list');
    });
  });
});

describe('календарь турниров: ссылки', () => {
  it('показывает турнир ссылкой на его результаты', async () => {
    renderAt(`/tournaments?month=${FIXTURE_MONTH}`);

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

describe('игроки — ADR-054', () => {
  it('показывает игроков в порядке, который задал сервер', async () => {
    renderAt('/players');

    const rows = await screen.findAllByRole('row');
    // Первая строка — заголовки таблицы.
    const players = rows.slice(1).map((row) => row.textContent);

    expect(players[0]).toContain(PLAYERS.first.lastName);
    expect(players[1]).toContain(PLAYERS.second.lastName);
  });

  it('«Обновлён» — дата последнего изменения рейтинга, без событий — прочерк', async () => {
    renderAt('/players');

    const rows = (await screen.findAllByRole('row')).slice(1);

    expect(rows[0]?.textContent).toContain(formatDate(UPDATED_AT, 'ru'));
    expect(rows[1]?.textContent).toContain('—');
  });

  it('раздел в шапке — «Игроки», ведёт на /players', async () => {
    renderAt('/players');

    const [link] = await screen.findAllByRole('link', { name: ru['nav.players'] });

    expect(link?.getAttribute('href')).toBe('/players');
  });

  it('старая ссылка на рейтинг города открывает игроков этого города', async () => {
    renderAt(`/ratings?city=${CITIES.almaty.id}`);

    await screen.findAllByRole('row');

    expect(window.location.pathname).toBe('/players');
    expect(window.location.search).toContain(`city=${CITIES.almaty.id}`);
  });

  it('несколько городов из ссылки — одним запросом и чипом на каждый', async () => {
    renderAt(`/players?city=${CITIES.almaty.id},${CITIES.astana.id}`);

    await screen.findAllByRole('row');

    expect(
      requests.some(
        (url) =>
          url.includes('/players?') &&
          decodeURIComponent(url).includes(`cityId=${CITIES.almaty.id},${CITIES.astana.id}`),
      ),
    ).toBe(true);
    expect(await screen.findByText(`${ru['filter.city']}: ${CITIES.almaty.name}`)).toBeDefined();
    expect(await screen.findByText(`${ru['filter.city']}: ${CITIES.astana.name}`)).toBeDefined();
  });

  it('фильтры применяются по «Найти»: имя, рейтинг от и до, пол', async () => {
    renderAt('/players');

    await screen.findAllByRole('row');
    fireEvent.change(screen.getByRole('searchbox', { name: ru['players.filter.name'] }), {
      target: { value: 'Ким' },
    });
    // «От 400 до 300» — это «от 300 до 400»; буквы в поле не попадают.
    fireEvent.change(screen.getByRole('textbox', { name: ru['players.filter.ratingFrom'] }), {
      target: { value: '400' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: ru['players.filter.ratingTo'] }), {
      target: { value: '3a00' },
    });
    fireEvent.click(screen.getByRole('radio', { name: ru['players.filter.FEMALE'] }));

    // До «Найти» запроса с условиями нет.
    expect(requests.some((url) => url.includes('ratingFrom'))).toBe(false);

    const [find] = screen.getAllByRole('button', { name: ru['players.filter.submit'] });
    if (find === undefined) throw new Error('Нет кнопки «Найти»');
    fireEvent.click(find);

    await waitFor(() => {
      expect(
        requests.some(
          (url) =>
            url.includes('/players?') &&
            url.includes('ratingFrom=300') &&
            url.includes('ratingTo=400') &&
            url.includes('gender=FEMALE') &&
            decodeURIComponent(url).includes('search=Ким'),
        ),
      ).toBe(true);
    });
    expect(window.location.search).toContain('from=300');
    expect(
      await screen.findByText(`${ru['players.filter.gender']}: ${ru['players.filter.FEMALE']}`),
    ).toBeDefined();
  });

  it('заголовок «Рейтинг» переворачивает порядок, места считаются от конца', async () => {
    renderAt('/players');

    await screen.findAllByRole('row');
    fireEvent.click(screen.getByRole('button', { name: ru['ratings.column.rating'] }));

    await waitFor(() => {
      expect(requests.some((url) => url.includes('/players?') && url.includes('order=asc'))).toBe(
        true,
      );
    });
    expect(window.location.search).toContain('order=asc');
    // Двое в списке: при «слабые первыми» первая строка — второе место.
    await waitFor(() => {
      const [, first] = screen.getAllByRole('row');
      expect(first?.querySelector('td')?.textContent).toBe('2');
    });
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
    renderAt(`/players?city=${CITIES.almaty.id}`);

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
    renderAt(`/tournaments?month=${FIXTURE_MONTH}`);

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
    renderAt('/players?club=abc&page=zero&from=abc&gender=X&city=abc');

    await screen.findAllByRole('row');

    const players = requests.find((url) => url.includes('/players'));
    expect(players).not.toContain('clubId');
    expect(players).not.toContain('ratingFrom');
    expect(players).not.toContain('gender');
    expect(players).not.toContain('cityId');
    expect(players).toContain('page=1');
  });

  it('выбор состояния в календаре попадает в адрес', async () => {
    renderAt(`/tournaments?month=${FIXTURE_MONTH}`);

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

  it('«Завершён» находит и обсчитанные турниры; отдельного «Рейтинг начислен» нет', async () => {
    renderAt(`/tournaments?month=${FIXTURE_MONTH}`);

    await screen.findByRole('link', { name: TOURNAMENT.name });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: ru['filter.status'] }));
    // Промежуточный шаг обсчёта зрителю не нужен (ADR-051).
    expect(screen.queryByRole('option', { name: ru['tournament.status.RATED'] })).toBeNull();
    fireEvent.click(await screen.findByRole('option', { name: ru['tournament.status.FINISHED'] }));

    await waitFor(() => {
      expect(
        requests.some(
          (url) =>
            url.includes('/tournaments?') &&
            decodeURIComponent(url).includes('status=FINISHED,RATED'),
        ),
      ).toBe(true);
    });
  });

  it('старая ссылка с «Рейтинг начислен» открывается как «Завершён»', async () => {
    renderAt(`/tournaments?month=${FIXTURE_MONTH}&status=RATED`);

    await screen.findByRole('link', { name: TOURNAMENT.name });

    expect(
      requests.some(
        (url) =>
          url.includes('/tournaments?') &&
          decodeURIComponent(url).includes('status=FINISHED,RATED'),
      ),
    ).toBe(true);
    expect(
      screen
        .getAllByText(ru['tournament.status.FINISHED'])
        .some((node) => node.closest('.MuiChip-root')),
    ).toBe(true);
  });

  it('пустой ответ по фильтру предлагает снять фильтры, а не «нет данных»', async () => {
    vi.stubGlobal('fetch', (input: unknown) => {
      const url = String(input);
      return Promise.resolve(url.includes('/players') ? reply(pageOf([])) : answer(url));
    });

    renderAt('/players?search=Нетакого');

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
  it('результаты турниров — турнир ссылкой и призёры ссылками на профили', async () => {
    renderAt('/');

    const podiums = await screen.findByText(ru['home.results.title']);
    const section = podiums.closest('section');
    if (section === null) throw new Error('раздел результатов не найден');

    const winner = await within(section).findByRole('link', { name: playerName(PLAYERS.first) });
    expect(winner.getAttribute('href')).toBe(`/players/${PLAYERS.first.id}`);
    expect(within(section).getByRole('link', { name: TOURNAMENT.name }).getAttribute('href')).toBe(
      `/tournaments/${TOURNAMENT_ID}`,
    );
    // Делённое третье подписано диапазоном для чтеца.
    expect(
      within(section).getByLabelText(fill(ru['home.results.place'], { place: '3–4' })),
    ).toBeDefined();
  });

  it('лучшие победы — счёт по партиям и прирост победителя со знаком', async () => {
    renderAt('/');

    const title = await screen.findByText(ru['home.stats.upsets']);
    const table = title.closest('[data-home-upsets]');
    if (!(table instanceof HTMLElement)) throw new Error('таблица лучших побед не найдена');

    expect(within(table).getByText('3:1')).toBeDefined();
    expect(within(table).getByText('+14.50')).toBeDefined();
    expect(within(table).getByText('-14.50')).toBeDefined();
  });

  it('ближайшие турниры — строками в колонке турниров, со ссылкой на календарь', async () => {
    renderAt('/');

    const upcoming = await screen.findByText(ru['home.upcoming.title']);
    const block = upcoming.closest('section');
    if (block === null) throw new Error('блок ближайших не найден');

    expect(
      (await within(block).findByRole('link', { name: TOURNAMENT.name })).getAttribute('href'),
    ).toBe(`/tournaments/${TOURNAMENT_ID}`);
    expect(
      within(block).getByRole('link', { name: ru['home.upcoming.all'] }).getAttribute('href'),
    ).toBe('/tournaments');
  });

  it('поиск на первом экране ведёт в рейтинг с запросом', async () => {
    renderAt('/');

    fireEvent.change(await screen.findByRole('searchbox', { name: ru['ratings.search'] }), {
      target: { value: 'Иванов' },
    });
    fireEvent.click(screen.getByRole('button', { name: ru['home.hero.find'] }));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/players');
    });
    expect(decodeURIComponent(window.location.search)).toContain('Иванов');
  });
});

describe('клубы', () => {
  it('раздел есть в шапке на любой публичной странице', async () => {
    renderAt('/players');

    const links = await screen.findAllByRole('link', { name: ru['nav.clubs'] });

    expect(links[0]?.getAttribute('href')).toBe('/clubs');
  });

  it('клуб не заводится со списка — только заявкой', async () => {
    // Клуб заводит администратор по заявке «Напишите нам» — ADR-049.
    renderAt('/clubs');

    // Заявка — в шапке списка и в блоке «Ваш клуб в KTTF» внизу (ADR-071).
    const apply = await screen.findAllByRole('link', { name: ru['clubs.apply'] });

    expect(apply.map((link) => link.getAttribute('href'))).toEqual(['/feedback', '/feedback']);
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
