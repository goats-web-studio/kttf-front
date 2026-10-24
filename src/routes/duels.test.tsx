import type {
  AdminDuelItemView,
  AuthUserView,
  DuelItemView,
  DuelPlayer,
  DuelView,
  PlayerView,
} from '@kttf/shared/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import dayjs from 'dayjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '@/app/router';
import { fill } from '@/common/i18n';
import { ru } from '@/common/i18n/ru';
import { useSessionStore } from '@/features/auth/session-store';
import {
  ADMIN_USER,
  CITIES,
  CLUB,
  PLAYERS,
  PLAYER_IDS,
  PLAYER_PROFILE,
  USER_WITH_PROFILE,
  cityRef,
  pageOf,
  placesReply,
} from '@/test/fixtures';

/**
 * Дуэли и спарринги — ADR-065, `docs/13` 5: доска с фильтрами в адресе,
 * форма предложения и вызова, страница дуэли с кнопками строго по `can`,
 * действия — запросами по контракту, «Мои дуэли» и очередь администратора.
 */

interface Sent {
  readonly url: string;
  readonly method: string;
  readonly body: unknown;
}

const ME = PLAYER_IDS.first;
const DUEL_ID = '00000000-0000-4000-8000-0000000000d1';
const SLOT_1 = '00000000-0000-4000-8000-0000000000e1';
const SLOT_2 = '00000000-0000-4000-8000-0000000000e2';
const RESPONSE_ID = '00000000-0000-4000-8000-0000000000e9';

function duelPlayer(id: string, name: string, rating: string): DuelPlayer {
  return {
    id,
    name,
    photoUrl: null,
    rating,
    isProvisional: false,
    city: cityRef(CITIES.almaty),
  };
}

const ME_PLAYER = duelPlayer(ME, 'Ержанов Асан', '520.00');
const SECOND = duelPlayer(PLAYER_IDS.second, 'Смагулов Асан', '480.00');
const THIRD = duelPlayer(PLAYER_IDS.third, 'Тлеубаев Асан', '460.00');

const OPEN_ITEM: DuelItemView = {
  id: DUEL_ID,
  kind: 'DUEL',
  rated: true,
  bestOf: 5,
  status: 'OPEN',
  author: SECOND,
  opponent: null,
  venue: {
    club: { id: CLUB.id, name: CLUB.name, address: 'ул. Абая, 10' },
    venueName: null,
    venueAddress: null,
    city: cityRef(CITIES.almaty),
  },
  slots: [
    { id: SLOT_1, startsAt: '2026-11-07T13:00:00.000Z', endsAt: '2026-11-07T15:00:00.000Z' },
    { id: SLOT_2, startsAt: '2026-11-08T13:00:00.000Z', endsAt: '2026-11-08T15:00:00.000Z' },
  ],
  startsAt: null,
  endsAt: null,
  note: 'Играю атакующе',
  responsesNew: null,
  result: null,
  ratingChanges: [],
  createdAt: '2026-10-24T08:00:00.000Z',
};

const NO_CAN: DuelView['can'] = {
  respond: false,
  withdraw: false,
  decline: false,
  cancel: false,
  report: false,
  confirm: false,
  dispute: false,
  start: false,
  score: false,
  reschedule: false,
  answerReschedule: false,
};

function view(patch: Partial<DuelView> = {}): DuelView {
  return {
    ...OPEN_ITEM,
    responses: [],
    ratingChanges: [],
    annulledAt: null,
    annulReason: null,
    ratingSkipped: null,
    startedAt: null,
    sets: [],
    startableAt: null,
    reschedule: null,
    contacts: null,
    can: NO_CAN,
    ...patch,
  };
}

/** Назначенная дуэль меня с вторым игроком — время прошло, можно вносить счёт. */
const SCHEDULED: Partial<DuelView> = {
  status: 'SCHEDULED',
  author: ME_PLAYER,
  opponent: SECOND,
  startsAt: '2026-10-20T13:00:00.000Z',
  endsAt: '2026-10-20T15:00:00.000Z',
};

const RESULT = {
  winnerId: PLAYER_IDS.second,
  winnerSets: 3,
  loserSets: 1,
  reportedById: PLAYER_IDS.second,
  reportedAt: '2026-10-20T16:00:00.000Z',
  confirmBy: '2026-10-22T16:00:00.000Z',
  confirmedAt: null,
  disputeComment: null,
  resolutionComment: null,
};

let sent: Sent[] = [];
let duel: DuelView = view();
let actionReply: { body: unknown; status: number } | null = null;
let opponent: PlayerView = { ...PLAYERS.second, userId: '00000000-0000-4000-8000-000000000062' };
let mine: DuelItemView[] = [];
let admin: AdminDuelItemView[] = [];

function reply(body: unknown, status = 200): Response {
  return {
    ok: status < 400,
    status,
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
  } as unknown as Response;
}

function answer(url: string, init: RequestInit | undefined): Response {
  const method = init?.method ?? 'GET';
  const raw = init?.body;
  const path = url.replace(/^\/api\/v1/, '');

  sent.push({ url: path, method, body: typeof raw === 'string' ? JSON.parse(raw) : undefined });

  const places = placesReply(url);
  if (places !== undefined) return reply(places);

  if (path === '/notifications/unread') return reply({ unread: 0 });
  if (path.startsWith('/notifications')) return reply(pageOf([]));
  if (method === 'POST') {
    return actionReply === null ? reply(duel) : reply(actionReply.body, actionReply.status);
  }
  if (path.startsWith('/forum/subjects/DUEL/'))
    return reply({ section: null, topic: null, posts: [] });
  if (path.startsWith('/me/duels')) return reply(pageOf(mine));
  if (path.startsWith('/admin/duels')) return reply(pageOf(admin));
  if (/^\/duels\/[^/?]+$/.test(path)) return reply(duel);
  if (path.startsWith('/duels')) return reply(pageOf([OPEN_ITEM]));
  if (path === `/players/${ME}`) return reply(PLAYER_PROFILE);
  if (path === `/players/${PLAYER_IDS.second}`) return reply(opponent);
  if (path.startsWith('/clubs')) return reply(pageOf([CLUB]));

  throw new Error(`Неожидаемый запрос: ${method} ${url}`);
}

function renderAt(path: string, user: AuthUserView | null = USER_WITH_PROFILE) {
  useSessionStore.setState({
    user,
    accessToken: user === null ? null : 'access-token',
    isRestoring: false,
  });
  window.history.pushState({}, '', path);

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter({ queryClient, session: user });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return router;
}

function element(selector: string, root: ParentNode = document): HTMLElement {
  const found = root.querySelector<HTMLElement>(selector);
  if (found === null) throw new Error(`Нет элемента ${selector}`);
  return found;
}

const requests = (method: string, part: string): Sent[] =>
  sent.filter((request) => request.method === method && request.url.includes(part));

async function choose(field: string, option: string): Promise<void> {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: field }));
  fireEvent.click(await screen.findByRole('option', { name: option }));
}

beforeEach(() => {
  sent = [];
  duel = view();
  actionReply = null;
  opponent = { ...PLAYERS.second, userId: '00000000-0000-4000-8000-000000000062' };
  mine = [];
  admin = [];
  vi.stubGlobal('fetch', (input: unknown, init: RequestInit | undefined) =>
    Promise.resolve(answer(decodeURIComponent(String(input)), init)),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  useSessionStore.setState({ user: null, accessToken: null, isRestoring: false });
});

describe('доска «Дуэли и спарринги»', () => {
  it('карточка открытого предложения; фильтр вида и вкладка — в адрес и в запрос', async () => {
    const router = renderAt('/duels', null);

    const card = await waitFor(() => element(`[data-duel-card="${DUEL_ID}"]`));
    expect(within(card).getByText('Смагулов Асан')).toBeDefined();
    expect(within(card).getByText(ru['duel.bestOf.5'])).toBeDefined();
    expect(within(card).getByText('Играю атакующе')).toBeDefined();
    expect(within(card).getByRole('link', { name: CLUB.name }).getAttribute('href')).toBe(
      `/clubs/${CLUB.id}`,
    );
    expect(
      within(card).getByRole('link', { name: ru['duel.card.respond'] }).getAttribute('href'),
    ).toBe(`/duels/${DUEL_ID}`);
    expect(requests('GET', '/duels?')[0]?.url).toContain('scope=open');

    await choose(ru['duel.filter.kind'], ru['duel.kind.SPARRING']);
    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({ kind: 'SPARRING' });
    });
    await waitFor(() => {
      expect(requests('GET', 'kind=SPARRING')).toHaveLength(1);
    });

    fireEvent.click(screen.getByRole('radio', { name: ru['duel.board.recent'] }));
    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({ scope: 'recent', kind: 'SPARRING' });
    });
    await waitFor(() => {
      expect(requests('GET', 'scope=recent').length).toBeGreaterThan(0);
    });
  });
});

describe('предложить игру', () => {
  it('без времени не уходит; свой зал и вариант — тело по контракту', async () => {
    const router = renderAt('/duels/new');

    const form = await waitFor(() => element('[data-duel-form]'));
    fireEvent.click(within(form).getByRole('button', { name: ru['duel.new.publish'] }));
    expect(await within(form).findByText(ru['duel.slot.error.incomplete'])).toBeDefined();
    expect(within(form).getByText(ru['duel.venue.clubError'])).toBeDefined();
    expect(requests('POST', '/duels')).toHaveLength(0);

    fireEvent.click(within(form).getByRole('button', { name: ru['duel.venue.own'] }));
    fireEvent.change(within(form).getByLabelText(ru['duel.venue.name'], { exact: false }), {
      target: { value: 'Спортзал школы № 12' },
    });
    fireEvent.change(
      within(form).getByRole('textbox', { name: new RegExp(`^${ru['duel.venue.address']}`) }),
      {
        target: { value: 'ул. Абая, 10' },
      },
    );
    const day = dayjs().add(2, 'day');
    const dateInput = within(form)
      .getAllByLabelText(fill(ru['duel.slot.label'], { n: '1' }))
      .find((node) => node instanceof HTMLInputElement);
    if (dateInput === undefined) throw new Error('Поле даты не найдено');
    fireEvent.change(dateInput, { target: { value: day.format('DD.MM.YYYY') } });
    fireEvent.change(within(form).getByLabelText(ru['duel.slot.from']), {
      target: { value: '19:00' },
    });
    fireEvent.change(within(form).getByLabelText(ru['duel.slot.to']), {
      target: { value: '21:00' },
    });

    // Город своего зала по умолчанию — город игрока.
    await waitFor(() => {
      expect(requests('GET', `/players/${ME}`).length).toBeGreaterThan(0);
    });
    fireEvent.click(within(form).getByRole('button', { name: ru['duel.new.publish'] }));

    await waitFor(() => {
      expect(requests('POST', '/duels')[0]?.body).toEqual({
        kind: 'DUEL',
        rated: true,
        bestOf: 5,
        venueName: 'Спортзал школы № 12',
        venueAddress: 'ул. Абая, 10',
        cityId: CITIES.almaty.id,
        // Контакт по умолчанию — телефон аккаунта (ADR-068 §3).
        contact: USER_WITH_PROFILE.phone,
        slots: [
          {
            startsAt: day.hour(19).minute(0).second(0).millisecond(0).toISOString(),
            endsAt: day.hour(21).minute(0).second(0).millisecond(0).toISOString(),
          },
        ],
      });
    });
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/duels/${DUEL_ID}`);
    });
  });

  it('вызов: соперник виден; без аккаунта у соперника — предупреждение и кнопка выключена', async () => {
    renderAt(`/duels/new?opponent=${PLAYER_IDS.second}`);

    const card = await waitFor(() => element(`[data-duel-opponent="${PLAYER_IDS.second}"]`));
    expect(within(card).getByText('Смагулов Асан')).toBeDefined();
    expect(
      screen.getByRole('button', { name: ru['duel.new.challenge'] }).hasAttribute('disabled'),
    ).toBe(false);
  });

  it('вызов игрока без аккаунта не отправить', async () => {
    opponent = { ...PLAYERS.second, userId: null };
    renderAt(`/duels/new?opponent=${PLAYER_IDS.second}`);

    expect(await screen.findByText(ru['duel.error.opponent.NO_ACCOUNT'])).toBeDefined();
    expect(
      screen.getByRole('button', { name: ru['duel.new.challenge'] }).hasAttribute('disabled'),
    ).toBe(true);
  });

  it('без профиля игрока — путь в настройки вместо формы', async () => {
    renderAt('/duels/new', { ...USER_WITH_PROFILE, playerId: null });

    await waitFor(() => element('[data-duel-gate="profile"]'));
    expect(document.querySelector('[data-duel-form]')).toBeNull();
  });
});

describe('страница дуэли', () => {
  it('гостю — только сведения: ни одной кнопки действия', async () => {
    renderAt(`/duels/${DUEL_ID}`, null);

    await waitFor(() => element('[data-duel-state="OPEN"]'));
    expect(screen.getByText('Играю атакующе')).toBeDefined();
    expect(document.querySelector('[data-duel-respond]')).toBeNull();
    expect(document.querySelector('[data-duel-report]')).toBeNull();
    expect(document.querySelector('[data-duel-cancel]')).toBeNull();
    expect(screen.queryByRole('button', { name: ru['duel.confirm.submit'] })).toBeNull();
  });

  it('отклик: вариант автора и сообщение уходят в /responses', async () => {
    duel = view({ can: { ...NO_CAN, respond: true } });
    renderAt(`/duels/${DUEL_ID}`);

    const form = await waitFor(() => element('[data-duel-respond]'));
    const radios = within(form).getAllByRole('radio');
    // Второй вариант автора.
    const second = radios[1];
    if (second === undefined) throw new Error('Нет второго варианта');
    fireEvent.click(second);
    fireEvent.change(within(form).getByLabelText(ru['duel.respond.message']), {
      target: { value: 'Буду с ракеткой' },
    });
    fireEvent.click(within(form).getByRole('button', { name: ru['duel.respond.submit'] }));

    await waitFor(() => {
      expect(requests('POST', `/duels/${DUEL_ID}/responses`)[0]?.body).toEqual({
        slotId: SLOT_2,
        message: 'Буду с ракеткой',
        contact: USER_WITH_PROFILE.phone,
      });
    });
  });

  it('автор: «Принять» — запрос по отклику; предел частоты объяснён', async () => {
    duel = view({
      author: ME_PLAYER,
      responsesNew: 1,
      responses: [
        {
          id: RESPONSE_ID,
          player: THIRD,
          slotId: SLOT_1,
          proposedStartsAt: null,
          proposedEndsAt: null,
          message: 'Давайте в субботу',
          status: 'NEW',
          createdAt: '2026-10-24T09:00:00.000Z',
        },
      ],
      can: { ...NO_CAN, cancel: true },
    });
    actionReply = {
      body: { error: { code: 'DUEL_RATING_LIMIT', message: 'x', details: { kind: 'PAIR' } } },
      status: 409,
    };
    renderAt(`/duels/${DUEL_ID}`);

    const row = await waitFor(() => element(`[data-duel-response="${RESPONSE_ID}"]`));
    expect(within(row).getByText('«Давайте в субботу»')).toBeDefined();
    expect(document.querySelector('[data-duel-respond]')).toBeNull();
    expect(document.querySelector('[data-duel-cancel]')).not.toBeNull();

    fireEvent.click(within(row).getByRole('button', { name: ru['duel.response.accept'] }));
    await waitFor(() => {
      expect(requests('POST', `/duel-responses/${RESPONSE_ID}/accept`)).toHaveLength(1);
    });
    expect(await within(row).findByText(ru['duel.error.rating.PAIR'])).toBeDefined();
  });

  it('счёт: победитель и партии проигравшего — в /result', async () => {
    duel = view({ ...SCHEDULED, can: { ...NO_CAN, report: true, cancel: false } });
    renderAt(`/duels/${DUEL_ID}`);

    // У назначенной ручной счёт — вторичной ссылкой под табло (ADR-068).
    fireEvent.click(await screen.findByRole('button', { name: ru['duel.match.manual'] }));
    const form = await waitFor(() => element('[data-duel-report]'));
    const submit = within(form).getByRole('button', { name: ru['duel.report.submit'] });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(
      within(form).getByRole('button', {
        name: fill(ru['duel.report.me'], { name: 'Ержанов Асан' }),
      }),
    );
    fireEvent.click(within(form).getByRole('button', { name: '3:1' }));
    fireEvent.click(submit);

    await waitFor(() => {
      expect(requests('POST', `/duels/${DUEL_ID}/result`)[0]?.body).toEqual({
        winnerId: ME,
        winnerSets: 3,
        loserSets: 1,
      });
    });
  });

  it('подтвердить и оспорить — свои запросы; комментарий спора обязателен', async () => {
    duel = view({
      ...SCHEDULED,
      status: 'REPORTED',
      result: RESULT,
      can: { ...NO_CAN, confirm: true, dispute: true },
    });
    renderAt(`/duels/${DUEL_ID}`);

    fireEvent.click(await screen.findByRole('button', { name: ru['duel.confirm.submit'] }));
    await waitFor(() => {
      expect(requests('POST', `/duels/${DUEL_ID}/confirm`)).toHaveLength(1);
    });

    fireEvent.click(screen.getByRole('button', { name: ru['duel.dispute.action'] }));
    const dialog = await screen.findByRole('dialog');
    const submit = within(dialog).getByRole('button', { name: ru['duel.dispute.submit'] });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(within(dialog).getByLabelText(ru['duel.dispute.comment'], { exact: false }), {
      target: { value: 'Было 3:2 в мою пользу' },
    });
    fireEvent.click(submit);
    await waitFor(() => {
      expect(requests('POST', `/duels/${DUEL_ID}/dispute`)[0]?.body).toEqual({
        comment: 'Было 3:2 в мою пользу',
      });
    });
  });

  it('итог: счёт и изменение рейтинга обоих', async () => {
    duel = view({
      ...SCHEDULED,
      status: 'COMPLETED',
      result: { ...RESULT, confirmedAt: '2026-10-21T10:00:00.000Z' },
      ratingChanges: [
        {
          playerId: PLAYER_IDS.second,
          ratingBefore: '480.00',
          delta: '6.20',
          ratingAfter: '486.20',
        },
        { playerId: ME, ratingBefore: '520.00', delta: '-6.20', ratingAfter: '513.80' },
      ],
    });
    renderAt(`/duels/${DUEL_ID}`);

    const result = await waitFor(() => element('[data-duel-result]'));
    expect(element('[data-duel-score]', result).textContent).toContain('3:1');
    expect(within(result).getByText('+6.20')).toBeDefined();
    expect(within(result).getByText('-6.20')).toBeDefined();
  });
});

/** Начатый матч: я — автор, до 3 побед. */
const STARTED: Partial<DuelView> = {
  ...SCHEDULED,
  startsAt: '2026-10-24T13:00:00.000Z',
  endsAt: '2026-10-24T15:00:00.000Z',
  startedAt: '2026-10-24T12:50:00.000Z',
  contacts: { mine: null, counterpart: null },
};

describe('матч дуэли (ADR-068)', () => {
  it('до начала: этапы, когда, подсказка старта, контакт соперника ссылками', async () => {
    duel = view({
      ...SCHEDULED,
      startsAt: '2030-11-07T13:00:00.000Z',
      endsAt: '2030-11-07T15:00:00.000Z',
      startableAt: '2030-11-07T12:00:00.000Z',
      contacts: { mine: '@erzhanov', counterpart: '8 701 123 45 67' },
      can: { ...NO_CAN, reschedule: true, cancel: true },
    });
    renderAt(`/duels/${DUEL_ID}`);

    const match = await waitFor(() => element('[data-duel-match="scheduled"]'));
    expect(element('[aria-current="step"]', match).getAttribute('data-stage')).toBe('scheduled');
    expect(element('[data-duel-startable]', match)).toBeDefined();
    expect(within(match).queryByRole('button', { name: ru['duel.match.start'] })).toBeNull();

    const contacts = element('[data-duel-contacts]', match);
    expect(
      within(contacts).getByRole('link', { name: ru['club.contact.call'] }).getAttribute('href'),
    ).toBe('tel:+77011234567');
    expect(
      within(contacts)
        .getByRole('link', { name: ru['club.contact.whatsapp'] })
        .getAttribute('href'),
    ).toBe('https://wa.me/77011234567');
    expect(within(contacts).getByText('@erzhanov')).toBeDefined();

    fireEvent.click(within(contacts).getByRole('button', { name: ru['duel.contact.edit'] }));
    fireEvent.change(within(contacts).getByLabelText(ru['duel.contact.label']), {
      target: { value: '@erzhanov_kz' },
    });
    fireEvent.click(within(contacts).getByRole('button', { name: ru['duel.contact.save'] }));
    await waitFor(() => {
      expect(requests('POST', `/duels/${DUEL_ID}/contact`)[0]?.body).toEqual({
        contact: '@erzhanov_kz',
      });
    });
    expect(screen.getByRole('button', { name: ru['duel.reschedule.action'] })).toBeDefined();
  });

  it('перенос: второму — «Принять» и «Отказаться» по can, запрос /reschedule/accept', async () => {
    duel = view({
      ...SCHEDULED,
      reschedule: {
        startsAt: '2030-11-08T13:00:00.000Z',
        endsAt: '2030-11-08T15:00:00.000Z',
        proposedById: PLAYER_IDS.second,
        message: 'Давай в воскресенье',
        createdAt: '2026-10-24T09:00:00.000Z',
      },
      can: { ...NO_CAN, answerReschedule: true },
    });
    renderAt(`/duels/${DUEL_ID}`);

    const card = await waitFor(() => element('[data-duel-reschedule]'));
    expect(within(card).getByText('«Давай в воскресенье»')).toBeDefined();
    expect(within(card).queryByRole('button', { name: ru['duel.reschedule.withdraw'] })).toBeNull();
    within(card).getByRole('button', { name: ru['duel.reschedule.decline'] });
    fireEvent.click(within(card).getByRole('button', { name: ru['duel.reschedule.accept'] }));
    await waitFor(() => {
      expect(requests('POST', `/duels/${DUEL_ID}/reschedule/accept`)).toHaveLength(1);
    });
  });

  it('перенос: предложившему — «Ждём ответа» и «Отозвать», без ответа', async () => {
    duel = view({
      ...SCHEDULED,
      reschedule: {
        startsAt: '2030-11-08T13:00:00.000Z',
        endsAt: '2030-11-08T15:00:00.000Z',
        proposedById: ME,
        message: null,
        createdAt: '2026-10-24T09:00:00.000Z',
      },
      can: { ...NO_CAN, answerReschedule: false },
    });
    renderAt(`/duels/${DUEL_ID}`);

    const card = await waitFor(() => element('[data-duel-reschedule]'));
    expect(within(card).getByText(ru['duel.reschedule.waiting'])).toBeDefined();
    expect(within(card).queryByRole('button', { name: ru['duel.reschedule.accept'] })).toBeNull();
    fireEvent.click(within(card).getByRole('button', { name: ru['duel.reschedule.withdraw'] }));
    await waitFor(() => {
      expect(requests('POST', `/duels/${DUEL_ID}/reschedule/withdraw`)).toHaveLength(1);
    });
  });

  it('«Начать матч» по can.start', async () => {
    duel = view({ ...SCHEDULED, can: { ...NO_CAN, start: true } });
    renderAt(`/duels/${DUEL_ID}`);

    fireEvent.click(await screen.findByRole('button', { name: ru['duel.match.start'] }));
    await waitFor(() => {
      expect(requests('POST', `/duels/${DUEL_ID}/start`)).toHaveLength(1);
    });
  });

  it('табло: партия уходит с index; «Завершить» — только когда набрано setsToWin', async () => {
    duel = view({ ...STARTED, sets: [ME, PLAYER_IDS.second], can: { ...NO_CAN, score: true } });
    renderAt(`/duels/${DUEL_ID}`);

    const board = await waitFor(() => element('[data-duel-board]'));
    expect(element('[data-duel-board-score]', board).textContent).toBe('1:1');
    expect(
      within(board).getByText(
        fill(ru['duel.match.setLine'], { n: '1', name: ru['duel.match.meShort'] }),
      ),
    ).toBeDefined();
    const finish = element('[data-duel-finish]', board);
    expect(finish.hasAttribute('disabled')).toBe(true);

    fireEvent.click(within(board).getByRole('button', { name: ru['duel.match.setMine'] }));
    await waitFor(() => {
      expect(requests('POST', `/duels/${DUEL_ID}/sets`)[0]?.body).toEqual({
        winnerId: ME,
        index: 2,
      });
    });

    fireEvent.click(within(board).getByRole('button', { name: ru['duel.match.undo'] }));
    await waitFor(() => {
      expect(requests('POST', `/duels/${DUEL_ID}/sets/undo`)[0]?.body).toEqual({ index: 2 });
    });
  });

  it('табло: 3 партии у одного — кнопки партий выключены, «Завершить» шлёт /finish', async () => {
    duel = view({
      ...STARTED,
      sets: [ME, PLAYER_IDS.second, ME, ME],
      can: { ...NO_CAN, score: true },
    });
    renderAt(`/duels/${DUEL_ID}`);

    const board = await waitFor(() => element('[data-duel-board]'));
    expect(await waitFor(() => element('[data-duel-match="score"]'))).toBeDefined();
    expect(
      within(board)
        .getByRole('button', { name: ru['duel.match.setMine'] })
        .hasAttribute('disabled'),
    ).toBe(true);
    const finish = element('[data-duel-finish]', board);
    expect(finish.hasAttribute('disabled')).toBe(false);
    fireEvent.click(finish);
    await waitFor(() => {
      expect(requests('POST', `/duels/${DUEL_ID}/finish`)).toHaveLength(1);
    });
  });

  it('табло: партию уже записал второй телефон — страница перечитывается', async () => {
    duel = view({ ...STARTED, can: { ...NO_CAN, score: true } });
    actionReply = {
      body: {
        error: { code: 'DUEL_INVALID_STATE', message: 'x', details: { status: 'SCHEDULED' } },
      },
      status: 409,
    };
    renderAt(`/duels/${DUEL_ID}`);

    const board = await waitFor(() => element('[data-duel-board]'));
    const before = requests('GET', `/duels/${DUEL_ID}`).length;
    fireEvent.click(
      within(board).getByRole('button', {
        name: ru['duel.match.setFor'],
      }),
    );
    expect(await within(board).findByText(ru['duel.match.conflict'])).toBeDefined();
    await waitFor(() => {
      expect(requests('GET', `/duels/${DUEL_ID}`).length).toBeGreaterThan(before);
    });
  });

  it('зрителю — счёт без кнопок', async () => {
    duel = view({ ...STARTED, sets: [PLAYER_IDS.second], contacts: null });
    renderAt(`/duels/${DUEL_ID}`, null);

    const board = await waitFor(() => element('[data-duel-board]'));
    expect(element('[data-duel-board-score]', board).textContent).toBe('0:1');
    expect(within(board).queryAllByRole('button')).toHaveLength(0);
    expect(within(board).getByText(ru['duel.match.live'])).toBeDefined();
  });
});

describe('«Мои дуэли»', () => {
  it('ждущие моего шага — первыми, с меткой', async () => {
    const waiting: DuelItemView = {
      ...OPEN_ITEM,
      id: '00000000-0000-4000-8000-0000000000d2',
      status: 'CHALLENGE',
      author: SECOND,
      opponent: ME_PLAYER,
    };
    mine = [{ ...OPEN_ITEM, author: ME_PLAYER, responsesNew: 0 }, waiting];
    renderAt('/duels/mine');

    await waitFor(() => element(`[data-my-duel="${waiting.id}"]`));
    const rows = [...document.querySelectorAll('[data-my-duel]')];
    expect(rows[0]?.getAttribute('data-my-duel')).toBe(waiting.id);
    expect(within(rows[0] as HTMLElement).getByText(ru['duel.todo.answer'])).toBeDefined();
    expect(requests('GET', '/me/duels')[0]?.url).toContain('scope=active');
  });
});

describe('дуэли в админке', () => {
  const DISPUTED: AdminDuelItemView = {
    ...OPEN_ITEM,
    ...SCHEDULED,
    status: 'DISPUTED',
    result: { ...RESULT, disputeComment: 'Было не так' },
    flags: ['PAIR_FREQUENT', 'PROVISIONAL'],
    ratingChanges: [],
    annulledAt: null,
    pairCount30d: 4,
  };

  it('пометки с объяснением, число встреч пары; «Решить спор» шлёт счёт и комментарий', async () => {
    admin = [DISPUTED];
    renderAt('/cabinet/duels', ADMIN_USER);

    const card = await waitFor(() => element(`[data-admin-duel="${DUEL_ID}"]`));
    expect(within(card).getByText(ru['duel.flag.PAIR_FREQUENT.hint'])).toBeDefined();
    expect(within(card).getByText(ru['duel.flag.PROVISIONAL'])).toBeDefined();
    expect(element('[data-pair-count]', card).textContent).toBe(
      fill(ru['duel.admin.pairCount'], { count: '4' }),
    );

    fireEvent.click(within(card).getByRole('button', { name: ru['duel.admin.resolve'] }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(ru['duel.admin.comment'], { exact: false }), {
      target: { value: 'По видео — 3:1' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: ru['duel.admin.resolve'] }));

    await waitFor(() => {
      expect(requests('POST', `/admin/duels/${DUEL_ID}/resolve`)[0]?.body).toEqual({
        result: { winnerId: PLAYER_IDS.second, winnerSets: 3, loserSets: 1 },
        comment: 'По видео — 3:1',
      });
    });
  });

  it('фильтр «С пометками» — в адрес и в запрос', async () => {
    const router = renderAt('/cabinet/duels', ADMIN_USER);

    fireEvent.click(await screen.findByRole('radio', { name: ru['duel.admin.flagged'] }));
    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({ flagged: true });
    });
    await waitFor(() => {
      expect(requests('GET', 'flagged=true')).toHaveLength(1);
    });
  });

  it('не администратору — отказ без запроса очереди', async () => {
    renderAt('/cabinet/duels');

    expect(await screen.findByText(ru['error.api.FORBIDDEN'])).toBeDefined();
    expect(requests('GET', '/admin/duels')).toHaveLength(0);
  });
});
