/**
 * Строка запроса из набора фильтров.
 *
 * Пустые значения выбрасываются, а не уходят пустым параметром: фильтры
 * проверяются на сервере Zod-схемой, и `?city=` для неё не «без фильтра»,
 * а непройденная проверка (ТС 7).
 */
export function queryString(params: Readonly<Record<string, string | number | undefined>>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  }

  const value = search.toString();

  return value === '' ? '' : `?${value}`;
}
