import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import { Eye, EyeOff } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { useT } from '@/common/i18n';

/**
 * Поле пароля с кнопкой «показать». На телефоне пароль набирают вслепую
 * на мелкой клавиатуре — посмотреть, что набрал, проще, чем набрать дважды.
 */
export default function PasswordField({ slotProps, ...props }: TextFieldProps): ReactNode {
  const t = useT();
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      slotProps={{
        ...slotProps,
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                edge="end"
                aria-label={visible ? t('password.hide') : t('password.show')}
                aria-pressed={visible}
                onClick={() => {
                  setVisible((current) => !current);
                }}
                sx={{ width: 44, height: 44 }}
              >
                {visible ? <EyeOff size={20} aria-hidden /> : <Eye size={20} aria-hidden />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
