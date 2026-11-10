import TextField, { type TextFieldProps } from '@mui/material/TextField';
import { useLayoutEffect, useRef, type ReactNode } from 'react';

import { useT } from '@/common/i18n';
import { caretAfterDigits, digitsBefore, formatPhone, nationalDigits } from '@/common/phone';

type PhoneFieldProps = Omit<TextFieldProps, 'value' | 'onChange' | 'type'> & {
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** Ссылка на поле — функцией, как её отдаёт `react-hook-form`. */
  readonly inputRef?: (node: HTMLInputElement | null) => void;
};

/**
 * Поле телефона с маской `+7 (701) 123-45-67`.
 *
 * Номер набирают и вставляют как угодно — с восьмёркой, пробелами, через
 * `+7`: поле приводит его к одному виду, а на сервер уходит `+7XXXXXXXXXX`
 * (`toE164`). Стирание скобки или дефиса стирает цифру перед ним — иначе
 * курсор упирался бы в знак маски.
 */
export default function PhoneField({
  value,
  onChange,
  inputRef,
  slotProps,
  ...props
}: PhoneFieldProps): ReactNode {
  const t = useT();
  const element = useRef<HTMLInputElement | null>(null);
  const caret = useRef<number | null>(null);
  // Номер, сохранённый раньше без маски («+77011234567»), показывается в ней же.
  const display = value === '' ? '' : formatPhone(nationalDigits(value));

  useLayoutEffect(() => {
    if (caret.current !== null && element.current === document.activeElement) {
      element.current?.setSelectionRange(caret.current, caret.current);
      caret.current = null;
    }
  });

  return (
    <TextField
      {...props}
      type="tel"
      autoComplete="tel"
      placeholder={t('login.phone.placeholder')}
      value={display}
      inputRef={(node: HTMLInputElement | null) => {
        element.current = node;
        inputRef?.(node);
      }}
      onChange={(event) => {
        const raw = event.target.value;
        const position = event.target.selectionStart ?? raw.length;
        let digits = nationalDigits(raw);
        let before = digitsBefore(raw, position);

        // Стёрли знак маски: цифры те же, строка короче — стираем цифру слева.
        if (digits === nationalDigits(display) && raw.length < display.length && before > 0) {
          digits = digits.slice(0, before - 1) + digits.slice(before);
          before -= 1;
        }

        const next = formatPhone(digits);
        caret.current = caretAfterDigits(next, before);
        onChange(next);
      }}
      slotProps={{
        ...slotProps,
        htmlInput: {
          inputMode: 'tel',
          ...(typeof slotProps?.htmlInput === 'object' ? slotProps.htmlInput : {}),
        },
      }}
    />
  );
}
