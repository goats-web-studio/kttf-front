import type {
  AuthUserView,
  ClubCoachView,
  CoachStudentsView,
  CoachView,
  PlayerProfileView,
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
  CLUB_REF,
  COACH,
  COACH_LIST_ITEM,
  COACH_REF,
  COACH_SLUG,
  userWithCoach,
} from '@/test/coach-fixtures';
import {
  CLUB,
  PLAYER_PROFILE,
  PLAYERS,
  USER_WITH_PROFILE,
  pageOf,
  placesReply,
} from '@/test/fixtures';

/**
 * Тренерский штаб, ученики и история тренера — T2.1 (ADR-059, `docs/11`
 * 3.2.1): от адреса до запроса по контракту.
 */

interface Sent {
  readonly url: string;
  readonly method: string;
  readonly body: unknown;
}

const OTHER_COACH = { ...COACH_REF, id: '00000000-0000-4000-8000-0000000000d2', slug: 'other' };
const OTHER_CLUB = { ...CLUB_REF, id: '00000000-0000-4000-8000-0000000000b2', name: 'Клуб «Спин»' };

function entry(status: ClubCoachView['status'], coach = COACH_REF, club = CLUB_REF): ClubCoachView {
  return {
    club,
    coach,
    status,
    position: status === 'ACTIVE' ? 'Старший тренер' : null,
    requestedAt: '2026-10-20T10:00:00.000Z',
    confirmedAt: status === 'ACTIVE' ? '2026-10-20T12:00:00.000Z' : null,
  };
}

const STUDENTS: CoachStudentsView = {
  current: 12,
  younger: 5,
  former: 0,
  top: [{ ...PLAYERS.second, photoUrl: null }],
  medals: { total: 3, recent: [] },
  growth: [],
  tournaments: [],
};

let sent: Sent[] = [];
let coach: CoachView = COACH;
let me: AuthUserView = USER_WITH_PROFILE;
let own: PlayerProfileView = PLAYER_PROFILE;
let students: CoachStudentsView = STUDENTS;

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
  if (path.startsWith('/club-coaches/')) return reply(undefined, 204);
  if (path.startsWith('/coaches/by-slug/')) return reply(coach);
  if (/^\/coaches\/[^/]+\/students\/manage/.test(path)) {
    return reply(
      pageOf([
        {
          player: { ...PLAYERS.second, photoUrl: null },
          birthYear: 2008,
          since: '2025-09-01T00:00:00.000Z',
        },
      ]),
    );
  }
  if (/^\/coaches\/[^/]+\/students\/.+/.test(path)) return reply(undefined, 204);
  if (/^\/coaches\/[^/]+\/students$/.test(path)) return reply(students);
  if (/^\/coaches\/[^/]+\/(events|clubs)$/.test(path)) return reply(undefined, 204);
  // Новости и галерея тренера (T2.2) — пусто: блоки не выводятся.
  if (/^\/coaches\/[^/]+\/posts/.test(path)) return reply(pageOf([]));
  if (/^\/coaches\/[^/]+\/media/.test(path)) return reply([]);
  if (/^\/coaches\/[^/?]+$/.test(path)) return reply(coach);
  if (path.startsWith('/coaches')) return reply(pageOf([COACH_LIST_ITEM]));
  if (/^\/clubs\/[^/]+\/staff\/manage$/.test(path)) {
    return reply({
      active: [entry('ACTIVE')],
      invited: [entry('INVITED_BY_CLUB', OTHER_COACH)],
      requests: [
        entry('REQUESTED_BY_COACH', { ...OTHER_COACH, id: '00000000-0000-4000-8000-0000000000d3' }),
      ],
    });
  }
  if (/^\/clubs\/[^/]+\/staff/.test(path)) {
    return method === 'GET' ? reply([entry('ACTIVE')]) : reply(undefined, 204);
  }
  if (/^\/clubs\/[^/]+\/trainings\/manage$/.test(path)) {
    return reply({ trainings: [], requests: [], coachTrainings: [] });
  }
  if (/^\/clubs\/[^/]+\/trainings$/.test(path)) return reply([]);
  if (/^\/clubs\/[^/]+\/members$/.test(path)) return reply([]);
  if (/^\/clubs\/[^/]+\/posts/.test(path)) return reply(pageOf([]));
  if (/^\/clubs\/[^/]+\/media/.test(path)) return reply([]);
  if (/^\/clubs\/[^/]+\/summary$/.test(path)) {
    return reply({ matchesRecent: 0, activePlayersRecent: 0, tournamentsHeld: 0, podiums: [] });
  }
  if (/^\/clubs\/[^/?]+$/.test(path)) return reply(CLUB);
  if (path.startsWith('/clubs')) {
    return reply(
      pageOf([{ ...CLUB, nextTournamentAt: null, coachesCount: 2, kidsTrainings: true }]),
    );
  }
  if (path.includes('/summary')) {
    return reply({
      playerId: PLAYERS.first.id,
      rank: 1,
      rankedPlayers: 10,
      maxRating: '520.00',
      maxRatingAt: null,
      period: 'ALL',
      tournaments: 2,
      wins: 1,
      losses: 1,
      firstTournament: null,
      favoriteClub: null,
      bestWins: [],
      awards: [],
    });
  }
  if (path.includes('/best-wins')) return reply({ period: 'ALL', items: [] });
  if (path.includes('/rating-history')) return reply({ playerId: PLAYERS.first.id, points: [] });
  if (path.includes('/tournaments')) return reply(pageOf([]));
  if (/^\/players\/[^/?]+$/.test(path)) return reply(own);

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

function element(selector: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(selector);
  if (found === null) throw new Error(`Нет элемента ${selector}`);
  return found;
}

const requests = (method: string, part: string): Sent[] =>
  sent.filter((request) => request.method === method && request.url.includes(part));

beforeEach(() => {
  window.sessionStorage.clear();
  sent = [];
  coach = COACH;
  me = USER_WITH_PROFILE;
  own = PLAYER_PROFILE;
  students = STUDENTS;
  vi.stubGlobal('fetch', (input: unknown, init: RequestInit | undefined) =>
    Promise.resolve(answer(decodeURIComponent(String(input)), init)),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  useSessionStore.setState({ user: null, accessToken: null, isRestoring: false });
});

describe('штаб в кабинете клуба', () => {
  it('запросы — «Принять», приглашённые — «Отозвать», в штабе — должность и «Убрать»', async () => {
    renderAt(`/cabinet/club/${CLUB.id}?tab=coaches`, USER_WITH_PROFILE);

    expect(await screen.findByRole('tab', { name: `${ru['staff.tab']} (1)` })).toBeDefined();

    const request = await waitFor(() =>
      element('[data-staff-entry="00000000-0000-4000-8000-0000000000d3"]'),
    );
    fireEvent.click(within(request).getByRole('button', { name: ru['staff.action.accept'] }));
    await waitFor(() => {
      expect(
        requests('POST', `/club-coaches/${CLUB.id}/00000000-0000-4000-8000-0000000000d3/confirm`),
      ).toHaveLength(1);
    });

    const invited = element(`[data-staff-entry="${OTHER_COACH.id}"]`);
    expect(within(invited).queryByRole('button', { name: ru['staff.action.accept'] })).toBeNull();
    fireEvent.click(within(invited).getByRole('button', { name: ru['staff.action.revoke'] }));
    await waitFor(() => {
      expect(requests('DELETE', `/club-coaches/${CLUB.id}/${OTHER_COACH.id}`)).toHaveLength(1);
    });

    const active = element(`[data-staff-entry="${COACH_REF.id}"]`);
    expect(within(active).getByRole('button', { name: ru['staff.action.remove'] })).toBeDefined();
    fireEvent.change(within(active).getByLabelText(ru['staff.position']), {
      target: { value: 'Детский тренер' },
    });
    fireEvent.click(within(active).getByRole('button', { name: ru['manage.page.save'] }));
    await waitFor(() => {
      expect(requests('PATCH', `/clubs/${CLUB.id}/staff/${COACH_REF.id}`)[0]?.body).toEqual({
        position: 'Детский тренер',
      });
    });
  });
});

describe('клубы и ученики в кабинете тренера', () => {
  it('приглашение клуба — «Принять», свой запрос — «Отозвать», штаб — «Выйти»', async () => {
    coach = {
      ...COACH,
      clubInvites: [entry('INVITED_BY_CLUB', COACH_REF, OTHER_CLUB)],
      clubRequests: [
        entry('REQUESTED_BY_COACH', COACH_REF, {
          ...OTHER_CLUB,
          id: '00000000-0000-4000-8000-0000000000b3',
        }),
      ],
      clubs: [entry('ACTIVE')],
    };
    renderAt('/cabinet/coach?tab=clubs', userWithCoach(COACH));

    expect(await screen.findByRole('tab', { name: `${ru['coach.tab.clubs']} (1)` })).toBeDefined();

    const invite = await waitFor(() => element(`[data-staff-entry="${OTHER_CLUB.id}"]`));
    fireEvent.click(within(invite).getByRole('button', { name: ru['staff.action.accept'] }));
    await waitFor(() => {
      expect(requests('POST', `/club-coaches/${OTHER_CLUB.id}/${COACH.id}/confirm`)).toHaveLength(
        1,
      );
    });

    const mine = element('[data-staff-entry="00000000-0000-4000-8000-0000000000b3"]');
    expect(within(mine).getByRole('button', { name: ru['staff.action.revoke'] })).toBeDefined();
    expect(within(mine).queryByRole('button', { name: ru['staff.action.accept'] })).toBeNull();

    const active = element(`[data-staff-entry="${CLUB_REF.id}"]`);
    fireEvent.click(within(active).getByRole('button', { name: ru['staff.action.leave'] }));
    await waitFor(() => {
      expect(requests('DELETE', `/club-coaches/${CLUB_REF.id}/${COACH.id}`)).toHaveLength(1);
    });
  });

  it('ученики: «Убрать» — с подтверждением, уходит DELETE', async () => {
    renderAt('/cabinet/coach?tab=students', userWithCoach(COACH));

    const row = await waitFor(() => element(`[data-student="${PLAYERS.second.id}"]`));
    expect(row.textContent).toContain('2008 г. р.');

    fireEvent.click(within(row).getByRole('button', { name: ru['students.manage.remove'] }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(ru['students.manage.removeText'])).toBeDefined();
    fireEvent.click(within(dialog).getByRole('button', { name: ru['students.manage.remove'] }));

    await waitFor(() => {
      expect(requests('DELETE', `/coaches/${COACH.id}/students/${PLAYERS.second.id}`)).toHaveLength(
        1,
      );
    });
  });
});

describe('страница тренера: ученики и «Я ученик»', () => {
  it('младшие — только числом, пустые части скрыты', async () => {
    renderAt(`/coaches/${COACH_SLUG}`);

    const block = await waitFor(() => element('[data-coach-students]'));
    expect(within(block).getByText(ru['students.younger'])).toBeDefined();
    expect(within(block).getByText('5')).toBeDefined();
    // Бывших нет, роста нет, последних медалей нет — частей нет.
    expect(within(block).queryByText(ru['students.former'])).toBeNull();
    expect(block.querySelector('[data-students-growth]')).toBeNull();
    expect(block.querySelector('[data-students-medals]')).toBeNull();
    expect(block.querySelector('[data-students-tournaments]')).toBeNull();
    expect(
      within(element('[data-students-top]'))
        .getByRole('link', { name: `${PLAYERS.second.lastName} ${PLAYERS.second.firstName}` })
        .getAttribute('href'),
    ).toBe(`/players/${PLAYERS.second.id}`);
    // Без входа «Я ученик» нет.
    expect(document.querySelector('[data-student-state]')).toBeNull();
  });

  it('ученики на турнирах: турнир ссылкой, дата, число учеников и медали', async () => {
    const tournamentId = '00000000-0000-4000-8000-0000000000e1';
    students = {
      ...STUDENTS,
      tournaments: [
        {
          tournament: {
            id: tournamentId,
            name: 'Кубок зала',
            startsAt: '2026-10-18T12:00:00.000Z',
          },
          students: 3,
          gold: 1,
          silver: 0,
          bronze: 2,
        },
      ],
    };
    renderAt(`/coaches/${COACH_SLUG}`);

    const block = await waitFor(() => element('[data-students-tournaments]'));
    expect(within(block).getByText(ru['students.tournaments'])).toBeDefined();
    expect(within(block).getByRole('link', { name: 'Кубок зала' }).getAttribute('href')).toBe(
      `/tournaments/${tournamentId}`,
    );
    expect(block.textContent).toContain(fill(ru['students.tournaments.count'], { count: '3' }));
    // Медали — только те, что есть: серебра нет — кружка нет.
    expect(block.querySelector('[data-medal="1"]')).not.toBeNull();
    expect(block.querySelector('[data-medal="2"]')).toBeNull();
    expect(block.querySelector('[data-medal="3"]')?.textContent).toContain(
      fill(ru['students.tournaments.place'], { place: '3', count: '2' }),
    );
  });

  it('игрок, у которого тренер другой, — «Я занимаюсь» с подтверждением', async () => {
    me = { ...USER_WITH_PROFILE, playerId: PLAYERS.second.id };
    own = { ...PLAYER_PROFILE, id: PLAYERS.second.id, coachPlayerId: null, coachName: null };
    renderAt(`/coaches/${COACH_SLUG}`, me);

    const join = await waitFor(() => element('[data-student-state="can-join"]'));
    fireEvent.click(within(join).getByRole('button', { name: ru['students.me.join'] }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: ru['students.me.confirmAction'] }));

    await waitFor(() => {
      expect(requests('POST', `/coaches/${COACH.id}/students/me`)).toHaveLength(1);
    });
  });

  it('уже ученик — «Вы ученик» и «Больше не ученик»', async () => {
    me = { ...USER_WITH_PROFILE, playerId: PLAYERS.second.id };
    own = {
      ...PLAYER_PROFILE,
      id: PLAYERS.second.id,
      coachPlayerId: COACH.player.id,
      coachName: 'Ержанов Асан',
    };
    renderAt(`/coaches/${COACH_SLUG}`, me);

    const student = await waitFor(() => element('[data-student-state="student"]'));
    expect(student.textContent).toContain(ru['students.me.is']);
    fireEvent.click(within(student).getByRole('button', { name: ru['students.me.leave'] }));

    await waitFor(() => {
      expect(requests('DELETE', `/coaches/${COACH.id}/students/me`)).toHaveLength(1);
    });
  });

  it('сам тренер «Я ученик» не видит; клубы штаба — в «Где тренирует»', async () => {
    coach = { ...COACH, clubs: [entry('ACTIVE')] };
    renderAt(`/coaches/${COACH_SLUG}`, userWithCoach(COACH));

    const clubs = await waitFor(() => element('[data-coach-clubs]'));
    expect(within(clubs).getByRole('link', { name: CLUB_REF.name }).getAttribute('href')).toBe(
      `/clubs/${CLUB_REF.id}`,
    );
    expect(clubs.textContent).toContain('Старший тренер');
    expect(document.querySelector('[data-student-state]')).toBeNull();
  });
});

describe('штаб на странице клуба и история тренера в профиле', () => {
  it('на странице клуба — «Тренерский штаб» карточками с должностью', async () => {
    renderAt(`/clubs/${CLUB.id}`);

    const staff = await waitFor(() => element('[data-club-staff]'));
    expect(within(staff).getByRole('heading', { name: ru['staff.public.title'] })).toBeDefined();
    expect(staff.textContent).toContain('Старший тренер');
  });

  it('профиль: «Тренер: X с 2024», ниже «Раньше: Y, 2020–2024»', async () => {
    own = {
      ...PLAYER_PROFILE,
      coachPlayerId: PLAYERS.second.id,
      coachName: 'Смагулов Асан',
      coachSlug: 'smagulov-asan',
      coachSince: '2024-03-01T00:00:00.000Z',
      coachHistory: [
        {
          coachPlayerId: PLAYERS.third.id,
          name: 'Тлеубаев Асан',
          slug: null,
          from: '2020-02-01T00:00:00.000Z',
          to: '2024-03-01T00:00:00.000Z',
        },
      ],
    };
    renderAt(`/players/${PLAYER_PROFILE.id}`);

    const coachLink = await screen.findByRole('link', { name: 'Смагулов Асан' });
    expect(coachLink.getAttribute('href')).toBe('/coaches/smagulov-asan');
    expect(coachLink.parentElement?.textContent).toContain('Смагулов Асан с 2024');
    expect(element('[data-coach-history]').textContent).toBe('Тлеубаев Асан, 2020–2024');
  });
});

describe('клубы: детские тренировки', () => {
  it('kids из адреса доходит до сервера; метки и число тренеров на карточке', async () => {
    renderAt('/clubs?kids=true');

    expect(await screen.findByText('тренеров: 2')).toBeDefined();
    // Метка на карточке и активный чип фильтра.
    expect(screen.getAllByText(ru['clubs.card.kidsTrainings']).length).toBeGreaterThan(1);
    expect(requests('GET', '/clubs?').some((request) => request.url.includes('kids=true'))).toBe(
      true,
    );
  });

  it('чип «Детские тренировки» кладёт фильтр в адрес', async () => {
    renderAt('/clubs');

    await screen.findByText('тренеров: 2');
    fireEvent.click(screen.getByRole('button', { name: ru['clubs.card.kidsTrainings'] }));

    await waitFor(() => {
      expect(window.location.search).toContain('kids=true');
    });
  });
});
