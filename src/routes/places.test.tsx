import type { AuthUserView, CityView } from '@kttf/shared/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '@/app/router';
import { fill } from '@/common/i18n';
import { ru } from '@/common/i18n/ru';
import { useSessionStore } from '@/features/auth/session-store';
import {
  ADMIN_USER,
  CITIES,
  CITY_LIST,
  COUNTRY,
  placesReply,
  USER_WITH_PROFILE,
} from '@/test/fixtures';

/**
 * Справочник стран и городов в кабинете — ADR-046.
 *
 * Стережётся то, что ломается незаметно: страница не открывается тем, кто
 * не администратор, скрытая запись остаётся в таблице, а заведение и
 * скрытие уходят на сервер в форме контракта.
 */

interface Sent {
  readonly url: string;
  readonly method: string;
  readonly body: unknown;
}

let sent: Sent[] = [];
/** Отказ на заведение: `null` — успех. */
let refusal: string | null = null;

/** Скрытый город: в открытом справочнике его нет, у администратора — есть. */
const HIDDEN: CityView = {
  id: '00000000-0000-4000-8000-0000000000c9',
  countryId: COUNTRY.id,
  name: 'Байконур',
  nameKk: 'Байқоңыр',
  sortOrder: 9,
  isActive: false,
};

function reply(body: unknown, status = 200): Response {
  return {
    ok: status < 400,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function answer(url: string, init: RequestInit | undefined): Response {
  const method = init?.method ?? 'GET';
  const raw = init?.body;
  const body: unknown = typeof raw === 'string' ? JSON.parse(raw) : undefined;

  sent.push({ url, method, body });

  if (url.includes('/admin/countries')) {
    return reply([COUNTRY]);
  }

  if (url.includes('/admin/cities')) {
    if (method === 'GET') return reply([...CITY_LIST, HIDDEN]);
    if (refusal !== null) {
      return reply({ error: { code: refusal, message: 'refused' } }, 409);
    }
    return reply({ ...CITIES.almaty, ...(body as object) });
  }

  const places = placesReply(url);
  if (places !== undefined) return reply(places);

  throw new Error(`Неожидаемый запрос: ${url}`);
}

function renderPlaces(user: AuthUserView): void {
  useSessionStore.setState({ user, accessToken: 'access-token', isRestoring: false });
  window.history.pushState({}, '', '/admin/places');

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter({ queryClient, session: user });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

function requests(method: string): Sent[] {
  return sent.filter((request) => request.method === method);
}

beforeEach(() => {
  sent = [];
  refusal = null;
  vi.stubGlobal('fetch', (input: unknown, init: RequestInit | undefined) =>
    Promise.resolve(answer(String(input), init)),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  useSessionStore.setState({ user: null, accessToken: null, isRestoring: false });
});

describe('доступ к справочнику', () => {
  it('не администратору страница отказывает и ничего не запрашивает', async () => {
    renderPlaces(USER_WITH_PROFILE);

    expect(await screen.findByText(ru['places.forbidden.title'])).toBeDefined();
    expect(screen.queryByRole('table')).toBeNull();
    expect(sent.some((request) => request.url.includes('/admin/'))).toBe(false);
  });

  it('администратору — страны и города, скрытые тоже', async () => {
    renderPlaces(ADMIN_USER);

    const countries = await screen.findByRole('table', { name: ru['places.countries.title'] });
    expect(within(countries).getByText(COUNTRY.name)).toBeDefined();

    // Скрытый город остаётся в таблице: вернуть его можно тем же переключателем.
    const cities = await screen.findByRole('table', { name: ru['places.cities.title'] });
    expect(within(cities).getByText(HIDDEN.name)).toBeDefined();

    const toggle = within(cities).getByRole('switch', {
      name: fill(ru['places.toggle'], { name: HIDDEN.name }),
    });
    expect((toggle as HTMLInputElement).checked).toBe(false);
  });
});

describe('ведение справочника', () => {
  it('новый город уходит в выбранную страну, пустое казахское название не отправляется', async () => {
    renderPlaces(ADMIN_USER);

    await screen.findByRole('table', { name: ru['places.cities.title'] });
    fireEvent.click(screen.getByRole('button', { name: ru['places.city.add'] }));

    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(ru['places.field.name']), {
      target: { value: 'Шымкент' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: ru['places.save'] }));

    await waitFor(() => {
      expect(requests('POST')).toHaveLength(1);
    });

    const [request] = requests('POST');

    expect(request?.url).toContain('/admin/cities');
    expect(request?.body).toEqual({ countryId: COUNTRY.id, name: 'Шымкент' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('повтор названия объясняется в диалоге, а не теряется', async () => {
    refusal = 'PLACE_ALREADY_EXISTS';
    renderPlaces(ADMIN_USER);

    await screen.findByRole('table', { name: ru['places.cities.title'] });
    fireEvent.click(screen.getByRole('button', { name: ru['places.city.add'] }));

    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(ru['places.field.name']), {
      target: { value: CITIES.almaty.name },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: ru['places.save'] }));

    expect(await within(dialog).findByText(ru['error.api.PLACE_ALREADY_EXISTS'])).toBeDefined();
  });

  it('пустое название на сервер не уходит', async () => {
    renderPlaces(ADMIN_USER);

    await screen.findByRole('table', { name: ru['places.cities.title'] });
    fireEvent.click(screen.getByRole('button', { name: ru['places.city.add'] }));

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: ru['places.save'] }));

    expect(await within(dialog).findByText(ru['error.form.placeName'])).toBeDefined();
    expect(requests('POST')).toHaveLength(0);
  });

  it('город скрывается правкой, а не удалением', async () => {
    renderPlaces(ADMIN_USER);

    const cities = await screen.findByRole('table', { name: ru['places.cities.title'] });
    fireEvent.click(
      within(cities).getByRole('switch', {
        name: fill(ru['places.toggle'], { name: CITIES.almaty.name }),
      }),
    );

    await waitFor(() => {
      expect(requests('PATCH')).toHaveLength(1);
    });

    const [request] = requests('PATCH');

    expect(request?.url).toContain(`/admin/cities/${CITIES.almaty.id}`);
    expect(request?.body).toEqual({ isActive: false });
    expect(requests('DELETE')).toHaveLength(0);
  });
});
