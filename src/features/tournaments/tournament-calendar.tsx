import type { TournamentListItemView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { formatDate, formatMonthTitle, formatWeekday, useLocale, useT } from '@/common/i18n';
import EmptyState from '@/common/ui/empty-state';

import {
  byDay,
  dateOfDay,
  firstDayOf,
  monthGrid,
  shiftMonth,
  type DayKey,
  type MonthKey,
} from './calendar-model';
import RatingCapBadge from './rating-cap-badge';
import { Participants, StartTime, TournamentName } from './tournament-line';

interface TournamentCalendarProps {
  readonly month: MonthKey;
  readonly today: DayKey;
  readonly items: readonly TournamentListItemView[];
  readonly onMonth: (month: MonthKey) => void;
}

/**
 * Календарь турниров на месяц — основной вид страницы, как у RTTF (ADR-052).
 *
 * На десктопе — сетка недель с понедельника: в клетке дня турниры строками
 * (время, планка, название, участники). На телефоне семь колонок в 360px не
 * читаются, и тот же месяц идёт лентой по дням, где есть турниры: телефон —
 * своя раскладка, а не уменьшенная сетка (07, 4).
 */
export default function TournamentCalendar({
  month,
  today,
  items,
  onMonth,
}: TournamentCalendarProps): ReactNode {
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true });
  const days = byDay(items);

  return (
    <Box component="section" data-calendar={month}>
      <MonthNav month={month} onMonth={onMonth} />
      {wide ? (
        <MonthGrid month={month} today={today} days={days} />
      ) : (
        <MonthAgenda month={month} today={today} days={days} />
      )}
    </Box>
  );
}

/** «‹ Сентябрь 2026 · Октябрь 2026 · Ноябрь 2026 ›». */
function MonthNav({
  month,
  onMonth,
}: {
  readonly month: MonthKey;
  readonly onMonth: (month: MonthKey) => void;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const previous = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        gap: 1,
        mb: 1.5,
      }}
    >
      <Button
        variant="text"
        onClick={() => {
          onMonth(previous);
        }}
        aria-label={t('tournaments.month.prev')}
        startIcon={<ChevronLeft size={18} aria-hidden />}
        sx={{ minHeight: 44, color: 'text.secondary' }}
      >
        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
          {formatMonthTitle(firstDayOf(previous), locale)}
        </Box>
      </Button>
      <Typography
        variant="h2"
        component="h2"
        aria-live="polite"
        sx={{ textAlign: 'center', fontSize: { xs: 20, sm: 24 } }}
      >
        {formatMonthTitle(firstDayOf(month), locale)}
      </Typography>
      <Button
        variant="text"
        onClick={() => {
          onMonth(next);
        }}
        aria-label={t('tournaments.month.next')}
        endIcon={<ChevronRight size={18} aria-hidden />}
        sx={{ minHeight: 44, color: 'text.secondary' }}
      >
        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
          {formatMonthTitle(firstDayOf(next), locale)}
        </Box>
      </Button>
    </Box>
  );
}

interface DaysProps {
  readonly month: MonthKey;
  readonly today: DayKey;
  readonly days: ReadonlyMap<DayKey, readonly TournamentListItemView[]>;
}

function MonthGrid({ month, today, days }: DaysProps): ReactNode {
  const locale = useLocale();
  const weeks = monthGrid(month);
  const header = weeks[0] ?? [];

  return (
    <Box
      role="table"
      aria-label={formatMonthTitle(firstDayOf(month), locale)}
      data-calendar-grid
      sx={{
        bgcolor: 'var(--paper)',
        border: 1,
        borderColor: 'var(--line)',
        borderRadius: 4,
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
      }}
    >
      <Box role="row" sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
        {header.map((day) => (
          <Box
            key={day.key}
            role="columnheader"
            sx={{
              px: 1.5,
              py: 1,
              typography: 'caption',
              fontWeight: 600,
              color: 'text.secondary',
              borderBottom: 1,
              borderColor: 'var(--line)',
            }}
          >
            {formatWeekday(dateOfDay(day.key), locale, 'short')}
          </Box>
        ))}
      </Box>
      {weeks.map((week) => (
        <Box
          key={week[0]?.key}
          role="row"
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            '& + &': { borderTop: 1, borderColor: 'var(--line)' },
          }}
        >
          {week.map((day) => {
            const list = days.get(day.key) ?? [];
            const isToday = day.key === today;

            return (
              <Box
                key={day.key}
                role="cell"
                data-day={day.key}
                aria-label={formatDate(dateOfDay(day.key).toISOString(), locale)}
                sx={{
                  minHeight: 112,
                  p: 1,
                  minWidth: 0,
                  bgcolor: day.inMonth ? 'transparent' : 'var(--paper-sunken)',
                  '& + &': { borderLeft: 1, borderColor: 'var(--line)' },
                }}
              >
                <DayNumber
                  day={day.day}
                  isToday={isToday}
                  past={day.key < today}
                  muted={!day.inMonth}
                />
                <Box
                  component="ul"
                  sx={{ m: 0, mt: 0.5, p: 0, listStyle: 'none', display: 'grid', gap: 0.5 }}
                >
                  {list.map((tournament) => (
                    <Box
                      key={tournament.id}
                      component="li"
                      sx={{
                        display: 'grid',
                        // Клетка узкая: время, планка и участники — строкой,
                        // название — под ними целиком, с переносом. Обрезанное
                        // до «Де…» название в календаре не читается.
                        gridTemplateColumns: 'auto auto minmax(0, 1fr) auto',
                        alignItems: 'center',
                        columnGap: 0.75,
                        rowGap: 0.25,
                        py: 0.5,
                        typography: 'body2',
                        fontSize: 12.5,
                        lineHeight: 1.3,
                        '& + &': { borderTop: 1, borderColor: 'var(--line)' },
                      }}
                    >
                      <StartTime startsAt={tournament.startsAt} />
                      <RatingCapBadge tournament={tournament} />
                      <span />
                      <Participants tournament={tournament} />
                      <Box sx={{ gridColumn: '1 / -1', minWidth: 0, overflowWrap: 'anywhere' }}>
                        <TournamentName tournament={tournament} />
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}

/**
 * Число в клетке. Сегодня — красная пилюля: одна яркая деталь сетки
 * (07, 1.5). Прошедшие дни и хвосты соседних месяцев приглушены.
 */
function DayNumber({
  day,
  isToday,
  past,
  muted,
}: {
  readonly day: number;
  readonly isToday: boolean;
  readonly past: boolean;
  readonly muted: boolean;
}): ReactNode {
  const t = useT();

  return (
    <Box
      component="span"
      {...(isToday ? { 'aria-current': 'date' as const, title: t('tournaments.today') } : {})}
      sx={{
        display: 'inline-grid',
        placeItems: 'center',
        minWidth: 26,
        height: 26,
        px: 0.75,
        borderRadius: 999,
        fontWeight: 700,
        fontSize: 14,
        fontVariantNumeric: 'tabular-nums',
        ...(isToday
          ? { bgcolor: 'var(--red-600)', color: 'var(--paper)' }
          : { color: muted ? 'var(--ink-300)' : past ? 'var(--ink-500)' : 'var(--ink-900)' }),
      }}
    >
      {day}
    </Box>
  );
}

/** Телефон: месяц лентой по дням, где есть турниры. */
function MonthAgenda({ month, today, days }: DaysProps): ReactNode {
  const t = useT();
  const locale = useLocale();
  const keys = [...days.keys()].filter((key) => key.startsWith(month)).sort();

  if (keys.length === 0) {
    return <EmptyState title={t('tournaments.month.empty')} />;
  }

  return (
    <Box
      component="ol"
      data-calendar-agenda
      sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1.5 }}
    >
      {keys.map((key) => {
        const date = dateOfDay(key);

        return (
          <Box
            key={key}
            component="li"
            data-day={key}
            sx={{
              bgcolor: 'var(--paper)',
              border: 1,
              borderColor: 'var(--line)',
              borderRadius: 4,
              boxShadow: 'var(--shadow-card)',
              overflow: 'hidden',
            }}
          >
            <Box
              component="h3"
              sx={{
                m: 0,
                px: 2,
                py: 1.25,
                typography: 'body2',
                fontWeight: 700,
                display: 'flex',
                gap: 1,
                alignItems: 'baseline',
                color: key < today ? 'text.secondary' : 'text.primary',
                borderBottom: 1,
                borderColor: 'var(--line)',
              }}
            >
              {formatDate(date.toISOString(), locale)}
              <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary' }}>
                {formatWeekday(date, locale, 'long')}
              </Box>
              {key === today && (
                <Box component="span" sx={{ ml: 'auto', color: 'var(--red-600)', fontWeight: 600 }}>
                  {t('tournaments.today')}
                </Box>
              )}
            </Box>
            <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
              {(days.get(key) ?? []).map((tournament) => (
                <Box
                  key={tournament.id}
                  component="li"
                  sx={{
                    px: 2,
                    minHeight: 48,
                    display: 'grid',
                    gridTemplateColumns: 'auto auto minmax(0, 1fr) auto',
                    alignItems: 'center',
                    columnGap: 1,
                    typography: 'body2',
                    '& + &': { borderTop: 1, borderColor: 'var(--line)' },
                  }}
                >
                  <StartTime startsAt={tournament.startsAt} />
                  <RatingCapBadge tournament={tournament} />
                  <TournamentName tournament={tournament} />
                  <Participants tournament={tournament} />
                </Box>
              ))}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
