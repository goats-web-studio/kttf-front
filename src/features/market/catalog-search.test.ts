import { defaultParseSearch, defaultStringifySearch } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';

import {
  activeFilterCount,
  catalogApiQuery,
  draftFromSearch,
  parseCatalogSearch,
  parseLooseCatalogSearch,
  searchFromDraft,
  type CatalogDraft,
  type CatalogSearch,
} from './catalog-search';

const BRAND = '00000000-0000-4000-8000-0000000000d1';
const OTHER_BRAND = '00000000-0000-4000-8000-0000000000d2';

/** Адрес так, как его прочтёт маршрут категории: строка → роутер → разбор категорией. */
function fromUrl(category: 'BLADE' | 'RUBBER', url: string): CatalogSearch {
  return parseCatalogSearch(category, parseLooseCatalogSearch(defaultParseSearch(url)));
}

/** Адрес, который роутер напишет для состояния. */
function toUrl(search: CatalogSearch): string {
  return decodeURIComponent(defaultStringifySearch(search));
}

describe('фильтры каталога в адресе', () => {
  it('подборка из ссылки разбирается тем же видом, что ждёт сервер', () => {
    const search = fromUrl(
      'BLADE',
      `?q=Viscaria&brand=${BRAND}&bladeType=OFF,ALL&weight=80-90&handle=FL,ST&sort=name&page=2`,
    );

    expect(search).toEqual({
      q: 'Viscaria',
      brand: BRAND,
      sort: 'name',
      page: 2,
      bladeType: 'OFF,ALL',
      weight: '80-90',
      handle: 'FL,ST',
    });
    expect(activeFilterCount('BLADE', search)).toBe(4);

    const query = new URLSearchParams(catalogApiQuery('BLADE', search, 24));
    expect(Object.fromEntries(query)).toEqual({
      category: 'BLADE',
      brandId: BRAND,
      search: 'Viscaria',
      sort: 'name',
      page: '2',
      limit: '24',
      bladeType: 'OFF,ALL',
      weight: '80-90',
      handle: 'FL,ST',
    });
  });

  it('кривое условие выпадает одно, остальные остаются', () => {
    const search = fromUrl(
      'BLADE',
      '?bladeType=OFF,NOPE&weight=abc&tensor=1&foo=bar&speed=10-20&handle=XX&page=1',
    );

    // tensor — характеристика накладок, speed не фильтруется, первая страница не пишется.
    expect(search).toEqual({ bladeType: 'OFF' });
  });

  it('числа, прочитанные роутером, снова становятся условиями', () => {
    // Роутер разбирает значения как JSON: «1» и «-90» приходят числами, «2.0» — числом 2.
    const search = fromUrl('RUBBER', '?tensor=1&hardnessDeg=-45&thickness=2.0&rubberType=INVERTED');

    expect(search).toEqual({ tensor: 1, rubberType: 'INVERTED', thickness: '2.0' });
  });

  it('панель → адрес → панель: условия не теряются и не меняются', () => {
    const draft: CatalogDraft = {
      q: 'Tenergy',
      brands: [BRAND, OTHER_BRAND],
      lists: { rubberType: ['INVERTED', 'SHORT_PIPS'], thickness: ['2.0', 'max'], color: ['RED'] },
      ranges: {},
      flags: { tensor: true },
    };

    const search = searchFromDraft('RUBBER', draft, 'new');
    const url = toUrl(search);

    // Ссылка читается глазами: без кавычек JSON у чисел и флажка.
    expect(url).toContain('tensor=1');
    expect(url).toContain('rubberType=INVERTED,SHORT_PIPS');
    expect(url).toContain('sort=new');

    const back = fromUrl('RUBBER', url);
    expect(back).toEqual(search);
    expect(draftFromSearch('RUBBER', back)).toEqual({ ...draft, flags: { tensor: true } });
  });

  it('диапазон: «от 90 до 80» — это «от 80 до 90», одна граница — открытый край', () => {
    const swapped = searchFromDraft(
      'BLADE',
      {
        q: '',
        brands: [],
        lists: {},
        ranges: { weight: { from: '90', to: '80' }, thickness: { from: '', to: '5,8' } },
        flags: {},
      },
      undefined,
    );

    expect(swapped).toEqual({ weight: '80-90', thickness: -5.8 });
    expect(toUrl(swapped)).toBe('?weight=80-90&thickness=-5.8');
    expect(draftFromSearch('BLADE', fromUrl('BLADE', toUrl(swapped))).ranges).toEqual({
      weight: { from: '80', to: '90' },
      thickness: { from: '', to: '5.8' },
    });
  });

  it('пустая панель — пустой адрес, порядок сохраняется', () => {
    const empty: CatalogDraft = { q: '  ', brands: [], lists: {}, ranges: {}, flags: {} };

    expect(searchFromDraft('BLADE', empty, undefined)).toEqual({});
    expect(searchFromDraft('BLADE', empty, 'name')).toEqual({ sort: 'name' });
  });
});
