import type { ClubView, TournamentListItemView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import { useTheme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import {
  fill,
  formatDate,
  formatDateTime,
  formatMonthTitle,
  formatWeekday,
  useLocale,
  useT,
} from '@/common/i18n';
import EmptyState from '@/common/ui/empty-state';
import { usePlaceName } from '@/features/places/place-name';

import {
  byDay,
  dateOfDay,
  firstDayOf,
  monthGrid,
  shiftMonth,
  type DayKey,
  type MonthKey,
} from './calendar-model';
import { TOURNAMENT_STATUS_KEYS } from './labels';
import RatingCapBadge from './rating-cap-badge';
import { Participants, StartTime, TournamentName } from './tournament-line';

/** Клуб турнира из справочника, который страница уже загрузила. */
type ClubOf = (clubId: string) => ClubView | undefined;

interface TournamentCalendarProps {
  readonly month: MonthKey;
  readonly today: DayKey;
  readonly items: readonly TournamentListItemView[];
  readonly club: ClubOf;
  readonly onMonth: (month: MonthKey) => void;
}

/**
 * Сколько турниров видно в клетке до «Ещё N». Больше трёх — и одна неделя
 * с насыщенными выходными растягивает месяц за пределы экрана. Четвёртый
 * показывается сам: кнопка «Ещё 1» заняла бы ту же строку.
 */
const VISIBLE = 3;

/**
 * Календарь турниров на месяц — основной вид страницы, как у RTTF (ADR-052).
 *
 * На десктопе — сетка недель с понедельника: в клетке дня турнир — две
 * строки фиксированной высоты: слева столбиком время и планка, справа
 * название и клуб с участниками. Полное название, адрес и статус — в
 * подсказке, чтобы клетка не росла от длинных названий. На телефоне семь колонок в 360px не
 * читаются, и тот же месяц идёт лентой по дням, где есть турниры: телефон —
 * своя раскладка, а не уменьшенная сетка (07, 4).
 */
export default function TournamentCalendar({
  month,
  today,
  items,
  club,
  onMonth,
}: TournamentCalendarProps): ReactNode {
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true });
  const days = byDay(items);

  return (
    <Box component="section" data-calendar={month}>
      <MonthNav month={month} onMonth={onMonth} />
      {wide ? (
        <MonthGrid month={month} today={today} days={days} club={club} />
      ) : (
        <MonthAgenda month={month} today={today} days={days} club={club} />
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
  readonly club: ClubOf;
}

function MonthGrid({ month, today, days, club }: DaysProps): ReactNode {
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
          {week.map((day) => (
            <DayCell
              key={day.key}
              dayKey={day.key}
              day={day.day}
              inMonth={day.inMonth}
              today={today}
              list={days.get(day.key) ?? []}
              club={club}
            />
          ))}
        </Box>
      ))}
    </Box>
  );
}

/** Клетка дня: первые турниры и «Ещё N», раскрывающее остальные. */
function DayCell({
  dayKey,
  day,
  inMonth,
  today,
  list,
  club,
}: {
  readonly dayKey: DayKey;
  readonly day: number;
  readonly inMonth: boolean;
  readonly today: DayKey;
  readonly list: readonly TournamentListItemView[];
  readonly club: ClubOf;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const folded = !open && list.length > VISIBLE + 1;
  const shown = folded ? list.slice(0, VISIBLE) : list;

  return (
    <Box
      role="cell"
      data-day={dayKey}
      aria-label={formatDate(dateOfDay(dayKey).toISOString(), locale)}
      sx={{
        minHeight: 96,
        px: 0.75,
        py: 0.75,
        minWidth: 0,
        bgcolor: inMonth ? 'transparent' : 'var(--paper-sunken)',
        '& + &': { borderLeft: 1, borderColor: 'var(--line)' },
      }}
    >
      <DayNumber day={day} isToday={dayKey === today} past={dayKey < today} muted={!inMonth} />
      <Box component="ul" sx={{ m: 0, mt: 0.25, p: 0, listStyle: 'none', display: 'grid' }}>
        {shown.map((tournament) => (
          <CellEntry key={tournament.id} tournament={tournament} club={club(tournament.clubId)} />
        ))}
      </Box>
      {list.length > VISIBLE + 1 && (
        <ButtonBase
          aria-expanded={open}
          onClick={() => {
            setOpen(!open);
          }}
          sx={{
            mt: 0.25,
            px: 0.5,
            py: 0.25,
            borderRadius: 1,
            typography: 'caption',
            fontWeight: 600,
            color: 'text.secondary',
            '&:hover': { color: 'text.primary', bgcolor: 'var(--paper-sunken)' },
          }}
        >
          {open
            ? t('tournaments.day.less')
            : fill(t('tournaments.day.more'), { count: String(list.length - VISIBLE) })}
        </ButtonBase>
      )}
    </Box>
  );
}

/**
 * Турнир в клетке — две строки ровной высоты. Слева столбиком время и
 * планка: время читается вертикалью, как в расписании. Справа название в
 * одну строку и под ним клуб с участниками. Наведение или фокус показывает
 * всё целиком: название, дату, клуб, адрес, планку, статус.
 */
function CellEntry({
  tournament,
  club,
}: {
  readonly tournament: TournamentListItemView;
  readonly club: ClubView | undefined;
}): ReactNode {
  return (
    <Tooltip
      placement="right-start"
      enterDelay={250}
      enterNextDelay={150}
      describeChild
      title={<EntryDetails tournament={tournament} club={club} />}
    >
      <Box
        component="li"
        data-tournament={tournament.id}
        sx={{
          display: 'grid',
          gridTemplateColumns: 'auto minmax(0, 1fr)',
          gridTemplateRows: 'auto auto',
          alignItems: 'center',
          columnGap: 0.75,
          rowGap: 0.25,
          py: 0.5,
          typography: 'body2',
          fontSize: 12.5,
          lineHeight: 1.25,
          '& + &': { borderTop: 1, borderColor: 'var(--line)' },
        }}
      >
        <StartTime startsAt={tournament.startsAt} />
        <Box sx={{ minWidth: 0 }}>
          <TournamentName tournament={tournament} truncate />
        </Box>
        <RatingCapBadge tournament={tournament} />
        <Box
          sx={{
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            color: 'text.secondary',
            fontSize: 11.5,
          }}
        >
          <Box
            component="span"
            data-club
            sx={{
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {club === undefined ? '' : (club.shortName ?? club.name)}
          </Box>
          <Participants tournament={tournament} />
        </Box>
      </Box>
    </Tooltip>
  );
}

/** Адрес клуба с городом: «Абая 10, Алматы». */
function useVenue(): (club: ClubView) => string {
  const placeName = usePlaceName();

  return (club) => [club.address, placeName(club.city)].filter(Boolean).join(', ');
}

/** Содержимое подсказки: всё, что в клетку не поместилось. */
function EntryDetails({
  tournament,
  club,
}: {
  readonly tournament: TournamentListItemView;
  readonly club: ClubView | undefined;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const venue = useVenue();

  return (
    <Box sx={{ display: 'grid', gap: 0.25, py: 0.25, maxWidth: 260 }}>
      <Box component="span" sx={{ fontWeight: 700, fontSize: 13 }}>
        {tournament.name}
      </Box>
      <span>
        {formatDateTime(tournament.startsAt, locale)} ·{' '}
        {t(TOURNAMENT_STATUS_KEYS[tournament.status])}
      </span>
      {club !== undefined && (
        <>
          <Box component="span" sx={{ mt: 0.5, fontWeight: 600 }}>
            {club.name}
          </Box>
          <Box component="span" sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <MapPin size={12} aria-hidden style={{ flexShrink: 0 }} />
            {venue(club)}
          </Box>
        </>
      )}
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
function MonthAgenda({ month, today, days, club }: DaysProps): ReactNode {
  const t = useT();
  const locale = useLocale();
  const venue = useVenue();
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
              {(days.get(key) ?? []).map((tournament) => {
                const host = club(tournament.clubId);

                return (
                  <Box
                    key={tournament.id}
                    component="li"
                    data-tournament={tournament.id}
                    sx={{
                      px: 2,
                      py: 1,
                      minHeight: 48,
                      display: 'grid',
                      gridTemplateColumns: 'auto auto minmax(0, 1fr) auto',
                      alignItems: 'center',
                      columnGap: 1,
                      rowGap: 0.25,
                      typography: 'body2',
                      '& + &': { borderTop: 1, borderColor: 'var(--line)' },
                    }}
                  >
                    <StartTime startsAt={tournament.startsAt} />
                    <RatingCapBadge tournament={tournament} />
                    <TournamentName tournament={tournament} />
                    <Participants tournament={tournament} />
                    {host !== undefined && (
                      <Box
                        data-club
                        sx={{
                          gridColumn: '3 / -1',
                          typography: 'caption',
                          color: 'text.secondary',
                        }}
                      >
                        {host.name} · {venue(host)}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
