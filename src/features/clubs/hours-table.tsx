import { clubHoursOf, clubLocalTime, type ClubHoursInterval } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import { ChevronDown } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

import { formatWeekday, useLocale, useT } from '@/common/i18n';

import { formatMinutes, weekdayDate } from './club-time';

const WEEK = [1, 2, 3, 4, 5, 6, 7] as const;

function dayText(hours: readonly ClubHoursInterval[], weekday: number, dayOff: string): string {
  const day = clubHoursOf(hours, weekday);

  return day.length === 0
    ? dayOff
    : day
        .map(
          (interval) => `${formatMinutes(interval.opensMin)}–${formatMinutes(interval.closesMin)}`,
        )
        .join(', ');
}

/**
 * Часы работы по дням — ADR-055, структурой, а не картинкой.
 *
 * Сегодняшний день выделен. На телефоне неделя свёрнута до строки
 * «Сегодня 08:00–23:00»: в зал идут сегодня, а не в четверг через неделю.
 */
export default function HoursTable({
  hours,
  note,
}: {
  readonly hours: readonly ClubHoursInterval[];
  readonly note: string | null;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const today = clubLocalTime(new Date()).weekday;

  if (hours.length === 0 && note === null) return null;

  const week = (
    <Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 0.75 }}>
      {WEEK.map((weekday) => {
        const current = weekday === today;
        const weight = current ? 600 : 400;

        return (
          <Box key={weekday} sx={{ display: 'contents' }}>
            <Typography component="dt" variant="body2" sx={{ fontWeight: weight, pr: 3 }}>
              {formatWeekday(weekdayDate(weekday), locale, 'long')}
            </Typography>
            <Typography
              component="dd"
              variant="body2"
              sx={{
                m: 0,
                fontWeight: weight,
                fontVariantNumeric: 'tabular-nums',
                color: current ? 'text.primary' : 'text.secondary',
              }}
            >
              {dayText(hours, weekday, t('club.hours.dayOff'))}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );

  return (
    <Box>
      {hours.length > 0 && (
        <>
          {/* Телефон: строка «сегодня», неделя — по нажатию. */}
          <Box sx={{ display: { xs: 'block', md: 'none' } }}>
            <ButtonBase
              aria-expanded={expanded}
              aria-controls={`${id}-week`}
              onClick={() => {
                setExpanded((value) => !value);
              }}
              sx={{
                width: '100%',
                minHeight: 44,
                justifyContent: 'space-between',
                borderRadius: 2,
                typography: 'body2',
              }}
            >
              <span>
                <strong>{t('club.hours.today')}</strong>{' '}
                <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {dayText(hours, today, t('club.hours.dayOff'))}
                </Box>
              </span>
              <ChevronDown
                size={18}
                aria-hidden
                style={{ transform: expanded ? 'rotate(180deg)' : undefined }}
              />
            </ButtonBase>
            {expanded && (
              <Box id={`${id}-week`} sx={{ mt: 1 }}>
                {week}
              </Box>
            )}
          </Box>
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>{week}</Box>
        </>
      )}
      {note !== null && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          {note}
        </Typography>
      )}
    </Box>
  );
}
