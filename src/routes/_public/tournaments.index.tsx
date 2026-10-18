import { tournamentStatusSchema, type TournamentStatus } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import dayjs, { type Dayjs } from 'dayjs';
import { useCallback, useState, type ReactNode } from 'react';
import { z } from 'zod';

import {
  endOfDay,
  fill,
  formatDate,
  startOfDay,
  useLocale,
  useT,
  type MessageKey,
} from '@/common/i18n';
import { orUndefined, searchDay, searchId } from '@/common/search';
import FilterSummary, { type ActiveFilter } from '@/common/ui/filter-summary';
import PillTabs from '@/common/ui/pill-tabs';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { useSessionStore } from '@/features/auth/session-store';
import { clubDirectoryQuery } from '@/features/clubs/queries';
import { managedClubIds } from '@/features/clubs/roles';
import CityFilter from '@/features/places/city-filter';
import { useCityLabel } from '@/features/places/city-label';
import { TOURNAMENT_STATUS_KEYS } from '@/features/tournaments/labels';
import {
  dayKeyOf,
  monthOf,
  monthRange,
  parseMonth,
  startOfToday,
  type MonthKey,
} from '@/features/tournaments/calendar-model';
import {
  monthTournamentsQuery,
  tournamentsFeedQuery,
  type TournamentFilters,
} from '@/features/tournaments/queries';
import TournamentCalendar from '@/features/tournaments/tournament-calendar';
import TournamentList from '@/features/tournaments/tournament-list';

/**
 * Статусы, которыми фильтруют публичный календарь.
 *
 * Черновика здесь нет: организатор видит свои черновики в списке и так, а
 * остальным этот фильтр вернул бы пустую страницу и вопрос, куда делись
 * турниры.
 *
 * «Рейтинг начислен» отдельным пунктом тоже нет (ADR-051): для зрителя это
 * тот же доигранный турнир. «Завершён» находит оба статуса, а метка на
 * карточке по-прежнему говорит, начислен ли рейтинг.
 */
const FILTERABLE: readonly TournamentStatus[] = [
  'PUBLISHED',
  'REG_OPEN',
  'REG_CLOSED',
  'RUNNING',
  'FINISHED',
  'CANCELLED',
];

/** Что уходит серверу за пунктом фильтра: «Завершён» — оба статуса доигранного. */
const STATUSES_OF: Partial<Record<TournamentStatus, readonly TournamentStatus[]>> = {
  FINISHED: ['FINISHED', 'RATED'],
};

const searchSchema = z.object({
  /** Город клуба-организатора, по идентификатору справочника (ADR-046). */
  city: searchId,
  club: searchId,
  status: tournamentStatusSchema
    // Старые ссылки с «Рейтинг начислен» открываются как «Завершён».
    .transform((status): TournamentStatus => (status === 'RATED' ? 'FINISHED' : status))
    .refine((status) => FILTERABLE.includes(status))
    .optional()
    .catch(undefined),
  from: searchDay,
  to: searchDay,
  /** Вид страницы: календарь по умолчанию, список — `?view=list` (ADR-052). */
  view: z.enum(['calendar', 'list']).optional().catch(undefined),
  /** Месяц календаря `2026-10`; без него — текущий. */
  month: z
    .string()
    .refine((value) => parseMonth(value) !== undefined)
    .optional()
    .catch(undefined),
});

type View = 'calendar' | 'list';

const VIEWS: readonly (readonly [View, MessageKey])[] = [
  ['calendar', 'tournaments.view.calendar'],
  ['list', 'tournaments.view.list'],
];

type Search = z.infer<typeof searchSchema>;

export const Route = createFileRoute('/_public/tournaments/')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: TournamentsPage,
});

/**
 * Календарь турниров — ТЗ 9.2, в двух видах как у RTTF (ADR-052): сетка
 * месяца — основной, список «Ближайшие / Прошедшие» по датам — второй.
 *
 * Фильтры ТЗ реализованы теми, что даёт контракт ТС 7.5: город, клуб, даты,
 * состояние. Планки рейтинга и возраста в запросе списка нет — расхождение
 * записано открытым вопросом, самовольно контракт не расширяем (бриф 4.2).
 *
 * Фильтры живут в адресе и применяются сразу, без кнопки «Показать»
 * (docs/07-design-system.md, 6.2): ссылку на турниры города пересылают в
 * чат клуба, и она открывается тем же списком.
 */
function TournamentsPage(): ReactNode {
  const t = useT();
  const locale = useLocale();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const view: View = search.view ?? 'calendar';
  // «Сегодня» фиксируется на время жизни страницы: иначе граница блоков
  // списка сдвигалась бы в полночь посреди чтения.
  const [now] = useState(() => new Date());
  const today = startOfToday(now);
  const month: MonthKey = search.month ?? monthOf(now);
  const filters = toFilters(search);
  const range = monthRange(month);

  const calendar = useQuery({
    ...monthTournamentsQuery(filters, range.from, range.to),
    enabled: view === 'calendar',
    // Пока грузится соседний месяц, видна прежняя сетка, а не скелетон.
    placeholderData: keepPreviousData,
  });
  const dates = {
    ...(search.from === undefined ? {} : { from: startOfDay(search.from) }),
    ...(search.to === undefined ? {} : { to: endOfDay(search.to) }),
  };
  const upcoming = useInfiniteQuery({
    ...tournamentsFeedQuery(filters, 'upcoming', today, dates),
    enabled: view === 'list',
  });
  const past = useInfiniteQuery({
    ...tournamentsFeedQuery(filters, 'past', today, dates),
    enabled: view === 'list',
  });
  const clubs = useQuery(clubDirectoryQuery);
  const cityLabel = useCityLabel();

  // Создание турнира стоит там, где организатор смотрит турниры, а не в
  // отдельном разделе кабинета: разделов ТЗ кабинету не отводит.
  const user = useSessionStore((state) => state.user);
  const canCreate = managedClubIds(user).length > 0;

  // Фильтр меняет адрес: ссылку пересылают в чат клуба, и она открывается
  // тем же видом, месяцем и условиями.
  const filter = useCallback(
    (patch: Partial<Search>, replace = false) => {
      void navigate({
        search: (previous) => ({ ...previous, ...patch }),
        replace,
      });
    },
    [navigate],
  );

  const active: ActiveFilter[] = [];
  if (search.city !== undefined) {
    active.push({
      key: 'city',
      label: fill(t('filter.chip'), { label: t('filter.city'), value: cityLabel(search.city) }),
      onRemove: () => {
        filter({ city: undefined });
      },
    });
  }
  if (search.club !== undefined) {
    active.push({
      key: 'club',
      label: fill(t('filter.chip'), {
        label: t('filter.club'),
        value: clubs.data?.get(search.club)?.name ?? t('common.loading'),
      }),
      onRemove: () => {
        filter({ club: undefined });
      },
    });
  }
  if (search.status !== undefined) {
    active.push({
      key: 'status',
      label: t(TOURNAMENT_STATUS_KEYS[search.status]),
      onRemove: () => {
        filter({ status: undefined });
      },
    });
  }
  if (view === 'list' && search.from !== undefined) {
    active.push({
      key: 'from',
      label: fill(t('filter.chip'), {
        label: t('filter.from'),
        value: formatDate(startOfDay(search.from).toISOString(), locale),
      }),
      onRemove: () => {
        filter({ from: undefined });
      },
    });
  }
  if (view === 'list' && search.to !== undefined) {
    active.push({
      key: 'to',
      label: fill(t('filter.chip'), {
        label: t('filter.to'),
        value: formatDate(startOfDay(search.to).toISOString(), locale),
      }),
      onRemove: () => {
        filter({ to: undefined });
      },
    });
  }

  // На телефоне пять полей подряд занимают экран до списка; первый ряд — город
  // и состояние, самые частые условия, остальное раскрывается (раздел 6.2).
  // Поле с заданным значением скрытым не бывает: иначе фильтр действует, а
  // человек его не видит.
  const [more, setMore] = useState(false);
  const extraSet = [search.club, ...(view === 'list' ? [search.from, search.to] : [])].filter(
    (v) => v !== undefined,
  ).length;
  const extra = more || extraSet > 0 ? {} : { display: { xs: 'none', sm: 'block' } };

  // Сброс снимает условия, но не вид и не месяц: человек остаётся там, где смотрел.
  const reset = (): void => {
    void navigate({ search: { view: search.view, month: search.month } });
  };

  const total =
    view === 'calendar'
      ? calendar.isError
        ? null
        : calendar.data?.length
      : upcoming.isError || past.isError
        ? null
        : upcoming.data === undefined || past.data === undefined
          ? undefined
          : (upcoming.data.pages[0]?.total ?? 0) + (past.data.pages[0]?.total ?? 0);

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <Stack
        direction="row"
        useFlexGap
        spacing={2}
        sx={{ flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between' }}
      >
        <Typography variant="h1">{t('page.tournaments.title')}</Typography>
        {/* Кнопка с href — ссылка роутера: переход остаётся переходом, со
            средней кнопкой мыши и «открыть в новой вкладке». */}
        {canCreate && (
          <Button variant="contained" href="/tournaments/new">
            {t('tournament.form.create')}
          </Button>
        )}
      </Stack>

      <Box sx={{ mt: 3 }}>
        <PillTabs
          value={view}
          options={VIEWS}
          label={t('tournaments.view.label')}
          onChange={(next) => {
            filter({ view: next === 'calendar' ? undefined : next });
          }}
        />
      </Box>

      <Box
        role="search"
        sx={{
          mt: 2,
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(6, 1fr)' },
        }}
      >
        <Box sx={{ gridColumn: { xs: 'span 2', sm: 'span 3' } }}>
          <CityFilter
            value={search.city}
            onChange={(city) => {
              filter({ city });
            }}
          />
        </Box>

        <Box sx={{ gridColumn: { xs: 'span 2', sm: 'span 3' } }}>
          <TextField
            select
            label={t('filter.status')}
            value={search.status ?? ''}
            onChange={(event) => {
              const value = event.target.value;
              filter({ status: FILTERABLE.find((status) => status === value) });
            }}
          >
            <MenuItem value="">{t('filter.any')}</MenuItem>
            {FILTERABLE.map((status) => (
              <MenuItem key={status} value={status}>
                {t(TOURNAMENT_STATUS_KEYS[status])}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {view === 'list' && (
          <Box sx={{ gridColumn: { sm: 'span 2' }, ...extra }}>
            <DatePicker
              label={t('filter.from')}
              value={search.from === undefined ? null : dayjs(search.from)}
              {...(search.to === undefined ? {} : { maxDate: dayjs(search.to) })}
              onChange={(value) => {
                filter({ from: toDay(value) });
              }}
              slotProps={{
                textField: { size: 'small', fullWidth: true },
                field: { clearable: true },
              }}
            />
          </Box>
        )}

        {view === 'list' && (
          <Box sx={{ gridColumn: { sm: 'span 2' }, ...extra }}>
            <DatePicker
              label={t('filter.to')}
              value={search.to === undefined ? null : dayjs(search.to)}
              {...(search.from === undefined ? {} : { minDate: dayjs(search.from) })}
              onChange={(value) => {
                filter({ to: toDay(value) });
              }}
              slotProps={{
                textField: { size: 'small', fullWidth: true },
                field: { clearable: true },
              }}
            />
          </Box>
        )}

        <Box
          sx={{ gridColumn: view === 'list' ? 'span 2' : { xs: 'span 2', sm: 'span 6' }, ...extra }}
        >
          <TextField
            select
            label={t('filter.club')}
            value={search.club ?? ''}
            onChange={(event) => {
              filter({ club: orUndefined(event.target.value) });
            }}
          >
            <MenuItem value="">{t('filter.any')}</MenuItem>
            {[...(clubs.data?.values() ?? [])].map((club) => (
              <MenuItem key={club.id} value={club.id}>
                {club.name}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {extraSet === 0 && (
          <Button
            variant="text"
            aria-expanded={more}
            onClick={() => {
              setMore(!more);
            }}
            sx={{
              gridColumn: 'span 2',
              justifySelf: 'start',
              minHeight: 44,
              display: { sm: 'none' },
            }}
          >
            {more ? t('filter.less') : t('filter.more')}
          </Button>
        )}
      </Box>

      <FilterSummary total={total} filters={active} onReset={reset} />

      <Box sx={{ mt: 2 }}>
        {view === 'calendar' ? (
          <QueryState
            isPending={calendar.isPending}
            error={calendar.error}
            onRetry={() => void calendar.refetch()}
            loading={<RowsSkeleton />}
          >
            <Box sx={{ opacity: calendar.isPlaceholderData ? 0.6 : 1 }}>
              <TournamentCalendar
                month={month}
                today={dayKeyOf(today)}
                items={calendar.data ?? []}
                onMonth={(next) => {
                  filter({ month: next === monthOf(now) ? undefined : next });
                }}
              />
            </Box>
          </QueryState>
        ) : (
          <TournamentList
            upcoming={upcoming}
            past={past}
            clubName={(id) => clubs.data?.get(id)?.name}
          />
        )}
      </Box>
    </Container>
  );
}

/** Выбранный день — в поле адреса; пустое или недописанное — снятый фильтр. */
function toDay(value: Dayjs | null): string | undefined {
  return value?.isValid() === true ? value.format('YYYY-MM-DD') : undefined;
}

/**
 * Фильтры адреса — в запрос ТС 7.5, общие для календаря и списка. Даты
 * «с / по» и месяц сюда не входят: у календаря границы — месяц, у списка —
 * свои блоки (ADR-052).
 */
function toFilters(search: Search): TournamentFilters {
  return {
    ...(search.city === undefined ? {} : { cityId: search.city }),
    ...(search.club === undefined ? {} : { clubId: search.club }),
    ...(search.status === undefined ? {} : { status: STATUSES_OF[search.status] ?? search.status }),
  };
}
