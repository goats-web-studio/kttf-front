import { COLORS, HANDLES, PRODUCT_ATTRIBUTES, PRODUCT_CATEGORIES } from '@kttf/shared/types';
import { describe, expect, it } from 'vitest';

import { kk } from '@/common/i18n/kk';
import { ru } from '@/common/i18n/ru';

import { attributeLabelKey, valueLabelKey } from './labels';

/**
 * Подписи каталога ищутся по собранному ключу, и тип словаря их пропуск не
 * ловит. Новая характеристика или значение в общем коде без подписи ломают
 * этот тест, а не выходят к человеку английским ключом.
 */
describe('подписи каталога', () => {
  const dictionaries = { ru, kk } as const;
  const keys: string[] = [];

  for (const category of PRODUCT_CATEGORIES) {
    keys.push(`market.category.${category}`);
    for (const def of PRODUCT_ATTRIBUTES[category]) {
      keys.push(attributeLabelKey(def.key));
      if (def.kind === 'enum' || def.kind === 'enums') {
        for (const value of def.values) keys.push(valueLabelKey(def.key, value));
      }
      if ((def.kind === 'number' || def.kind === 'numbers') && def.unit !== undefined) {
        keys.push(`market.unit.${def.unit}`);
      }
    }
  }
  for (const color of COLORS) keys.push(`market.color.${color}`);
  for (const handle of HANDLES) keys.push(`market.handle.${handle}`);

  for (const [locale, dictionary] of Object.entries(dictionaries)) {
    it(`${locale}: у каждой характеристики и каждого значения есть подпись`, () => {
      const missing = keys.filter((key) => !Object.hasOwn(dictionary, key));

      expect(missing).toEqual([]);
    });
  }
});
