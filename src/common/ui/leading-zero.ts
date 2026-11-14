/**
 * Ведущий ноль в числовом поле — «03500», «04».
 *
 * У поля взноса по умолчанию стоит 0, и набранная цифра встаёт рядом с
 * ним: человек видит «03500» и стирает ноль руками. Так было в каждом
 * числовом поле сайта.
 *
 * Чинится одним обработчиком на весь документ, а не в каждом поле: полей
 * много и разных (родные `type="number"` под react-hook-form, управляемые
 * `IntegerField`, рейтинг с дробью), и любое новое числовое поле получает то
 * же поведение само. Обработчик стоит на фазе погружения у `document` —
 * раньше, чем событие дойдёт до корня React, — поэтому и форма, и
 * управляемое поле читают уже очищенное значение.
 *
 * Трогает только числовые поля: `type="number"` и поля с цифровой
 * клавиатурой (`inputmode="numeric"` и `"decimal"`). Телефон (`tel`) и текст
 * не трогает. «0», «0.5» и «0,25» остаются как есть.
 */
export function stripLeadingZeros(text: string): string {
  return text.replace(/^0+(?=\d)/, '');
}

function isNumeric(target: EventTarget | null): target is HTMLInputElement {
  if (!(target instanceof HTMLInputElement)) return false;
  if (target.type === 'number') return true;
  const mode = target.inputMode;
  return mode === 'numeric' || mode === 'decimal';
}

function onInput(event: Event): void {
  const target = event.target;
  if (!isNumeric(target)) return;

  const cleaned = stripLeadingZeros(target.value);
  if (cleaned !== target.value) target.value = cleaned;
}

let installed = false;

/** Подключить один раз при запуске приложения. Повторный вызов ничего не делает. */
export function installLeadingZeroGuard(root: Document = document): () => void {
  if (installed) return () => undefined;
  installed = true;
  root.addEventListener('input', onInput, true);

  return () => {
    root.removeEventListener('input', onInput, true);
    installed = false;
  };
}
