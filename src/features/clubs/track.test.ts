import { beforeEach, describe, expect, it, vi } from 'vitest';

import { rememberTrafficSource, trackClubView, trafficSource } from './track';

const sendClubEvent = vi.hoisted(() => vi.fn());
vi.mock('./api', () => ({ sendClubEvent }));

/** Хранилище сессии в памяти — у каждого теста своё. */
function memoryStorage(): Storage {
  const data = new Map<string, string>();

  return {
    get length() {
      return data.size;
    },
    clear: () => {
      data.clear();
    },
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => {
      data.delete(key);
    },
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

let storage: Storage;

beforeEach(() => {
  storage = memoryStorage();
  sendClubEvent.mockClear();
});

describe('источник прихода', () => {
  it('метки utm в первом адресе — реклама KTTF', () => {
    rememberTrafficSource('?utm_source=instagram&utm_campaign=clubs', storage);

    expect(trafficSource(storage)).toBe('CAMPAIGN');
  });

  it('запоминается первый заход сессии, а не последний', () => {
    rememberTrafficSource('?utm_source=instagram', storage);
    rememberTrafficSource('', storage);

    expect(trafficSource(storage)).toBe('CAMPAIGN');
  });

  it('без меток и без хранилища — органика', () => {
    rememberTrafficSource('?club=1', storage);

    expect(trafficSource(storage)).toBe('ORGANIC');
    expect(trafficSource(null)).toBe('ORGANIC');
  });
});

describe('просмотр клуба', () => {
  it('один раз за сессию на клуб', () => {
    trackClubView('a', storage);
    trackClubView('a', storage);
    trackClubView('b', storage);

    expect(sendClubEvent.mock.calls).toEqual([
      ['a', 'VIEW', 'ORGANIC'],
      ['b', 'VIEW', 'ORGANIC'],
    ]);
  });
});
