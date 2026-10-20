import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ru } from '@/common/i18n/ru';
import { COACH_LIST_ITEM } from '@/test/coach-fixtures';
import { PLAYERS, pageOf } from '@/test/fixtures';

import CoachField from './coach-field';
import type { CoachOption } from './coach-options';

/** Адреса поиска тренеров за тест. */
let searches: string[] = [];
let failCoaches = false;

beforeEach(() => {
  searches = [];
  failCoaches = false;
  vi.stubGlobal('fetch', (input: unknown) => {
    const url = decodeURIComponent(String(input));

    if (url.includes('/coaches')) {
      searches.push(url);
      if (failCoaches) return Promise.reject(new TypeError('Failed to fetch'));
    }

    return Promise.resolve({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(JSON.stringify(pageOf(url.includes('/coaches') ? [COACH_LIST_ITEM] : []))),
    } as unknown as Response);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderField(value: CoachOption | null, onChange: (next: CoachOption | null) => void) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <CoachField value={value} onChange={onChange} label={ru['player.form.coachFind']} />
    </QueryClientProvider>,
  );
}

const coachName = `${PLAYERS.first.lastName} ${PLAYERS.first.firstName}`;

describe('поле «Тренер» в анкете', () => {
  it('пустой ввод — до десяти тренеров KTTF без поиска; выбор кладёт тренера', async () => {
    const onChange = vi.fn();
    renderField(null, onChange);

    const input = screen.getByRole('combobox', { name: ru['player.form.coachFind'] });
    fireEvent.focus(input);
    fireEvent.mouseDown(input);

    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByText(ru['player.form.coachWithPage'])).toBeDefined();
    fireEvent.click(within(listbox).getByText(coachName));

    expect(searches[0]).toContain('/coaches?page=1&limit=10');
    expect(searches[0]).not.toContain('search=');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'kttf', playerId: PLAYERS.first.id }),
    );
  });

  it('поиск уходит после паузы и только с последним текстом', async () => {
    renderField(null, vi.fn());

    const input = screen.getByRole('combobox', { name: ru['player.form.coachFind'] });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'с' } });
    fireEvent.change(input, { target: { value: 'се' } });
    fireEvent.change(input, { target: { value: 'сер' } });

    await waitFor(() => {
      expect(searches.some((url) => url.includes('search=сер'))).toBe(true);
    });
    expect(searches.some((url) => /search=се(&|$)/.test(url))).toBe(false);
  });

  it('«Вписать: „…“» кладёт имя строкой', async () => {
    const onChange = vi.fn();
    renderField(null, onChange);

    const input = screen.getByRole('combobox', { name: ru['player.form.coachFind'] });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Сериков Тимур' } });
    fireEvent.click(await screen.findByText('Вписать: «Сериков Тимур»'));

    expect(onChange).toHaveBeenLastCalledWith({ kind: 'typed', name: 'Сериков Тимур' });
  });

  it('сохранённый тренер виден именем, крестик стирает выбор', () => {
    const onChange = vi.fn();
    renderField(
      {
        kind: 'player',
        playerId: PLAYERS.second.id,
        name: 'Сериков Тимур',
        photoUrl: null,
        city: null,
        rating: null,
      },
      onChange,
    );

    const input = screen.getByRole('combobox', { name: ru['player.form.coachFind'] });
    expect((input as HTMLInputElement).value).toBe('Сериков Тимур');
    // По сохранённому имени поиск не уходит: подсказка — тренеры без поиска.
    expect(searches.some((url) => url.includes('search='))).toBe(false);

    // Крестик MUI виден под курсором и в фокусе; ищем его по подписи.
    fireEvent.click(screen.getByLabelText(ru['player.form.coachClear']));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('сеть недоступна — текст под полем, вписать имя можно', async () => {
    failCoaches = true;
    const onChange = vi.fn();
    renderField(null, onChange);

    expect(await screen.findByText(ru['player.form.coachSearchError'])).toBeDefined();

    const input = screen.getByRole('combobox', { name: ru['player.form.coachFind'] });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Сериков' } });
    fireEvent.click(await screen.findByText('Вписать: «Сериков»'));

    expect(onChange).toHaveBeenLastCalledWith({ kind: 'typed', name: 'Сериков' });
  });
});
