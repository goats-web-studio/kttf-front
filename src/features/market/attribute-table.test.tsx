import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { fill } from '@/common/i18n';
import { ru } from '@/common/i18n/ru';

import AttributeTable, { COLLAPSED_ROWS } from './attribute-table';

/** Значение строки таблицы по подписи характеристики. */
function valueOf(label: string): string | null | undefined {
  const term = screen.getByText(label, { selector: 'dt' });

  return term.nextElementSibling?.textContent;
}

describe('характеристики товара', () => {
  it('строки — из описания категории, с единицами и подписями значений', () => {
    render(
      <AttributeTable
        category="BLADE"
        attrs={{
          bladeType: 'OFF_MINUS',
          construction: 'ALL_WOOD',
          plies: 5,
          weight: 85.5,
          thickness: 5.9,
          playStyle: 'ALLROUND',
        }}
      />,
    );

    expect(valueOf(ru['market.attr.bladeType'])).toBe(ru['market.value.bladeType.OFF_MINUS']);
    expect(valueOf(ru['market.attr.construction'])).toBe(ru['market.value.construction.ALL_WOOD']);
    expect(valueOf(ru['market.attr.plies'])).toBe('5');
    // Дробь — по-русски, единица через пробел.
    expect(valueOf(ru['market.attr.weight'])).toBe(`85,5 ${ru['market.unit.g']}`);
    expect(valueOf(ru['market.attr.thickness'])).toBe(`5,9 ${ru['market.unit.mm']}`);
    // Порядок — порядок описания категории, а не порядок ключей в ответе.
    expect([...document.querySelectorAll('dt')].map((term) => term.textContent)).toEqual([
      ru['market.attr.bladeType'],
      ru['market.attr.construction'],
      ru['market.attr.plies'],
      ru['market.attr.weight'],
      ru['market.attr.thickness'],
      ru['market.attr.playStyle'],
    ]);
    // Шкал производителя здесь нет — и пометки под таблицей нет.
    expect(screen.queryByText(`* ${ru['market.brandScale.note']}`)).toBeNull();
  });

  it('числа по шкале производителя помечены, под таблицей — пояснение', () => {
    render(
      <AttributeTable
        category="RUBBER"
        attrs={{ rubberType: 'INVERTED', tensor: true, speed: 13, hardnessDeg: [40, 42.5] }}
      />,
    );

    expect(valueOf(ru['market.attr.tensor'])).toBe(ru['market.bool.yes']);
    expect(valueOf(ru['market.attr.speed'])).toBe('13*');
    expect(screen.getByLabelText(ru['market.brandScale'])).toBeDefined();
    expect(screen.getByText(`* ${ru['market.brandScale.note']}`)).toBeDefined();
    // Несколько значений жёсткости — через косую черту, градус слитно.
    expect(valueOf(ru['market.attr.hardnessDeg'])).toBe('40 / 42,5°');
  });

  it('пусто и мусор — таблицы нет вовсе', () => {
    const { container } = render(
      <AttributeTable
        category="BLADE"
        attrs={{ bladeType: 42, weight: 'тяжёлое', headSize: '   ', unknown: 'x' }}
      />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('на телефоне — пять главных, остальное по кнопке', () => {
    render(
      <AttributeTable
        collapsed
        category="BLADE"
        attrs={{
          bladeType: 'OFF',
          construction: 'COMPOSITE',
          plies: 7,
          compositePlies: 2,
          weight: 88,
          thickness: 5.8,
          speed: 120,
        }}
      />,
    );

    expect(document.querySelectorAll('dt')).toHaveLength(COLLAPSED_ROWS);

    fireEvent.click(
      screen.getByRole('button', {
        name: fill(ru['market.product.allAttributes'], { count: '7' }),
      }),
    );

    expect(document.querySelectorAll('dt')).toHaveLength(7);
  });
});
