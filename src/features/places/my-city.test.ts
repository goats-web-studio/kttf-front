import { describe, expect, it } from 'vitest';

import { CITIES, CITY_LIST, REGIONS } from '@/test/fixtures';

import { ALL_CITIES, cityScope, detectCity } from './my-city';

const ALMATY = CITIES.almaty.id;
const ASTANA = CITIES.astana.id;

describe('фильтр «Город» с городом шапки — ADR-093', () => {
  it('без города в адресе — город шапки', () => {
    expect(cityScope(undefined, ALMATY).ids).toEqual([ALMATY]);
    expect(cityScope(undefined, ALMATY).joined).toBe(ALMATY);
  });

  it('без города в адресе и в шапке — все города', () => {
    expect(cityScope(undefined, undefined).ids).toEqual([]);
    expect(cityScope(undefined, undefined).joined).toBeUndefined();
  });

  it('`all` — все города, даже когда в шапке город есть', () => {
    expect(cityScope(ALL_CITIES, ALMATY).ids).toEqual([]);
  });

  it('выбранное на странице сильнее шапки', () => {
    expect(cityScope(`${ASTANA},${ALMATY}`, ALMATY).ids).toEqual([ASTANA, ALMATY]);
  });

  it('область из адреса уходит в запрос своими городами, вперемешку с городом — ADR-096', () => {
    const scope = cityScope(`${REGIONS.vko.id},${ASTANA}`, ALMATY, CITY_LIST);

    // Поле и чипы видят выбор как есть — область одним пунктом.
    expect(scope.ids).toEqual([REGIONS.vko.id, ASTANA]);
    expect(scope.cityIds).toEqual([CITIES.oskemen.id, CITIES.ridder.id, ASTANA]);
    expect(scope.cityIdsJoined).toBe(`${CITIES.oskemen.id},${CITIES.ridder.id},${ASTANA}`);
  });

  it('все города — пустой список запроса', () => {
    expect(cityScope(ALL_CITIES, ALMATY, CITY_LIST).cityIds).toEqual([]);
    expect(cityScope(ALL_CITIES, ALMATY, CITY_LIST).cityIdsJoined).toBeUndefined();
  });

  it('снятый на странице фильтр пишется как `all`, иначе вернулся бы город шапки', () => {
    expect(cityScope(undefined, ALMATY).toParam([])).toBe(ALL_CITIES);
    expect(cityScope(undefined, undefined).toParam([])).toBeUndefined();
    expect(cityScope(undefined, ALMATY).toParam([ASTANA])).toBe(ASTANA);
  });
});

describe('определение города', () => {
  const cities = Object.values(CITIES);

  function withPosition(lat: number, lng: number): void {
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (ok: PositionCallback) => {
          ok({ coords: { latitude: lat, longitude: lng } } as GeolocationPosition);
        },
      },
    });
  }

  it('ближайший город из справочника', async () => {
    withPosition(43.25, 76.95);
    await expect(detectCity(cities)).resolves.toMatchObject({
      kind: 'found',
      city: { id: ALMATY },
    });
  });

  it('далеко от всех городов — выбрать самому', async () => {
    withPosition(55.75, 37.62);
    await expect(detectCity(cities)).resolves.toEqual({ kind: 'far' });
  });

  it('отказ в доступе', async () => {
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (_: PositionCallback, fail: PositionErrorCallback) => {
          fail({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError);
        },
      },
    });
    await expect(detectCity(cities)).resolves.toEqual({ kind: 'denied' });
  });
});
