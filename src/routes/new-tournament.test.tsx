import { createTournamentSchema, type AuthUserView } from '@kttf/shared/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '@/app/router';
import { ru } from '@/common/i18n/ru';
import { useSessionStore } from '@/features/auth/session-store';
import { CLUB, pageOf, TOURNAMENT, USER_WITH_PROFILE } from '@/test/fixtures';

/**
 * Создание турнира — ТЗ 4.2, редактор схемы — ТЗ 5.2 и ADR-024.
 *
 * Стережётся связка целиком: форма собирает тело, которое принимает контракт,
 * схема проведения уходит тем же значением, по которому считался предпросчёт,
 * а вход на страницу виден только тому, кто ведёт клуб.
 */

interface Sent {
  readonly url: string;
  readonly method: string;
  readonly body: unknown;
}

let sent: Sent[] = [];

function reply(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function answer(url: string, init: RequestInit | undefined): Response {
  const method = init?.method ?? 'GET';
  const raw = init?.body;

  sent.push({ url, method, body: typeof raw === 'string' ? JSON.parse(raw) : undefined });

  if (url.includes('/clubs')) return reply(pageOf([CLUB]));
  if (url.includes('/tournaments')) {
    return method === 'POST' ? reply(TOURNAMENT) : reply(pageOf([]));
  }

  throw new Error(`Неожидаемый запрос: ${url}`);
}

function renderAt(path: string, user: AuthUserView | null): void {
  useSessionStore.setState({
    user,
    accessToken: user === null ? null : 'token',
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

/** Организатор клуба-хозяина: у фикстуры это владелец `CLUB`. */
const ORGANIZER = USER_WITH_PROFILE;
const OUTSIDER: AuthUserView = { ...USER_WITH_PROFILE, clubRoles: [] };
const REFEREE: AuthUserView = {
  ...USER_WITH_PROFILE,
  clubRoles: [{ clubId: CLUB.id, role: 'REFEREE' }],
};

beforeEach(() => {
  sent = [];
  vi.stubGlobal('fetch', (input: unknown, init: RequestInit | undefined) =>
    Promise.resolve(answer(String(input), init)),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  useSessionStore.setState({ user: null, accessToken: null, isRestoring: false });
});

describe('вход в создание турнира', () => {
  it('организатор видит кнопку на календаре', async () => {
    renderAt('/tournaments', ORGANIZER);

    const link = await screen.findByRole('link', { name: ru['tournament.form.create'] });

    expect(link.getAttribute('href')).toBe('/tournaments/new');
  });

  it('игроку без роли в клубе кнопки нет', async () => {
    renderAt('/tournaments', OUTSIDER);

    await screen.findByText(ru['page.tournaments.title']);

    expect(screen.queryByRole('link', { name: ru['tournament.form.create'] })).toBeNull();
  });

  it('судье тоже нет: клуб ведут владелец и организатор', async () => {
    // ТЗ 1: доступ судьи — консоль конкретного турнира, а не управление.
    renderAt('/tournaments', REFEREE);

    await screen.findByText(ru['page.tournaments.title']);

    expect(screen.queryByRole('link', { name: ru['tournament.form.create'] })).toBeNull();
  });

  it('гостю тоже нет', async () => {
    renderAt('/tournaments', null);

    await screen.findByText(ru['page.tournaments.title']);

    expect(screen.queryByRole('link', { name: ru['tournament.form.create'] })).toBeNull();
  });
});

describe('форма создания', () => {
  it('без клуба формы нет: показывать ту, которую отвергнет сервер, незачем', async () => {
    renderAt('/tournaments/new', OUTSIDER);

    expect(await screen.findByText(ru['tournament.form.noClubs'])).toBeDefined();
    expect(screen.queryByRole('button', { name: ru['tournament.form.create'] })).toBeNull();
  });

  it('создаёт турнир телом, которое принимает контракт', async () => {
    renderAt('/tournaments/new', ORGANIZER);

    fireEvent.change(await screen.findByLabelText(ru['tournament.form.name']), {
      target: { value: 'Кубок Достык' },
    });
    fireEvent.change(screen.getByLabelText(ru['tournament.form.startsAt']), {
      target: { value: '2026-10-01T09:00' },
    });

    fireEvent.click(screen.getByRole('button', { name: ru['tournament.form.create'] }));

    await waitFor(() => {
      expect(sent.some((request) => request.method === 'POST')).toBe(true);
    });

    const [request] = sent.filter((row) => row.method === 'POST');

    // Тело проверяется той же схемой, что и на сервере: список полей не
    // повторяется здесь ещё раз.
    expect(createTournamentSchema.safeParse(request?.body).success).toBe(true);
    expect(request?.body).toMatchObject({
      name: 'Кубок Достык',
      clubId: CLUB.id,
      formatConfig: { type: 'ROUND_ROBIN', rounds: 1, setsToWin: 3 },
    });
  });

  it('схема уходит той же, что выбрана в редакторе', async () => {
    renderAt('/tournaments/new', ORGANIZER);

    fireEvent.change(await screen.findByLabelText(ru['tournament.form.name']), {
      target: { value: 'Кубок Достык' },
    });
    fireEvent.change(screen.getByLabelText(ru['tournament.form.startsAt']), {
      target: { value: '2026-10-01T09:00' },
    });

    fireEvent.change(screen.getByLabelText(ru['tournament.form.formatType']), {
      target: { value: 'GROUPS_KNOCKOUT' },
    });
    fireEvent.change(screen.getByLabelText(ru['tournament.form.groupRounds']), {
      target: { value: '2' },
    });

    fireEvent.click(screen.getByRole('button', { name: ru['tournament.form.create'] }));

    await waitFor(() => {
      expect(sent.some((request) => request.method === 'POST')).toBe(true);
    });

    const [request] = sent.filter((row) => row.method === 'POST');

    expect(request?.body).toMatchObject({
      formatConfig: { type: 'GROUPS_KNOCKOUT', groupRounds: 2, groupCount: 4 },
    });
  });

  it('без названия и даты запроса не уходит', async () => {
    renderAt('/tournaments/new', ORGANIZER);

    fireEvent.click(await screen.findByRole('button', { name: ru['tournament.form.create'] }));

    await waitFor(() => {
      expect(screen.getByText(ru['error.form.name'])).toBeDefined();
    });

    expect(sent.some((request) => request.method === 'POST')).toBe(false);
  });
});

describe('предпросчёт схемы', () => {
  it('показывает, что получится, до создания турнира', async () => {
    renderAt('/tournaments/new', ORGANIZER);

    // Круговая на шестнадцать человек: 120 встреч. Считает движок.
    expect(await screen.findByText(ru['tournament.preview.totalMatches'])).toBeDefined();
    expect(screen.getByText('120')).toBeDefined();
  });

  it('пересчитывается при смене схемы', async () => {
    renderAt('/tournaments/new', ORGANIZER);

    fireEvent.change(await screen.findByLabelText(ru['tournament.form.formatType']), {
      target: { value: 'GROUPS_KNOCKOUT' },
    });

    // Четыре группы по четверо: 24 встречи в группах, восемь выходят, сетка
    // на восьмерых — семь встреч плюс матч за третье место. Всего 32.
    expect(screen.getByText(ru['tournament.preview.groups'])).toBeDefined();
    expect(screen.getByText('32')).toBeDefined();
  });

  it('предупреждает о схеме, которую отвергнет жеребьёвка', async () => {
    renderAt('/tournaments/new', ORGANIZER);

    fireEvent.change(await screen.findByLabelText(ru['tournament.form.formatType']), {
      target: { value: 'GROUPS_KNOCKOUT' },
    });
    fireEvent.change(screen.getByLabelText(ru['tournament.form.sizing']), {
      target: { value: 'count' },
    });
    fireEvent.change(screen.getByLabelText(ru['tournament.form.groupCount']), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByLabelText(ru['tournament.form.advancePerGroup']), {
      target: { value: '1' },
    });

    expect(screen.getByText(ru['tournament.preview.tooFewAdvancing'])).toBeDefined();
  });
});
