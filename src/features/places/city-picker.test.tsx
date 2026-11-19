import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ru } from '@/common/i18n/ru';
import { CITIES, placesReply, REGIONS } from '@/test/fixtures';

import CitiesFilter from './cities-filter';
import CityPicker from './city-picker';

/**
 * Выбор города и фильтр по городам с областями — ADR-096.
 *
 * В поле одного города область — только подзаголовок: человек живёт и клуб
 * стоит в городе. В фильтре область выбирается целиком.
 */

beforeEach(() => {
  vi.stubGlobal('fetch', (input: unknown) => {
    const body = placesReply(String(input));
    if (body === undefined) throw new Error(`Неожидаемый запрос: ${String(input)}`);

    return Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(body)),
    } as unknown as Response);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderWithQueries(node: ReactNode): void {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {node}
    </QueryClientProvider>,
  );
}

async function open(name: string): Promise<HTMLElement> {
  const input = screen.getByRole('combobox', { name });
  fireEvent.mouseDown(input);
  // Список появляется, когда справочник пришёл.
  await screen.findByRole('option', { name: CITIES.ridder.name });

  return screen.getByRole('listbox');
}

describe('выбор одного города', () => {
  it('города по областям: сначала вне областей, область — подзаголовком, не пунктом', async () => {
    const onChange = vi.fn();
    renderWithQueries(<CityPicker value="" onChange={onChange} label={ru['filter.city']} />);

    const listbox = await open(ru['filter.city']);
    expect(
      within(listbox)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual([CITIES.almaty.name, CITIES.astana.name, CITIES.oskemen.name, CITIES.ridder.name]);
    expect(within(listbox).getByText(REGIONS.vko.name)).toBeDefined();
    expect(
      within(listbox).queryByRole('option', { name: new RegExp(REGIONS.vko.name) }),
    ).toBeNull();

    fireEvent.click(within(listbox).getByRole('option', { name: CITIES.ridder.name }));
    expect(onChange).toHaveBeenCalledWith(CITIES.ridder.id);
  });
});

describe('фильтр по нескольким городам', () => {
  it('область выбирается целиком, рядом с городом; чип — её название', async () => {
    const onChange = vi.fn();
    renderWithQueries(
      <CitiesFilter label={ru['filter.city']} value={[CITIES.astana.id]} onChange={onChange} />,
    );

    const listbox = await open(ru['filter.city']);
    fireEvent.click(
      within(listbox).getByRole('option', {
        name: `${REGIONS.vko.name} ${ru['places.region.whole']}`,
      }),
    );

    expect(onChange).toHaveBeenCalledWith([CITIES.astana.id, REGIONS.vko.id]);
  });

  it('область из адреса — чипом с названием области', async () => {
    renderWithQueries(
      <CitiesFilter label={ru['filter.city']} value={[REGIONS.vko.id]} onChange={vi.fn()} />,
    );

    expect(await screen.findByRole('button', { name: REGIONS.vko.name })).toBeDefined();
  });
});
