import type { AuthUserView, CoachView, TrainingGroupView, TrainingView } from '@kttf/shared/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '@/app/router';
import { ru } from '@/common/i18n/ru';
import { useSessionStore } from '@/features/auth/session-store';
import { COACH, COACH_LIST_ITEM, VISIT_TRAINING, userWithCoach } from '@/test/coach-fixtures';
import { CLUB, PLAYER_PROFILE, pageOf, placesReply } from '@/test/fixtures';

/**
 * Расписание тренировок по дням — T3 (ADR-059, `docs/11` 3.3.1): редактор
 * строками и слотами в теле, показ «дни + время», «ближайшее» и набор,
 * фильтры дня, времени и набора из адреса до запроса.
 */

interface Sent {
  readonly url: string;
  readonly method: string;
  readonly body: unknown;
}

/** «пн, ср 18:00–19:30» и «сб 11:00–12:30», мало мест. */
const SCHEDULED: TrainingView = {
  ...VISIT_TRAINING,
  title: 'Вечерняя группа на выезде',
  slots: [
    { weekday: 1, startMin: 1080, endMin: 1170 },
    { weekday: 3, startMin: 1080, endMin: 1170 },
    { weekday: 6, startMin: 660, endMin: 750 },
  ],
  schedule: 'кроме праздников',
  enrollment: 'FEW',
};

const GROUPS: TrainingGroupView[] = [
  { kind: 'ANYWHERE', club: null, venue: null, trainings: [SCHEDULED] },
];

let sent: Sent[] = [];
let coach: CoachView = COACH;
let me: AuthUserView | null = null;

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

  if (path.startsWith('/auth/me')) return reply(me);
  if (/^\/coaches\/[^/]+\/trainings$/.test(path)) return reply(coach);
  if (path.startsWith('/trainings')) return reply(pageOf(GROUPS));
  if (/^\/coaches\/[^/?]+$/.test(path)) return reply(coach);
  if (path.startsWith('/coaches')) return reply(pageOf([COACH_LIST_ITEM]));
  if (/^\/clubs\/[^/?]+$/.test(path)) return reply(CLUB);
  if (path.startsWith('/clubs')) return reply(pageOf([CLUB]));
  if (/^\/players\/[^/?]+$/.test(path)) return reply(PLAYER_PROFILE);

  throw new Error(`Неожидаемый запрос: ${method} ${url}`);
}

function renderAt(path: string, user: AuthUserView | null = null): void {
  me = user;
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

interface SavedTraining {
  readonly title: string;
  readonly slots: unknown;
  readonly schedule: string | null;
  readonly enrollment: string | null;
}

beforeEach(() => {
  window.sessionStorage.clear();
  sent = [];
  coach = { ...COACH, trainings: [SCHEDULED] };
  // Подменяется только дата: «ближайшее» считается от понедельника
  // 19 октября 2026, 17:00 в Алматы; таймеры остаются настоящими.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-19T12:00:00.000Z'));
  vi.stubGlobal('fetch', (input: unknown, init: RequestInit | undefined) =>
    Promise.resolve(answer(decodeURIComponent(String(input)), init)),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  useSessionStore.setState({ user: null, accessToken: null, isRestoring: false });
});

describe('редактор расписания в кабинете тренера', () => {
  it('слоты собраны в строки; новая строка уходит слотами по дню; набор — переключателем', async () => {
    renderAt('/cabinet/coach?tab=trainings', userWithCoach(COACH));

    const editor = await waitFor(() => element('[data-schedule-editor]'));
    const lines = editor.querySelectorAll<HTMLElement>('[data-schedule-line]');
    expect(lines).toHaveLength(2);
    const [first, second] = [...lines];
    if (first === undefined || second === undefined) throw new Error('нет строк');
    expect(within(first).getByRole('button', { name: 'пн' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(within(first).getByRole('button', { name: 'ср' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(within(first).getByLabelText(ru['training.schedule.from'])).toHaveProperty(
      'value',
      '18:00',
    );
    expect(within(second).getByLabelText(ru['training.schedule.to'])).toHaveProperty(
      'value',
      '12:30',
    );
    expect(screen.getByLabelText(ru['coach.editor.schedule'])).toHaveProperty(
      'value',
      'кроме праздников',
    );

    // Пятница добавляется в первую строку, «мало мест» сменяется на «есть места».
    fireEvent.click(within(first).getByRole('button', { name: 'пт' }));
    fireEvent.click(screen.getByRole('radio', { name: ru['training.enrollment.OPEN'] }));
    fireEvent.click(screen.getByRole('button', { name: ru['manage.page.save'] }));

    await waitFor(() => {
      expect(requests('PUT', `/coaches/${COACH.id}/trainings`)).toHaveLength(1);
    });
    const body = requests('PUT', `/coaches/${COACH.id}/trainings`)[0]?.body as {
      trainings: SavedTraining[];
    };
    expect(body.trainings[0]).toMatchObject({
      slots: [
        { weekday: 1, startMin: 1080, endMin: 1170 },
        { weekday: 3, startMin: 1080, endMin: 1170 },
        { weekday: 5, startMin: 1080, endMin: 1170 },
        { weekday: 6, startMin: 660, endMin: 750 },
      ],
      schedule: 'кроме праздников',
      enrollment: 'OPEN',
    });
  });

  it('пересечение в тот же день — текстом у строки, сохранение не уходит', async () => {
    renderAt('/cabinet/coach?tab=trainings', userWithCoach(COACH));

    const editor = await waitFor(() => element('[data-schedule-editor]'));
    fireEvent.click(within(editor).getByRole('button', { name: ru['training.schedule.add'] }));
    const added = [...editor.querySelectorAll<HTMLElement>('[data-schedule-line]')].at(-1);
    if (added === undefined) throw new Error('нет новой строки');

    fireEvent.click(within(added).getByRole('button', { name: 'ср' }));
    fireEvent.change(within(added).getByLabelText(ru['training.schedule.from']), {
      target: { value: '19:00' },
    });
    fireEvent.change(within(added).getByLabelText(ru['training.schedule.to']), {
      target: { value: '20:00' },
    });

    expect(within(added).getByText(ru['training.schedule.error.overlap'])).toBeDefined();
    expect(editor.querySelectorAll('[data-schedule-error]')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: ru['manage.page.save'] }));
    expect(await screen.findByText(ru['training.editor.coachInvalid'])).toBeDefined();
    expect(requests('PUT', `/coaches/${COACH.id}/trainings`)).toHaveLength(0);
  });
});

describe('расписание в списке и фильтры /trainings', () => {
  it('строка: дни и время, примечание, «ближайшее» и метка набора', async () => {
    renderAt('/trainings');

    const schedule = await waitFor(() => element('[data-training-schedule]'));
    expect(schedule.textContent).toBe('пн, ср 18:00–19:30 · сб 11:00–12:30 · кроме праздников');
    expect(element('[data-next-session]').textContent).toBe('Ближайшее: сегодня в 18:00');
    expect(element('[data-enrollment]').textContent).toBe(ru['training.enrollment.FEW']);
  });

  it('день, время и набор из адреса доходят до сервера', async () => {
    renderAt('/trainings?day=1,3&time=EVENING&open=true');

    await waitFor(() => element('[data-training-schedule]'));
    const request = requests('GET', '/trainings?').at(-1)?.url ?? '';
    expect(request).toContain('day=1,3');
    expect(request).toContain('time=EVENING');
    expect(request).toContain('open=true');
  });

  it('чипы дня и «Идёт набор» кладут фильтр в адрес', async () => {
    renderAt('/trainings');

    await waitFor(() => element('[data-training-schedule]'));
    const days = screen.getByRole('group', { name: ru['trainings.filter.days'] });
    fireEvent.click(within(days).getByRole('button', { name: 'сб' }));
    await waitFor(() => {
      // Роутер пишет одиночную строку из цифр в кавычках JSON — и так же читает.
      expect(JSON.parse(new URLSearchParams(window.location.search).get('day') ?? '""')).toBe('6');
    });

    fireEvent.click(screen.getByRole('button', { name: ru['trainings.filter.open'] }));
    await waitFor(() => {
      expect(new URLSearchParams(window.location.search).get('open')).toBe('true');
    });
  });
});
