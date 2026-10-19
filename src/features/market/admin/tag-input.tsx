import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import { useState, type ReactNode } from 'react';

import { useT } from '@/common/i18n';

interface TagInputProps {
  readonly label: string;
  readonly helperText?: string;
  readonly values: readonly string[];
  readonly onChange: (values: readonly string[]) => void;
  /** Проверка значения до добавления: неверное остаётся в поле с подсказкой. */
  readonly valid?: (value: string) => boolean;
  readonly max?: number;
}

/**
 * Список строк чипами: Enter или запятая добавляет набранное, крестик
 * убирает. Повтор без учёта регистра не добавляется — так же отвергает его
 * сервер («Написание повторяется»).
 */
export default function TagInput({
  label,
  helperText,
  values,
  onChange,
  valid = () => true,
  max = 40,
}: TagInputProps): ReactNode {
  const t = useT();
  const [text, setText] = useState('');
  const [invalid, setInvalid] = useState(false);

  const add = (raw: string = text): void => {
    const value = raw.trim();
    if (value === '') return;
    if (!valid(value)) {
      setInvalid(true);
      return;
    }
    setText('');
    setInvalid(false);
    if (values.length >= max) return;
    if (values.some((item) => item.toLowerCase() === value.toLowerCase())) return;
    onChange([...values, value]);
  };

  return (
    <Box>
      <TextField
        fullWidth
        label={label}
        value={text}
        error={invalid}
        helperText={invalid ? t('catalog.form.invalidValue') : helperText}
        onChange={(event) => {
          const next = event.target.value;
          setInvalid(false);
          setText(next.replace(/,/g, ''));
          if (next.includes(',')) add(next.replace(/,/g, ''));
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            add();
          }
        }}
        onBlur={() => {
          add();
        }}
        disabled={values.length >= max}
      />
      {values.length > 0 && (
        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {values.map((value) => (
            <Chip
              key={value}
              label={value}
              onDelete={() => {
                onChange(values.filter((item) => item !== value));
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
