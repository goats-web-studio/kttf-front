import type { MessageKey } from '@/common/i18n';

/** Числовое поле: цифровая клавиатура на телефоне. */
const NUMERIC = { inputMode: 'numeric' } as const;

/**
 * Подсказка под полем формы справочника — так же, как в форме клуба: ошибка
 * объявляется чтецу экрана сразу.
 */
export function fieldHint(
  t: (key: MessageKey) => string,
  error: MessageKey | undefined,
  numeric = false,
) {
  const input = numeric ? { htmlInput: NUMERIC } : {};

  if (error !== undefined) {
    return {
      error: true,
      helperText: t(error),
      slotProps: { ...input, formHelperText: { role: 'alert' } },
    };
  }

  return { slotProps: input };
}

/** Пустое необязательное поле — «не задано», а не пустая строка. */
export const optionalText = {
  setValueAs: (value: string) => (value === '' ? undefined : value),
};

/** Порядок: пусто — «не задано», иначе число; кривое отвергнет схема. */
export const optionalNumber = {
  setValueAs: (value: string | number) =>
    value === '' ? undefined : typeof value === 'number' ? value : Number(value),
};
