/**
 * Строка запроса из набора фильтров.
 *
 * Пустые значения выбрасываются, а не уходят пустым параметром: фильтры
 * проверяются на сервере Zod-схемой, и `?city=` для неё не «без фильтра»,
 * а непройденная проверка (ТС 7).
 *
 * Список уходит одним параметром через запятую: `?status=FINISHED,RATED`.
 *
 * Булев фильтр уходит строкой `true`: на той стороне его разбирает
 * `z.stringbool()` — в адресной строке других значений не бывает.
 */
export function queryString(
  params: Readonly<Record<string, string | number | boolean | readonly string[] | undefined>>,
): string {
  const search = new URLSearchParams();

  for (const [key, raw] of Object.entries(params)) {
    // Список — через запятую, одним параметром: так его разбирает сервер
    // (статусы турнира, ADR-051). Пустой список — то же, что нет фильтра.
    const value = Array.isArray(raw) ? raw.join(',') : raw;

    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  }

  const value = search.toString();

  return value === '' ? '' : `?${value}`;
}
