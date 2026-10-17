import TextField, { type TextFieldProps } from '@mui/material/TextField';
import { useState, type ReactNode } from 'react';

type IntegerFieldProps = Omit<TextFieldProps, 'value' | 'onChange' | 'type'> & {
  /** Применённое число. Пока поле пусто, оно остаётся прежним. */
  readonly value: number;
  readonly onChange: (value: number) => void;
};

/**
 * Целое число в управляемом поле.
 *
 * Поле держит набранный текст само. Иначе пустая строка тут же становится
 * нулём (`Number('') === 0`): ноль нельзя стереть, и следующая цифра
 * встаёт рядом с ним — «04». Пока поле пусто, наружу ничего не уходит и
 * число остаётся прежним; уход из поля возвращает его на экран.
 *
 * Тип `text` с цифровой клавиатурой, а не `number`: числовое поле браузера
 * принимает «e» и «-», крутит значение колесом мыши и по-разному ведёт себя
 * в разных браузерах.
 */
export default function IntegerField({ value, onChange, ...props }: IntegerFieldProps): ReactNode {
  const [text, setText] = useState(String(value));
  const [seen, setSeen] = useState(value);

  // Число поменяли снаружи — например, сменой схемы. Набранное заменяется,
  // если оно о другом числе.
  if (value !== seen) {
    setSeen(value);
    if (Number(text) !== value) {
      setText(String(value));
    }
  }

  return (
    <TextField
      {...props}
      type="text"
      value={text}
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, '');

        setText(digits);
        if (digits !== '') {
          const next = Number(digits);
          setSeen(next);
          onChange(next);
        }
      }}
      onBlur={(event) => {
        setText(String(value));
        props.onBlur?.(event);
      }}
      slotProps={{
        ...props.slotProps,
        htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' },
      }}
    />
  );
}
