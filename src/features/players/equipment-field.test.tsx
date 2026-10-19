import type { ProductListItemView } from '@kttf/shared/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ru } from '@/common/i18n/ru';

import EquipmentField, { type EquipmentValue } from './equipment-field';

const VISCARIA: ProductListItemView = {
  id: '00000000-0000-4000-8000-0000000000e1',
  slug: 'butterfly-viscaria',
  category: 'BLADE',
  name: 'Viscaria',
  brand: { id: '00000000-0000-4000-8000-0000000000d1', name: 'Butterfly', slug: 'butterfly' },
  image: null,
  playerCount: 0,
};

let requests: string[] = [];

beforeEach(() => {
  requests = [];
  vi.stubGlobal('fetch', (input: unknown) => {
    requests.push(decodeURIComponent(String(input)));
    return Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify([VISCARIA])),
    } as unknown as Response);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderField(value: EquipmentValue, onChange: (next: EquipmentValue) => void): void {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <EquipmentField
        category="BLADE"
        label={ru['player.form.blade']}
        value={value}
        onChange={onChange}
      />
    </QueryClientProvider>,
  );
}

describe('основание в анкете', () => {
  it('подсказки — из каталога оснований; выбор ставит товар и стирает строку', async () => {
    const onChange = vi.fn();
    renderField({ product: null, text: undefined }, onChange);

    const input = screen.getByRole('combobox', { name: ru['player.form.blade'] });
    // Поле в фокусе, как у человека: без фокуса MUI возвращает набранное к выбору.
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'виска' } });

    fireEvent.click(await screen.findByText('Viscaria'));

    expect(
      requests.some((url) => url.includes('/catalog/products/suggest?q=виска&category=BLADE')),
    ).toBe(true);
    expect(onChange).toHaveBeenLastCalledWith({
      product: expect.objectContaining({ id: VISCARIA.id, label: 'Butterfly Viscaria' }) as unknown,
      text: undefined,
    });
  });

  it('строка вручную стирает товар', () => {
    const onChange = vi.fn();
    renderField({ product: null, text: 'Самодельное' }, onChange);

    // Строка без товара — поле сразу открыто вручную.
    const input = screen.getByRole('textbox', { name: ru['player.form.blade'] });
    fireEvent.change(input, { target: { value: 'Самодельное ALC' } });

    expect(onChange).toHaveBeenLastCalledWith({ product: null, text: 'Самодельное ALC' });
    expect(
      screen.getByRole('button', { name: ru['player.form.equipmentFromCatalog'] }),
    ).toBeDefined();
  });
});
