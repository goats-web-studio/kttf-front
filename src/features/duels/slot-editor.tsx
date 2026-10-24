import { DUEL_HORIZON_DAYS } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import { useT, type MessageKey } from '@/common/i18n';

import type { SlotDraft } from './slot-draft';

/**
 * Вариант «дата, с — до» одной строкой. На телефоне дата во всю ширину,
 * часы — двумя полями под ней: три поля в ряд на 360px не читаются.
 */
export default function SlotEditor({
  value,
  onChange,
  onRemove,
  problem,
  label,
}: {
  readonly value: SlotDraft;
  readonly onChange: (next: SlotDraft) => void;
  /** Убрать вариант; без него — вариант единственный и обязательный. */
  readonly onRemove?: (() => void) | undefined;
  /** Что не так — после первой попытки отправить. */
  readonly problem: MessageKey | null;
  /** Подпись поля даты: «Вариант 2». */
  readonly label: string;
}): ReactNode {
  const t = useT();
  const today = dayjs().startOf('day');

  return (
    <Box data-duel-slot>
      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          alignItems: 'start',
          gridTemplateColumns: {
            xs: onRemove === undefined ? '1fr 1fr' : '1fr 1fr 44px',
            sm: onRemove === undefined ? '2fr 1fr 1fr' : '2fr 1fr 1fr 44px',
          },
        }}
      >
        <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
          <DatePicker
            label={label}
            value={value.day === '' ? null : dayjs(value.day)}
            minDate={today}
            maxDate={today.add(DUEL_HORIZON_DAYS, 'day')}
            onChange={(next) => {
              onChange({
                ...value,
                day: next?.isValid() === true ? next.format('YYYY-MM-DD') : '',
              });
            }}
            slotProps={{
              textField: { fullWidth: true, error: problem !== null },
              field: { clearable: true },
            }}
          />
        </Box>
        <TimeField
          label={t('duel.slot.from')}
          value={value.from}
          error={problem !== null}
          onChange={(from) => {
            onChange({ ...value, from });
          }}
        />
        <TimeField
          label={t('duel.slot.to')}
          value={value.to}
          error={problem !== null}
          onChange={(to) => {
            onChange({ ...value, to });
          }}
        />
        {onRemove !== undefined && (
          <IconButton
            aria-label={t('duel.slot.remove')}
            onClick={onRemove}
            sx={{ width: 44, height: 44, mt: 0.5, gridRow: { xs: 2, sm: 'auto' } }}
          >
            <X size={18} aria-hidden />
          </IconButton>
        )}
      </Box>
      {problem !== null && (
        <Typography role="alert" variant="body2" color="error" sx={{ mt: 0.5 }}>
          {t(problem)}
        </Typography>
      )}
    </Box>
  );
}

/** Часы текстом «19:00» — см. `slot-draft.ts`. */
function TimeField({
  label,
  value,
  error,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly error: boolean;
  readonly onChange: (value: string) => void;
}): ReactNode {
  return (
    <TextField
      label={label}
      value={value}
      error={error}
      onChange={(event) => {
        onChange(event.target.value);
      }}
      slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 5, placeholder: '19:00' } }}
    />
  );
}
