import { createProductSchema, productAttrsSchema, productOptionsSchema } from '@kttf/shared/types';
import { describe, expect, it } from 'vitest';

import {
  attrsDraftFrom,
  attrsFromDraft,
  isOptionValue,
  optionsDraftFrom,
  optionsFromDraft,
} from './attrs-form';

const BRAND = '00000000-0000-4000-8000-0000000000d1';

describe('форма характеристик', () => {
  it('поля формы дают `attrs`, который принимает схема категории', () => {
    const { attrs, problems } = attrsFromDraft('RUBBER', {
      rubberType: 'INVERTED',
      tensor: false,
      speed: '13,5',
      spin: '',
      hardness: 'MEDIUM',
      hardnessDeg: '40, 42; 45',
      spongeColor: '',
      playStyle: 'ATTACK',
    });

    expect(problems).toEqual({});
    expect(attrs).toEqual({
      rubberType: 'INVERTED',
      // Снятый флажок — «нет», а не «не указано»: у накладки без тензора так и пишут.
      tensor: false,
      speed: 13.5,
      hardness: 'MEDIUM',
      hardnessDeg: [40, 42, 45],
      playStyle: 'ATTACK',
    });
    expect(productAttrsSchema('RUBBER').safeParse(attrs).success).toBe(true);
    expect(
      createProductSchema.safeParse({
        category: 'RUBBER',
        brandId: BRAND,
        name: 'Tenergy 05',
        attrs,
      }).success,
    ).toBe(true);
  });

  it('неверное число не уходит, а подсвечивается', () => {
    const { attrs, problems } = attrsFromDraft('BLADE', {
      weight: 'восемьдесят',
      plies: '12',
      thickness: '5.8',
      headSize: '  157 × 150  ',
    });

    expect(problems).toEqual({ weight: 'number', plies: 'range' });
    expect(attrs).toEqual({ thickness: 5.8, headSize: '157 × 150' });
    expect(productAttrsSchema('BLADE').safeParse(attrs).success).toBe(true);
  });

  it('карточка из базы → поля → обратно без потерь', () => {
    const stored = {
      bladeType: 'OFF_MINUS',
      construction: 'ALL_WOOD',
      plies: 5,
      weight: 86,
      speed: 90,
      headSize: '157 × 150',
    };

    const draft = attrsDraftFrom('BLADE', stored);

    expect(draft.weight).toBe('86');
    expect(draft.sweetSpot).toBe('');
    expect(attrsFromDraft('BLADE', draft)).toEqual({ attrs: stored, problems: {} });
  });

  it('варианты — только оси категории и только непустые', () => {
    const draft = optionsDraftFrom('RUBBER', {
      thickness: ['2.0', 'max'],
      color: [],
      handle: ['FL'],
    });
    const options = optionsFromDraft('RUBBER', { ...draft, color: ['RED', 'BLACK', 'RED'] });

    expect(options).toEqual({ thickness: ['2.0', 'max'], color: ['RED', 'BLACK'] });
    expect(productOptionsSchema('RUBBER').safeParse(options).success).toBe(true);
    expect(isOptionValue('thickness', '2.1')).toBe(true);
    expect(isOptionValue('thickness', '2,1')).toBe(false);
    expect(isOptionValue('size', 'XL')).toBe(true);
  });
});
