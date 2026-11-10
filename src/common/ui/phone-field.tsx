import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { useLocale, useT } from '@/common/i18n';
import {
  caretAfterDigits,
  countryByIso,
  DEFAULT_COUNTRY,
  digitsBefore,
  formatNational,
  formatPhone,
  nationalDigits,
  nationalLength,
  parsePhone,
  PHONE_COUNTRIES,
  type PhoneCountry,
} from '@/common/phone';

type PhoneFieldProps = Omit<TextFieldProps, 'value' | 'onChange' | 'type'> & {
  /** Полная запись с кодом страны: `+7 (701) 123-45-67`. Пустая — номера нет. */
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** Ссылка на поле — функцией, как её отдаёт `react-hook-form`. */
  readonly inputRef?: (node: HTMLInputElement | null) => void;
};

/**
 * Поле телефона: код страны выбирается слева, номер набирается по маске
 * этой страны.
 *
 * Номер набирают и вставляют как угодно — с «8» вместо кода, пробелами,
 * целиком с «+998…»: вставленный с плюсом номер сам переключает страну.
 * Стирание скобки или дефиса стирает цифру перед ним — иначе курсор
 * упирался бы в знак маски.
 */
export default function PhoneField({
  value,
  onChange,
  inputRef,
  slotProps,
  ...props
}: PhoneFieldProps): ReactNode {
  const t = useT();
  const locale = useLocale();
  const element = useRef<HTMLInputElement | null>(null);
  const caret = useRef<number | null>(null);
  const parsed = parsePhone(value);
  const [chosen, setChosen] = useState<PhoneCountry>(parsed?.country ?? DEFAULT_COUNTRY);
  // Номер пришёл снаружи с другим кодом (сохранённый, вставленный) — страна
  // следует за ним. С тем же кодом выбор человека не сбивается: у Казахстана
  // и России код общий.
  const country = parsed !== null && parsed.country.dial !== chosen.dial ? parsed.country : chosen;
  const national = parsed?.national ?? '';
  const display = formatNational(country, national);

  // Названия стран — на языке интерфейса, без своих словарей.
  const names = useMemo(() => {
    const regions = new Intl.DisplayNames([locale], { type: 'region' });
    return new Map(PHONE_COUNTRIES.map((item) => [item.iso, regions.of(item.iso) ?? item.iso]));
  }, [locale]);

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
      // Образец номера страны: «(700) 000-00-00», «90 000-00-00».
      placeholder={formatNational(country, '0'.repeat(nationalLength(country)))}
      value={display}
      inputRef={(node: HTMLInputElement | null) => {
        element.current = node;
        inputRef?.(node);
      }}
      onChange={(event) => {
        const raw = event.target.value;

        // Вставили номер целиком с кодом страны — страна по коду.
        const pasted = raw.trim().startsWith('+') ? parsePhone(raw) : null;

        if (pasted !== null) {
          setChosen(pasted.country);
          onChange(formatPhone(pasted.country, pasted.national));
          return;
        }

        const position = event.target.selectionStart ?? raw.length;
        let digits = nationalDigits(country, raw);
        let before = Math.min(digitsBefore(raw, position), digits.length);

        // Стёрли знак маски: цифры те же, строка короче — стираем цифру слева.
        if (digits === national && raw.length < display.length && before > 0) {
          digits = digits.slice(0, before - 1) + digits.slice(before);
          before -= 1;
        }

        caret.current = caretAfterDigits(formatNational(country, digits), before);
        onChange(formatPhone(country, digits));
      }}
      slotProps={{
        ...slotProps,
        htmlInput: {
          inputMode: 'tel',
          ...(typeof slotProps?.htmlInput === 'object' ? slotProps.htmlInput : {}),
        },
        input: {
          startAdornment: (
            <InputAdornment position="start" sx={{ mr: 0.5 }}>
              <Select
                variant="standard"
                disableUnderline
                value={country.iso}
                onChange={(event) => {
                  const next = countryByIso(event.target.value);
                  setChosen(next);
                  onChange(formatPhone(next, national.slice(0, nationalLength(next))));
                }}
                renderValue={(iso) => `+${countryByIso(iso).dial}`}
                inputProps={{ 'aria-label': t('phone.country') }}
                sx={{
                  fontVariantNumeric: 'tabular-nums',
                  '& .MuiSelect-select': { py: 0, minHeight: 0 },
                }}
                MenuProps={{ slotProps: { paper: { sx: { maxHeight: 360 } } } }}
              >
                {PHONE_COUNTRIES.map((item) => (
                  <MenuItem key={item.iso} value={item.iso} sx={{ minHeight: 40, gap: 2 }}>
                    <span style={{ flex: 1 }}>{names.get(item.iso)}</span>
                    <span style={{ color: 'var(--ink-500)', fontVariantNumeric: 'tabular-nums' }}>
                      +{item.dial}
                    </span>
                  </MenuItem>
                ))}
              </Select>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
