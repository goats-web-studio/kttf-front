import { SCREEN_EVENTS, type ScreenView } from '@kttf/shared/types';
import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { fetchScreen, screenStreamUrl } from './api';

export const screenKeys = {
  state: (publicToken: string) => ['screen', publicToken] as const,
};

/**
 * Состояние экрана зала — ТЗ 6.5.
 *
 * Обычный запрос даёт первое состояние и внятный отказ по неизвестному
 * токену; дальше состояние приходит потоком (ADR-025). Порядок именно такой:
 * поток отвечает потоком и на неверный токен тоже, и отличить «нет такого
 * турнира» от «сеть отвалилась» по нему нельзя.
 *
 * Опроса по таймеру нет: пока поток открыт, он приносит изменения сам.
 */
export function screenQuery(publicToken: string) {
  return queryOptions({
    queryKey: screenKeys.state(publicToken),
    queryFn: () => fetchScreen(publicToken),
    // Поток держит состояние свежим, перезапрашивать нечего.
    staleTime: Infinity,
  });
}

export interface ScreenState {
  readonly view: ScreenView | undefined;
  readonly isPending: boolean;
  readonly error: unknown;
  /** Поток открыт. `false` — на стене последнее известное состояние. */
  readonly live: boolean;
  readonly retry: () => void;
}

export function useScreen(publicToken: string): ScreenState {
  const queryClient = useQueryClient();
  const state = useQuery(screenQuery(publicToken));
  const [live, setLive] = useState(false);

  useEffect(() => {
    const source = new EventSource(screenStreamUrl(publicToken));

    source.addEventListener(SCREEN_EVENTS.state, (event: MessageEvent<string>) => {
      setLive(true);
      queryClient.setQueryData(screenKeys.state(publicToken), JSON.parse(event.data) as ScreenView);
    });

    // `ping` не несёт состояния и нужен ровно для этого: он доказывает, что
    // канал жив, когда в зале давно ничего не менялось.
    source.addEventListener(SCREEN_EVENTS.ping, () => {
      setLive(true);
    });

    // Отказ не гасит экран: на стене остаётся последнее состояние с меткой
    // «нет связи». `EventSource` переподключается сам, и `state` придёт
    // снова, как только сеть вернётся.
    source.onerror = () => {
      setLive(false);
    };

    return () => {
      source.close();
    };
  }, [publicToken, queryClient]);

  return {
    view: state.data,
    isPending: state.isPending,
    error: state.error,
    live,
    retry: () => void state.refetch(),
  };
}
