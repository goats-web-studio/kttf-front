import type {
  AuthUserView,
  IncomingTrialRequestView,
  TrainingDetailView,
  TrainingGroupView,
  TrialRequestView,
} from '@kttf/shared/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '@/app/router';
import { fill } from '@/common/i18n';
import { ru } from '@/common/i18n/ru';
import { useSessionStore } from '@/features/auth/session-store';
import {
  COACH,
  COACH_ID,
  COACH_LIST_ITEM,
  COACH_SLUG,
  VISIT_TRAINING,
  userWithCoach,
} from '@/test/coach-fixtures';
import {
  CLUB,
  PLAYERS,
  USER_WITH_PROFILE,
  USER_WITHOUT_PROFILE,
  pageOf,
  placesReply,
} from '@/test/fixtures';

/**
 * Заявка на пробную с сайта и уведомления — T3 (ADR-059, `docs/11` 3.3.3):
 * от кнопки в окне тренировки до запроса по контракту, входящие в кабинете
 * тренера и клуба, «Мои заявки» и колокольчик.
 */

interface Sent {
  readonly url: string;
  readonly method: string;
  readonly body: unknown;
}

const DETAIL: TrainingDetailView = { ...VISIT_TRAINING, more: [] };
const GROUPS: TrainingGroupView[] = [
  { kind: 'ANYWHERE', club: null, venue: null, trainings: [VISIT_TRAINING] },
];

const COACH_TARGET = {
  kind: 'COACH',
  id: COACH_ID,
  name: 'Ержанов Асан',
  slug: COACH_SLUG,
  phone: '+7 701 123 45 67',
  whatsapp: '+7 701 123 45 67',
} as const;

const INCOMING: IncomingTrialRequestView = {
  id: '00000000-0000-4000-8000-0000000000f1',
  status: 'NEW',
  training: { id: VISIT_TRAINING.id, title: VISIT_TRAINING.title },
  target: COACH_TARGET,
  forWhom: 'CHILD',
  childAge: 9,
  preferredTime: 'будни после 18:00',
  comment: 'Играет год',
  reply: null,
  createdAt: '2026-10-22T08:00:00.000Z',
  answeredAt: null,
  requester: { name: 'Смагулов Асан', phone: '+7 701 111 22 33', playerId: PLAYERS.second.id },
  source: 'CAMPAIGN',
};

const MINE_NEW: TrialRequestView = {
  id: '00000000-0000-4000-8000-0000000000f2',
  status: 'NEW',
  training: { id: VISIT_TRAINING.id, title: VISIT_TRAINING.title },
  target: COACH_TARGET,
  forWhom: 'SELF',
  childAge: null,
  preferredTime: null,
  comment: null,
  reply: null,
  createdAt: '2026-10-22T08:00:00.000Z',
  answeredAt: null,
};

const MINE_ACCEPTED: TrialRequestView = {
  ...MINE_NEW,
  id: '00000000-0000-4000-8000-0000000000f3',
  status: 'ACCEPTED',
  reply: 'Ждём в субботу в 10:00',
  answeredAt: '2026-10-22T09:00:00.000Z',
};

const NOTE_NEW = {
  id: '00000000-0000-4000-8000-0000000000a1',
  type: 'TRIAL_REQUEST_NEW',
  readAt: null,
  createdAt: '2026-10-22T09:00:00.000Z',
  data: {
    trialRequestId: INCOMING.id,
    trainingTitle: 'Вечерняя группа',
    requesterName: 'Смагулов Асан',
    inbox: { kind: 'CLUB', id: CLUB.id, name: CLUB.name },
  },
};
const NOTE_ANSWERED = {
  id: '00000000-0000-4000-8000-0000000000a2',
  type: 'TRIAL_REQUEST_ANSWERED',
  readAt: '2026-10-22T10:00:00.000Z',
  createdAt: '2026-10-22T09:30:00.000Z',
  data: {
    trialRequestId: MINE_ACCEPTED.id,
    trainingTitle: VISIT_TRAINING.title,
    status: 'ACCEPTED',
    targetName: 'Ержанов Асан',
  },
};
/** Тип, которого этот клиент ещё не знает: строки быть не должно. */
const NOTE_UNKNOWN = {
  id: '00000000-0000-4000-8000-0000000000a3',
  type: 'TOURNAMENT_REMINDER',
  readAt: null,
  createdAt: '2026-10-22T11:00:00.000Z',
  data: { tournamentId: CLUB.id },
};

let sent: Sent[] = [];
let createReply: { body: unknown; status: number } = { body: MINE_NEW, status: 201 };
let mine: TrialRequestView[] = [];

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

  if (path.startsWith('/auth/me')) return reply(USER_WITH_PROFILE);
  if (path === '/notifications/unread') return reply({ unread: 3 });
  if (path === '/notifications/read') return reply(undefined, 204);
  if (path.startsWith('/notifications')) {
    return reply({ ...pageOf([NOTE_UNKNOWN, NOTE_NEW, NOTE_ANSWERED]), total: 3 });
  }
  if (path.startsWith('/me/trial-requests')) return reply(pageOf(mine));
  if (/^\/trial-requests\/[^/]+\/(answer|cancel)$/.test(path)) return reply(MINE_NEW);
  if (/^\/trainings\/[^/]+\/trial-requests$/.test(path)) {
    return reply(createReply.body, createReply.status);
  }
  if (/^\/trainings\/[^/?]+$/.test(path)) return reply(DETAIL);
  if (path.startsWith('/trainings')) return reply(pageOf(GROUPS));
  if (/^\/(coaches|clubs)\/[^/]+\/trial-requests\/count$/.test(path)) return reply({ new: 2 });
  if (/^\/(coaches|clubs)\/[^/]+\/trial-requests/.test(path)) return reply(pageOf([INCOMING]));
  if (/^\/coaches\/[^/?]+$/.test(path)) return reply(COACH);
  if (path.startsWith('/coaches')) return reply(pageOf([COACH_LIST_ITEM]));
  if (/^\/clubs\/[^/]+\/trainings\/manage$/.test(path)) {
    return reply({ trainings: [], requests: [], coachTrainings: [] });
  }
  if (/^\/clubs\/[^/]+\/staff\/manage$/.test(path)) {
    return reply({ active: [], invited: [], requests: [] });
  }
  if (/^\/clubs\/[^/?]+$/.test(path)) return reply(CLUB);
  if (path.startsWith('/clubs')) return reply(pageOf([CLUB]));

  throw new Error(`Неожидаемый запрос: ${method} ${url}`);
}

function renderAt(path: string, user: AuthUserView | null = null): void {
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
}

function element(selector: string, root: ParentNode = document): HTMLElement {
  const found = root.querySelector<HTMLElement>(selector);
  if (found === null) throw new Error(`Нет элемента ${selector}`);
  return found;
}

const requests = (method: string, part: string): Sent[] =>
  sent.filter((request) => request.method === method && request.url.includes(part));

beforeEach(() => {
  window.sessionStorage.clear();
  sent = [];
  createReply = { body: MINE_NEW, status: 201 };
  mine = [];
  // jsdom не прокручивает; «Мои заявки» прокручивают к себе по якорю.
  Element.prototype.scrollIntoView = () => undefined;
  vi.stubGlobal('fetch', (input: unknown, init: RequestInit | undefined) =>
    Promise.resolve(answer(decodeURIComponent(String(input)), init)),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  useSessionStore.setState({ user: null, accessToken: null, isRestoring: false });
});

/** Окно тренировки и в нём — форма заявки. */
async function openForm(): Promise<HTMLElement> {
  renderAt(`/trainings?training=${VISIT_TRAINING.id}`, USER_WITH_PROFILE);
  fireEvent.click(await screen.findByRole('button', { name: ru['trial.action'] }));

  return waitFor(() => element(`[data-trial-dialog="${VISIT_TRAINING.id}"]`));
}

describe('заявка на пробную в окне тренировки', () => {
  it('гостю — вход с возвратом к тренировке вместо формы', async () => {
    renderAt(`/trainings?training=${VISIT_TRAINING.id}`);

    const signIn = await screen.findByRole('link', { name: ru['trial.signIn'] });
    const href = decodeURIComponent(signIn.getAttribute('href') ?? '');
    expect(href.startsWith('/login?redirect=')).toBe(true);
    expect(href).toContain(`/trainings?training=${VISIT_TRAINING.id}`);
    expect(screen.queryByRole('button', { name: ru['trial.action'] })).toBeNull();
  });

  it('за ребёнка без возраста не уходит; с возрастом — тело по контракту и источник', async () => {
    window.sessionStorage.setItem('kttf.trafficSource', 'CAMPAIGN');
    const form = await openForm();

    // Адресат и что он увидит — до отправки.
    expect(
      within(form).getByText(fill(ru['trial.form.toCoach'], { name: 'Ержанов Асан' })),
    ).toBeDefined();
    expect(within(form).getByText(ru['trial.form.privacyCoach'])).toBeDefined();

    fireEvent.click(within(form).getByRole('button', { name: ru['trial.for.CHILD'] }));
    fireEvent.click(within(form).getByRole('button', { name: ru['trial.form.submit'] }));
    expect(
      await within(form).findByText(fill(ru['trial.form.childAgeError'], { min: '3', max: '17' })),
    ).toBeDefined();
    expect(requests('POST', '/trial-requests')).toHaveLength(0);

    fireEvent.change(within(form).getByLabelText(ru['trial.form.childAge'], { exact: false }), {
      target: { value: '9' },
    });
    fireEvent.change(within(form).getByLabelText(ru['trial.form.preferredTime']), {
      target: { value: ' будни после 18:00 ' },
    });
    fireEvent.click(within(form).getByRole('button', { name: ru['trial.form.submit'] }));

    await waitFor(() => {
      expect(requests('POST', `/trainings/${VISIT_TRAINING.id}/trial-requests`)[0]?.body).toEqual({
        forWhom: 'CHILD',
        childAge: 9,
        preferredTime: 'будни после 18:00',
        source: 'CAMPAIGN',
      });
    });
    expect(await screen.findByText(ru['trial.form.sentTitle'])).toBeDefined();
    expect(screen.getByText(ru['trial.form.sentText'])).toBeDefined();
  });

  it('повтор — текст отказа TRIAL_REQUEST_EXISTS', async () => {
    createReply = {
      body: { error: { code: 'TRIAL_REQUEST_EXISTS', message: 'exists' } },
      status: 409,
    };
    const form = await openForm();

    fireEvent.click(within(form).getByRole('button', { name: ru['trial.form.submit'] }));

    expect(await within(form).findByText(ru['error.api.TRIAL_REQUEST_EXISTS'])).toBeDefined();
    expect(requests('POST', '/trial-requests')[0]?.body).toEqual({
      forWhom: 'SELF',
      source: 'ORGANIC',
    });
  });

  it('тренеру на свою тренировку кнопки нет', async () => {
    renderAt(`/trainings?training=${VISIT_TRAINING.id}`, userWithCoach(COACH));

    await waitFor(() => element('[data-training-booking-block]'));
    expect(document.querySelector('[data-trial-action]')).toBeNull();
  });
});

describe('вкладка «Заявки» в кабинете', () => {
  it('тренер: метка новых, заявка с контактами, «Принять» шлёт ответ', async () => {
    renderAt('/cabinet/coach?tab=requests', userWithCoach(COACH));

    expect(await screen.findByRole('tab', { name: `${ru['trial.tab']} (2)` })).toBeDefined();
    const item = await waitFor(() => element(`[data-trial-request="${INCOMING.id}"]`));
    expect(requests('GET', `/coaches/${COACH_ID}/trial-requests?`)[0]?.url).toContain('status=NEW');

    expect(within(item).getByText(fill(ru['trial.childAge'], { age: '9' }))).toBeDefined();
    expect(within(item).getByText('будни после 18:00')).toBeDefined();
    expect(within(item).getByText('Играет год')).toBeDefined();
    expect(within(item).getByText(ru['trial.inbox.fromAds'])).toBeDefined();
    expect(within(item).getByRole('link', { name: 'Смагулов Асан' }).getAttribute('href')).toBe(
      `/players/${PLAYERS.second.id}`,
    );
    expect(
      within(item).getByRole('link', { name: ru['club.contact.call'] }).getAttribute('href'),
    ).toBe('tel:+77011112233');
    const whatsapp = within(item).getByRole('link', { name: ru['club.contact.whatsapp'] });
    expect(decodeURIComponent(whatsapp.getAttribute('href') ?? '')).toBe(
      `https://wa.me/77011112233?text=${fill(ru['trial.inbox.message'], {
        name: 'Ержанов Асан',
        training: VISIT_TRAINING.title,
      })}`,
    );

    fireEvent.change(within(item).getByLabelText(ru['trial.inbox.reply']), {
      target: { value: 'Ждём в субботу' },
    });
    fireEvent.click(within(item).getByRole('button', { name: ru['trial.inbox.accept'] }));
    await waitFor(() => {
      expect(requests('POST', `/trial-requests/${INCOMING.id}/answer`)[0]?.body).toEqual({
        status: 'ACCEPTED',
        reply: 'Ждём в субботу',
      });
    });
  });

  it('клуб: та же вкладка по адресу клуба; «Все» — без фильтра статуса', async () => {
    renderAt(`/cabinet/club/${CLUB.id}?tab=requests`, USER_WITH_PROFILE);

    expect(await screen.findByRole('tab', { name: `${ru['trial.tab']} (2)` })).toBeDefined();
    const item = await waitFor(() => element(`[data-trial-request="${INCOMING.id}"]`));
    fireEvent.click(within(item).getByRole('button', { name: ru['trial.inbox.decline'] }));
    await waitFor(() => {
      expect(requests('POST', `/trial-requests/${INCOMING.id}/answer`)[0]?.body).toEqual({
        status: 'DECLINED',
      });
    });

    fireEvent.click(screen.getByRole('radio', { name: ru['trial.inbox.filterAll'] }));
    await waitFor(() => {
      expect(
        requests('GET', `/clubs/${CLUB.id}/trial-requests?`).some(
          (request) => !request.url.includes('status='),
        ),
      ).toBe(true);
    });
  });
});

describe('«Мои заявки» на рабочем столе', () => {
  it('новую можно отозвать, у принятой — ответ и контакты адресата', async () => {
    mine = [MINE_NEW, MINE_ACCEPTED];
    renderAt('/cabinet', USER_WITHOUT_PROFILE);

    const accepted = await waitFor(() => element(`[data-my-trial-request="${MINE_ACCEPTED.id}"]`));
    expect(within(accepted).getByText('Ждём в субботу в 10:00')).toBeDefined();
    expect(
      within(accepted)
        .getByRole('link', { name: ru['club.contact.whatsapp'] })
        .getAttribute('href')
        ?.startsWith('https://wa.me/77011234567?text='),
    ).toBe(true);
    expect(within(accepted).queryByRole('button', { name: ru['trial.mine.cancel'] })).toBeNull();

    const fresh = element(`[data-my-trial-request="${MINE_NEW.id}"]`);
    expect(within(fresh).queryByRole('link', { name: ru['club.contact.whatsapp'] })).toBeNull();
    fireEvent.click(within(fresh).getByRole('button', { name: ru['trial.mine.cancel'] }));
    await waitFor(() => {
      expect(requests('POST', `/trial-requests/${MINE_NEW.id}/cancel`)).toHaveLength(1);
    });
  });

  it('заявок нет — блока нет', async () => {
    renderAt('/cabinet', USER_WITHOUT_PROFILE);

    await waitFor(() => {
      expect(requests('GET', '/me/trial-requests')).toHaveLength(1);
    });
    await screen.findByText(ru['cabinet.noProfile.title']);
    expect(document.querySelector('[data-my-trial-requests]')).toBeNull();
  });
});

describe('уведомления', () => {
  it('колокольчик: число непрочитанных, неизвестный тип пропущен, строка ведёт и читается', async () => {
    renderAt('/cabinet', USER_WITHOUT_PROFILE);

    const bell = await screen.findByRole('button', {
      name: fill(ru['notifications.bellUnread'], { count: '3' }),
    });
    fireEvent.click(bell);

    const popover = await waitFor(() => element('[data-notifications-popover]'));
    await waitFor(() => {
      expect(popover.querySelectorAll('[data-notification]')).toHaveLength(2);
    });
    expect(popover.querySelector(`[data-notification="${NOTE_UNKNOWN.id}"]`)).toBeNull();

    const row = element(`[data-notification="${NOTE_NEW.id}"]`, popover);
    expect(row.getAttribute('data-unread')).toBe('true');
    expect(row.textContent).toContain(
      fill(ru['notifications.TRIAL_REQUEST_NEW'], {
        training: 'Вечерняя группа',
        requester: 'Смагулов Асан',
      }),
    );
    fireEvent.click(row);

    await waitFor(() => {
      expect(requests('POST', '/notifications/read')[0]?.body).toEqual({ ids: [NOTE_NEW.id] });
    });
    await waitFor(() => {
      expect(window.location.pathname).toBe(`/cabinet/club/${CLUB.id}`);
    });
    expect(window.location.search).toContain('tab=requests');
  });

  it('страница: ответ ведёт в «Мои заявки», «Прочитать все» — без списка', async () => {
    renderAt('/notifications', USER_WITHOUT_PROFILE);

    const answered = await waitFor(() => element(`[data-notification="${NOTE_ANSWERED.id}"]`));
    expect(answered.getAttribute('href')).toBe('/cabinet#my-requests');
    expect(answered.getAttribute('data-unread')).toBeNull();
    expect(answered.textContent).toContain(
      fill(ru['notifications.TRIAL_REQUEST_ACCEPTED'], {
        target: 'Ержанов Асан',
        training: VISIT_TRAINING.title,
      }),
    );
    expect(document.querySelectorAll('main [data-notification]')).toHaveLength(2);

    fireEvent.click(await screen.findByRole('button', { name: ru['notifications.readAll'] }));
    await waitFor(() => {
      expect(requests('POST', '/notifications/read')[0]?.body).toEqual({});
    });
  });
});
