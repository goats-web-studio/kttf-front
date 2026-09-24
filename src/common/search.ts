import { z } from 'zod';

/**
 * Поля адресной строки для фильтров — docs/07-design-system.md, 6.2.
 *
 * Состояние фильтров живёт в URL: ссылку на рейтинг города пересылают в
 * WhatsApp, и она обязана открыться тем же экраном. Отсюда два правила.
 *
 * **Кривое значение отбрасывается, а не роняет страницу.** Ссылку правят
 * руками и обрезают мессенджеры; человек, открывший `?club=abc`, должен
 * увидеть рейтинг без фильтра, а не экран ошибки. Поэтому у каждого поля
 * `.catch(undefined)`.
 *
 * **Умолчание в адрес не пишется.** Первая страница и пустой фильтр — это
 * отсутствие поля: так у одного экрана один адрес, и ссылки не различаются
 * хвостом `?page=1`.
 */

/**
 * Текст из адреса.
 *
 * Роутер разбирает значения как JSON, и город «2024» пришёл бы числом —
 * возвращаем его в строку, а не теряем фильтр.
 */
export const searchText = z
  .preprocess(
    (value) => (typeof value === 'number' ? String(value) : value),
    z.string().trim().min(1).max(100),
  )
  .optional()
  .catch(undefined);

export const searchId = z.uuid().optional().catch(undefined);

/** День без времени, как его отдаёт `<input type="date">`. */
export const searchDay = z.iso.date().optional().catch(undefined);

/** Номер страницы; первая не пишется (см. выше). */
export const searchPage = z.coerce.number().int().min(2).optional().catch(undefined);

/** Пустая строка из поля ввода — снятый фильтр, то есть отсутствие поля. */
export function orUndefined(value: string): string | undefined {
  const trimmed = value.trim();

  return trimmed === '' ? undefined : trimmed;
}
