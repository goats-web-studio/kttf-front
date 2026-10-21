import { TRAINING_ENROLLMENTS, type TrainingEnrollment } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Plus, X } from 'lucide-react';
import { useId, type ReactNode } from 'react';

import { useLocale, useT } from '@/common/i18n';

import {
  ENROLLMENT_KEYS,
  SCHEDULE_ERROR_KEYS,
  WEEKDAYS,
  emptyScheduleLine,
  isBlankLine,
  scheduleOf,
  weekdayShort,
  type ScheduleLine,
} from '../schedule';

/** Строк больше, чем дней в неделе, не бывает нужно. */
const LINES_MAX = 7;

/**
 * «Расписание» тренировки в кабинете — T3 (`docs/11` 3.3.1): строки «дни
 * чипами + время с … до …». Разное время в разные дни — отдельной строкой
 * через «Добавить время». Ошибка — текстом у своей строки, по правилу
 * схемы: в один день занятия не пересекаются.
 */
export default function ScheduleEditor({
  lines,
  onChange,
  showErrors,
}: {
  readonly lines: readonly ScheduleLine[];
  readonly onChange: (lines: ScheduleLine[]) => void;
  /** После попытки сохранить — ошибки всех строк, а не только дописанных. */
  readonly showErrors: boolean;
}): ReactNode {
  const t = useT();
  const { errors } = scheduleOf(lines);

  const patch = (key: string, change: Partial<ScheduleLine>): void => {
    onChange(lines.map((line) => (line.key === key ? { ...line, ...change } : line)));
  };

  return (
    <Box role="group" aria-label={t('training.schedule.title')} data-schedule-editor>
      <Typography variant="body2" color="text.secondary">
        {t('training.schedule.lead')}
      </Typography>
      <Box sx={{ mt: 1, display: 'grid', gap: 1.5 }}>
        {lines.map((line, index) => {
          const error = errors[index] ?? null;
          // Ошибка видна, когда строку дописали (оба времени) или пытались
          // сохранить: «выберите день» на полуслове только мешает.
          const ready = line.start.trim() !== '' && line.end.trim() !== '';
          const shown = error !== null && (ready || (showErrors && !isBlankLine(line)));

          return (
            <LineFields
              key={line.key}
              line={line}
              error={shown ? t(SCHEDULE_ERROR_KEYS[error]) : null}
              removable={lines.length > 1}
              onPatch={(change) => {
                patch(line.key, change);
              }}
              onRemove={() => {
                onChange(lines.filter((item) => item.key !== line.key));
              }}
            />
          );
        })}
      </Box>
      {lines.length < LINES_MAX && (
        <Button
          size="small"
          startIcon={<Plus size={16} aria-hidden />}
          onClick={() => {
            onChange([...lines, emptyScheduleLine()]);
          }}
          sx={{ mt: 1, minHeight: 44 }}
        >
          {t('training.schedule.add')}
        </Button>
      )}
    </Box>
  );
}

function LineFields({
  line,
  error,
  removable,
  onPatch,
  onRemove,
}: {
  readonly line: ScheduleLine;
  readonly error: string | null;
  readonly removable: boolean;
  readonly onPatch: (change: Partial<ScheduleLine>) => void;
  readonly onRemove: () => void;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const errorId = useId();

  return (
    <Box
      data-schedule-line
      sx={{
        display: 'grid',
        gap: 1,
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) auto' },
        alignItems: 'center',
      }}
    >
      <Box
        role="group"
        aria-label={t('training.schedule.days')}
        sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}
      >
        {WEEKDAYS.map((weekday) => {
          const on = line.weekdays.includes(weekday);

          return (
            <Chip
              key={weekday}
              label={weekdayShort(weekday, locale)}
              clickable
              variant={on ? 'filled' : 'outlined'}
              aria-pressed={on}
              onClick={() => {
                onPatch({
                  weekdays: on
                    ? line.weekdays.filter((day) => day !== weekday)
                    : [...line.weekdays, weekday].sort((a, b) => a - b),
                });
              }}
              sx={{ height: { xs: 44, sm: 36 }, minWidth: 44 }}
            />
          );
        })}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TimeField
          label={t('training.schedule.from')}
          value={line.start}
          invalid={error !== null}
          describedBy={error === null ? undefined : errorId}
          onChange={(start) => {
            onPatch({ start });
          }}
        />
        <TimeField
          label={t('training.schedule.to')}
          value={line.end}
          invalid={error !== null}
          describedBy={error === null ? undefined : errorId}
          onChange={(end) => {
            onPatch({ end });
          }}
        />
        {removable && (
          <IconButton
            aria-label={t('training.schedule.remove')}
            onClick={onRemove}
            sx={{ width: 44, height: 44, flexShrink: 0 }}
          >
            <X size={18} aria-hidden />
          </IconButton>
        )}
      </Box>
      {error !== null && (
        <Typography
          id={errorId}
          role="alert"
          variant="body2"
          color="error"
          data-schedule-error
          sx={{ gridColumn: '1 / -1' }}
        >
          {error}
        </Typography>
      )}
    </Box>
  );
}

/**
 * Время текстом «18:00», как в часах клуба: родное поле времени на Android
 * показывает 12-часовой циферблат по языку системы.
 */
function TimeField({
  label,
  value,
  invalid,
  describedBy,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly invalid: boolean;
  readonly describedBy: string | undefined;
  readonly onChange: (value: string) => void;
}): ReactNode {
  return (
    <TextField
      label={label}
      value={value}
      size="small"
      error={invalid}
      onChange={(event) => {
        onChange(event.target.value);
      }}
      slotProps={{
        htmlInput: {
          inputMode: 'numeric',
          maxLength: 5,
          placeholder: '18:00',
          'aria-describedby': describedBy,
        },
      }}
      // На телефоне «с» и «до» делят строку пополам — два поля подряд.
      sx={{
        flex: { xs: 1, md: 'none' },
        width: { md: 110 },
        '& .MuiInputBase-root': { minHeight: 44 },
      }}
    />
  );
}

/**
 * «Набор» — переключатель из четырёх: не указан, есть места, мало мест,
 * набор закрыт. Ставит тот, кто ведёт тренировку.
 */
export function EnrollmentPicker({
  value,
  onChange,
}: {
  readonly value: TrainingEnrollment | null;
  readonly onChange: (value: TrainingEnrollment | null) => void;
}): ReactNode {
  const t = useT();
  const options: readonly (TrainingEnrollment | null)[] = [null, ...TRAINING_ENROLLMENTS];

  return (
    <Box role="radiogroup" aria-label={t('training.enrollment.label')}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
        {t('training.enrollment.label')}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {options.map((option) => {
          const on = option === value;

          return (
            <Chip
              key={option ?? 'NONE'}
              label={t(option === null ? 'training.enrollment.none' : ENROLLMENT_KEYS[option])}
              clickable
              role="radio"
              aria-checked={on}
              variant={on ? 'filled' : 'outlined'}
              onClick={() => {
                onChange(option);
              }}
              sx={{ height: { xs: 44, sm: 36 } }}
            />
          );
        })}
      </Box>
    </Box>
  );
}
