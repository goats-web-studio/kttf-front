import type { ClubView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, Plus, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { formatWeekday, useLocale, useT, type MessageKey } from '@/common/i18n';

import { setClubHours, updateClub } from '../api';
import { weekdayDate } from '../club-time';
import { clubKeys } from '../queries';
import EditorSection from './editor-section';
import { fromHoursWeek, toHoursWeek, type HoursRow, type HoursWeek } from './hours-form';

const DEFAULT_ROW: HoursRow = { opens: '09:00', closes: '22:00' };

/**
 * Часы работы неделей — ADR-055. День без интервалов — выходной.
 * «Как в понедельник» копирует понедельник в день: у большинства залов
 * будни одинаковые, и вписывать одно и то же пять раз незачем.
 */
export default function HoursEditor({ club }: { readonly club: ClubView }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [week, setWeek] = useState<HoursWeek>(() => toHoursWeek(club.hours));
  const [note, setNote] = useState(club.hoursNote ?? '');
  const [invalid, setInvalid] = useState<MessageKey | null>(null);
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: async (hours: Parameters<typeof setClubHours>[1]['hours']) => {
      await setClubHours(club.id, { hours });
      const nextNote = note.trim() === '' ? null : note.trim();

      if (nextNote !== club.hoursNote) {
        await updateClub(club.id, { hoursNote: nextNote });
      }
    },
    onSuccess: async () => {
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: clubKeys.all });
    },
  });

  const setDay = (index: number, rows: readonly HoursRow[]): void => {
    setSaved(false);
    setWeek((current) => current.map((day, dayIndex) => (dayIndex === index ? rows : day)));
  };

  return (
    <EditorSection
      title={t('manage.page.hours')}
      lead={t('manage.hours.hint')}
      isPending={save.isPending}
      saved={saved}
      error={save.error}
      invalid={invalid}
      onSave={() => {
        const hours = fromHoursWeek(week);

        if (hours === null) {
          setInvalid('manage.hours.invalid');
          return;
        }

        setInvalid(null);
        save.mutate(hours);
      }}
    >
      <Box sx={{ display: 'grid', gap: 2 }}>
        {week.map((day, index) => {
          const dayName = formatWeekday(weekdayDate(index + 1), locale, 'long');

          return (
            <Box
              key={dayName}
              sx={{
                display: 'grid',
                gap: 1,
                gridTemplateColumns: { xs: '1fr', sm: '140px 1fr' },
                alignItems: 'start',
                pb: 2,
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <Typography sx={{ fontWeight: 600, pt: { sm: 1 } }}>{dayName}</Typography>
              <Box sx={{ display: 'grid', gap: 1 }}>
                {day.length === 0 && (
                  <Typography color="text.secondary" sx={{ pt: { sm: 1 } }}>
                    {t('club.hours.dayOff')}
                  </Typography>
                )}
                {day.map((row, rowIndex) => (
                  <Box
                    // Строки не переставляются, только добавляются и
                    // убираются — индекс как ключ здесь честен.
                    key={rowIndex}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <TimeField
                      label={t('manage.hours.opens')}
                      value={row.opens}
                      onChange={(opens) => {
                        setDay(
                          index,
                          day.map((item, i) => (i === rowIndex ? { ...item, opens } : item)),
                        );
                      }}
                    />
                    <TimeField
                      label={t('manage.hours.closes')}
                      value={row.closes}
                      onChange={(closes) => {
                        setDay(
                          index,
                          day.map((item, i) => (i === rowIndex ? { ...item, closes } : item)),
                        );
                      }}
                    />
                    <IconButton
                      aria-label={t('manage.hours.remove')}
                      onClick={() => {
                        setDay(
                          index,
                          day.filter((_, i) => i !== rowIndex),
                        );
                      }}
                      sx={{ width: 44, height: 44 }}
                    >
                      <X size={18} aria-hidden />
                    </IconButton>
                  </Box>
                ))}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {day.length < 3 && (
                    <Button
                      size="small"
                      startIcon={<Plus size={16} aria-hidden />}
                      onClick={() => {
                        setDay(index, [...day, day.at(-1) ?? DEFAULT_ROW]);
                      }}
                      sx={{ minHeight: 44 }}
                    >
                      {t('manage.hours.add')}
                    </Button>
                  )}
                  {index > 0 && (
                    <Button
                      size="small"
                      startIcon={<Copy size={16} aria-hidden />}
                      onClick={() => {
                        setDay(index, week[0] ?? []);
                      }}
                      sx={{ minHeight: 44 }}
                    >
                      {t('manage.hours.copyMonday')}
                    </Button>
                  )}
                </Box>
              </Box>
            </Box>
          );
        })}
        <TextField
          label={t('manage.hours.note')}
          value={note}
          onChange={(event) => {
            setSaved(false);
            setNote(event.target.value);
          }}
          slotProps={{ htmlInput: { maxLength: 200 } }}
        />
      </Box>
    </EditorSection>
  );
}

/**
 * Время текстом «08:00», а не `type="time"`: родное поле на Android
 * показывает 12-часовой циферблат по языку системы и не даёт вписать
 * «02:00» как ночное закрытие без лишних касаний.
 */
function TimeField({
  label,
  value,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
}): ReactNode {
  return (
    <TextField
      label={label}
      value={value}
      size="small"
      onChange={(event) => {
        onChange(event.target.value);
      }}
      slotProps={{
        htmlInput: { inputMode: 'numeric', maxLength: 5, placeholder: '08:00' },
      }}
      sx={{ width: 110 }}
    />
  );
}
