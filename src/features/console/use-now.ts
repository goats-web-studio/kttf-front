import { useEffect, useState } from 'react';

/**
 * Текущее время, обновляемое с заданным шагом.
 *
 * Нужно ровно для двух вещей: сколько идёт встреча на столе и давно ли пару
 * позвали. Обе грубые — минута и десятки секунд, — поэтому таймер редкий и
 * не перерисовывает экран каждую секунду.
 */
export function useNow(stepMs: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, stepMs);

    return () => {
      clearInterval(timer);
    };
  }, [stepMs]);

  return now;
}

/** Целых минут с момента `since`. `null` — момент неизвестен. */
export function minutesSince(since: string | null, now: number): number | null {
  if (since === null) {
    return null;
  }

  return Math.max(0, Math.floor((now - Date.parse(since)) / 60_000));
}
