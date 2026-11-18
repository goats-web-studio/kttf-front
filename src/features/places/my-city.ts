import { nearestCity, type CityRef, type CityView } from '@kttf/shared/types';
import { useCallback, useMemo } from 'react';
import { create } from 'zustand';

import { updateAccount } from '@/features/auth/api';
import { useSessionStore } from '@/features/auth/session-store';

/**
 * Мой город — ADR-093.
 *
 * Вошедшему город хранит аккаунт (`AuthUserView.city`), гостю — браузер.
 * Город гостя пишется и вошедшему: после выхода сайт остаётся в том же
 * городе, а не прыгает на «Все города».
 */
const KEY = 'kttf.city';
/** Гостю уже предлагали определить город — второй раз не навязываемся. */
const ASKED_KEY = 'kttf.city-asked';

function readStored(): CityRef | null {
  try {
    const raw = globalThis.localStorage.getItem(KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as Partial<CityRef> | null;

    return typeof parsed?.id === 'string' && typeof parsed.name === 'string'
      ? { id: parsed.id, name: parsed.name, nameKk: parsed.nameKk ?? null }
      : null;
  } catch {
    // Приватный режим и испорченная запись — то же, что города нет.
    return null;
  }
}

function writeStored(city: CityRef | null): void {
  try {
    if (city === null) globalThis.localStorage.removeItem(KEY);
    else
      globalThis.localStorage.setItem(
        KEY,
        JSON.stringify({ id: city.id, name: city.name, nameKk: city.nameKk }),
      );
  } catch {
    // Хранилище недоступно: город проживёт до перезагрузки.
  }
}

interface GuestCityState {
  readonly city: CityRef | null;
  readonly asked: boolean;
  readonly set: (city: CityRef | null) => void;
  readonly markAsked: () => void;
}

function readAsked(): boolean {
  try {
    return globalThis.localStorage.getItem(ASKED_KEY) !== null;
  } catch {
    return true;
  }
}

export const useGuestCity = create<GuestCityState>((set) => ({
  city: readStored(),
  asked: readAsked(),
  set: (city) => {
    writeStored(city);
    set({ city });
  },
  markAsked: () => {
    try {
      globalThis.localStorage.setItem(ASKED_KEY, '1');
    } catch {
      // Не запомнили — спросим ещё раз после перезагрузки, не страшно.
    }
    set({ asked: true });
  },
}));

/** Город, который сайт показывает по умолчанию. `null` — все города. */
export function useMyCity(): CityRef | null {
  const user = useSessionStore((state) => state.user);
  const guest = useGuestCity((state) => state.city);

  return user === null ? guest : user.city;
}

/**
 * Сменить мой город. Вошедшему — сразу на экране и следом в аккаунт;
 * отказ сервера возвращает прежний город и пробрасывается вызвавшему.
 */
export function useSetMyCity(): (city: CityRef | null) => Promise<void> {
  return useCallback(async (city) => {
    useGuestCity.getState().set(city);
    const { user, userChanged } = useSessionStore.getState();
    if (user === null) return;

    const before = user.city;
    userChanged({ ...user, city });
    try {
      const saved = await updateAccount({ cityId: city?.id ?? null });
      userChanged(saved);
    } catch (error) {
      const current = useSessionStore.getState().user;
      if (current !== null) userChanged({ ...current, city: before });
      throw error;
    }
  }, []);
}

/** Чем закончилось определение города. */
export type DetectResult =
  | { readonly kind: 'found'; readonly city: CityView }
  /** Ближайший город справочника дальше 150 км. */
  | { readonly kind: 'far' }
  | { readonly kind: 'denied' }
  /** Нет геолокации, нет сигнала или вышло время. */
  | { readonly kind: 'unavailable' };

/**
 * Определить город по местоположению — ADR-093.
 *
 * Координаты не уходят с устройства: ближайший город ищется здесь, по
 * центрам городов из справочника. Точность — город, а не дом, поэтому
 * спутник не нужен, и годится позиция часовой давности.
 */
export function detectCity(cities: readonly CityView[]): Promise<DetectResult> {
  const geo = (globalThis.navigator as Navigator | undefined)?.geolocation;
  if (geo === undefined) return Promise.resolve({ kind: 'unavailable' });

  return new Promise((resolve) => {
    geo.getCurrentPosition(
      (position) => {
        const city = nearestCity(cities, {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        resolve(city === undefined ? { kind: 'far' } : { kind: 'found', city });
      },
      (error) => {
        resolve({ kind: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable' });
      },
      { enableHighAccuracy: false, maximumAge: 60 * 60_000, timeout: 15_000 },
    );
  });
}

/**
 * Разрешение на геолокацию уже дано — тогда город определяется молча, без
 * вопроса. Браузер без Permissions API — считаем, что не дано.
 */
export async function geolocationGranted(): Promise<boolean> {
  try {
    const status = await globalThis.navigator.permissions.query({ name: 'geolocation' });
    return status.state === 'granted';
  } catch {
    return false;
  }
}

/** Значение `?city=` «все города» — явный отказ от города шапки. */
export const ALL_CITIES = 'all';

/** Города фильтра страницы с учётом города шапки. */
export interface CityScope {
  /** Что фильтрует список: выбранное на странице или город шапки. */
  readonly ids: readonly string[];
  /** Через запятую для запроса и старого кода; `undefined` — все города. */
  readonly joined: string | undefined;
  /** Значение `?city=` для выбора на странице: пустой выбор — «все». */
  readonly toParam: (ids: readonly string[]) => string | undefined;
}

/**
 * Фильтр «Город» страницы — ADR-093.
 *
 * Без `?city=` список показывает город шапки; `?city=all` — все города;
 * иначе — выбранные на странице. Снятый на странице фильтр пишется как
 * `all`, иначе он тут же вернулся бы городом шапки.
 */
export function cityScope(param: string | undefined, myCityId: string | undefined): CityScope {
  const ids =
    param === ALL_CITIES
      ? []
      : param === undefined
        ? myCityId === undefined
          ? []
          : [myCityId]
        : param.split(',').filter((part) => part !== '' && part !== ALL_CITIES);

  return {
    ids,
    joined: ids.length === 0 ? undefined : ids.join(','),
    toParam: (next) =>
      next.length > 0 ? next.join(',') : myCityId === undefined ? undefined : ALL_CITIES,
  };
}

export function useCityScope(param: string | undefined): CityScope {
  const myCityId = useMyCity()?.id;

  return useMemo(() => cityScope(param, myCityId), [param, myCityId]);
}
