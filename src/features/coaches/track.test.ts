import { beforeEach, describe, expect, it, vi } from 'vitest';

import { rememberTrafficSource } from '@/features/clubs/track';

import { trackCoachContact, trackCoachView } from './track';

const sendCoachEvent = vi.hoisted(() => vi.fn());
vi.mock('./api', () => ({ sendCoachEvent }));

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
  sendCoachEvent.mockClear();
});

describe('учёт обращений к тренеру', () => {
  it('просмотр — один раз за сессию на тренера', () => {
    trackCoachView('coach-1', storage);
    trackCoachView('coach-1', storage);
    trackCoachView('coach-2', storage);

    expect(sendCoachEvent.mock.calls).toEqual([
      ['coach-1', 'VIEW', 'ORGANIC'],
      ['coach-2', 'VIEW', 'ORGANIC'],
    ]);
  });

  it('просмотры тренеров не смешиваются с клубами', () => {
    storage.setItem('kttf.viewedClubs', 'coach-1');
    trackCoachView('coach-1', storage);

    expect(sendCoachEvent).toHaveBeenCalledTimes(1);
  });

  it('источник — первый заход в сессии: пришёл по рекламе — реклама', () => {
    rememberTrafficSource('?utm_source=instagram', storage);
    trackCoachContact('coach-1', 'WHATSAPP', storage);
    trackCoachContact('coach-1', 'WHATSAPP', storage);

    expect(sendCoachEvent.mock.calls).toEqual([
      ['coach-1', 'WHATSAPP', 'CAMPAIGN'],
      ['coach-1', 'WHATSAPP', 'CAMPAIGN'],
    ]);
  });
});
