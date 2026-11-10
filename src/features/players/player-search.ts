import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { playersQuery } from './queries';

/** Пауза после набора: запрос — когда человек перестал печатать. */
const DEBOUNCE_MS = 300;

/**
 * Поиск себя среди профилей без кабинета — при регистрации и в кабинете
 * («Мой рейтинг», ADR-072). Ищет по мере набора, от двух букв. Только
 * профили без кабинета и с рейтингом: остальные уже чьи-то или ещё не
 * подтверждены организатором (сервер это и проверяет).
 */
export function usePlayerSearch(text: string) {
  const [search, setSearch] = useState(text.trim());

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(text.trim());
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [text]);

  const enabled = search.length >= 2;
  const found = useQuery({
    ...playersQuery({ search, withoutAccount: true, page: 1, limit: 8 }),
    enabled,
  });

  return {
    enabled,
    // Пока человек печатает, старый ответ не выдаётся за ответ на новый текст.
    isFetching: enabled && (found.isFetching || search !== text.trim()),
    items: enabled ? found.data?.items : undefined,
  };
}
