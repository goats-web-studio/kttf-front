import { describe, expect, it } from 'vitest';

import { VISUALLY_HIDDEN } from './visually-hidden';

describe('VISUALLY_HIDDEN', () => {
  it('размер — пиксель строкой: число 1 в sx MUI означает 100%', () => {
    // С `width: 1` скрытая подпись таблицы растягивалась на весь экран и
    // давала странице профиля горизонтальную прокрутку. jsdom раскладки не
    // считает, поэтому стережётся само значение.
    expect(VISUALLY_HIDDEN).toMatchObject({ width: '1px', height: '1px' });
  });
});
