/**
 * Строка запроса из набора фильтров.
 *
 * Пустые значения выбрасываются, а не уходят пустым параметром: фильтры
 * проверяются на сервере Zod-схемой, и `?city=` для неё не «без фильтра»,
 * а непройденная проверка (ТС 7).
 *
 * Булев фильтр уходит строкой `true`: на той стороне его разбирает
 * `z.stringbool()` — в адресной строке других значений не бывает.
 */
export function queryString(
  params: Readonly<Record<string, string | number | boolean | undefined>>,
): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  }

  const value = search.toString();

  return value === '' ? '' : `?${value}`;
}
