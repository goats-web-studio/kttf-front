/**
 * Когда новую версию сайта можно поставить без вопроса.
 *
 * Обычные страницы обновляются сами — при переходе на другую страницу или в
 * фоне. Консоль судьи и экран зала обновляются только по кнопке: перезагрузка
 * посреди матча может сбить ввод счёта, а в зале со слабой сетью страница
 * может не подняться обратно (приоритет №2 брифа).
 */

/** Разделы, где момент обновления выбирает человек. */
const GUARDED = [/^\/console(\/|$)/, /^\/screen\//];

export function isGuardedPath(pathname: string): boolean {
  return GUARDED.some((pattern) => pattern.test(pathname));
}

/** Поля, в которые человек набирает текст. */
const TEXT_FIELDS = [
  'textarea',
  'input:not([type])',
  'input[type="text"]',
  'input[type="search"]',
  'input[type="email"]',
  'input[type="tel"]',
  'input[type="url"]',
  'input[type="number"]',
  'input[type="password"]',
  '[contenteditable=""]',
  '[contenteditable="true"]',
].join(',');

/**
 * На странице что-то набрано — перезагружать в фоне нельзя.
 *
 * Правило с запасом: любое непустое поле, в том числе заполненный фильтр,
 * откладывает обновление до перехода на другую страницу. Лучше обновиться
 * позже, чем потерять недописанное сообщение.
 */
export function hasTypedText(root: ParentNode = document): boolean {
  for (const element of root.querySelectorAll<HTMLElement>(TEXT_FIELDS)) {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      if (!element.disabled && !element.readOnly && element.value.trim() !== '') {
        return true;
      }
    } else if (element.textContent.trim() !== '') {
      return true;
    }
  }

  return false;
}
