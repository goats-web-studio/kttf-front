import { sendProductView } from './api';

/**
 * Просмотры товаров — популярность каталога (`docs/10` 3.1, M1.2 «Популярность»).
 *
 * Один раз за сессию на товар, как у клуба: сервер тоже отсекает повторы, но
 * лишний запрос на каждое возвращение «Назад» ни к чему. Хранится в
 * `sessionStorage`: сессия кончается с вкладкой, и ничего о человеке не
 * остаётся.
 */

const VIEWED_KEY = 'kttf.viewedProducts';

function session(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function trackProductView(productId: string, storage: Storage | null = session()): void {
  const viewed = new Set((storage?.getItem(VIEWED_KEY) ?? '').split(',').filter(Boolean));

  if (viewed.has(productId)) return;

  viewed.add(productId);
  storage?.setItem(VIEWED_KEY, [...viewed].join(','));
  sendProductView(productId);
}
