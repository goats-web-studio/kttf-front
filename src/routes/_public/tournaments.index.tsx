import {
  DEFAULT_PAGE_SIZE,
  tournamentStatusSchema,
  type ListTournamentsQuery,
  type TournamentStatus,
} from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import dayjs, { type Dayjs } from 'dayjs';
import { useCallback, useState, type ReactNode } from 'react';
import { z } from 'zod';

import { endOfDay, fill, formatDate, startOfDay, useLocale, useT } from '@/common/i18n';
import { orUndefined, searchDay, searchId, searchPage } from '@/common/search';
import EmptyState from '@/common/ui/empty-state';
import FilterSummary, { type ActiveFilter } from '@/common/ui/filter-summary';
import Pagination from '@/common/ui/pagination';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { useSessionStore } from '@/features/auth/session-store';
import { clubDirectoryQuery } from '@/features/clubs/queries';
import { managedClubIds } from '@/features/clubs/roles';
import CityFilter from '@/features/places/city-filter';
import { useCityLabel } from '@/features/places/city-label';
import { TOURNAMENT_STATUS_KEYS } from '@/features/tournaments/labels';
import { tournamentsQuery } from '@/features/tournaments/queries';
import TournamentCard from '@/features/tournaments/tournament-card';

/**
 * Статусы, которыми фильтруют публичный календарь.
 *
 * Черновика здесь нет: организатор видит свои черновики в списке и так, а
 * остальным этот фильтр вернул бы пустую страницу и вопрос, куда делись
 * турниры.
 */
const FILTERABLE: readonly TournamentStatus[] = [
  'PUBLISHED',
  'REG_OPEN',
  'REG_CLOSED',
  'RUNNING',
  'FINISHED',
  'RATED',
  'CANCELLED',
];

const searchSchema = z.object({
  /** Город клуба-организатора, по идентификатору справочника (ADR-046). */
  city: searchId,
  club: searchId,
  status: tournamentStatusSchema
    .refine((status) => FILTERABLE.includes(status))
    .optional()
    .catch(undefined),
  from: searchDay,
  to: searchDay,
  page: searchPage,
});

type Search = z.infer<typeof searchSchema>;

export const Route = createFileRoute('/_public/tournaments/')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: TournamentsPage,
});

/**
 * Календарь турниров — ТЗ 9.2.
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

  const page = search.page ?? 1;
  const tournaments = useQuery(tournamentsQuery(toQuery(search, page)));
  const clubs = useQuery(clubDirectoryQuery);
  const cityLabel = useCityLabel();

  // Создание турнира стоит там, где организатор смотрит турниры, а не в
  // отдельном разделе кабинета: разделов ТЗ кабинету не отводит.
  const user = useSessionStore((state) => state.user);
  const canCreate = managedClubIds(user).length > 0;

  // Любая смена фильтра возвращает на первую страницу: третьей страницы
  // суженного списка может не быть. Текст правится на месте (`replace`),
  // чтобы «Назад» не проходил по буквам.
  const filter = useCallback(
    (patch: Partial<Search>, replace = false) => {
      void navigate({
        search: (previous) => ({ ...previous, ...patch, page: undefined }),
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
  if (search.from !== undefined) {
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
  if (search.to !== undefined) {
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
  const extraSet = [search.club, search.from, search.to].filter((v) => v !== undefined).length;
  const extra = more || extraSet > 0 ? {} : { display: { xs: 'none', sm: 'block' } };

  const reset = (): void => {
    void navigate({ search: {} });
  };

  const pages =
    tournaments.data === undefined
      ? 1
      : Math.max(1, Math.ceil(tournaments.data.total / tournaments.data.limit));

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

      <Box
        role="search"
        sx={{
          mt: 3,
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

        <Box sx={{ gridColumn: 'span 2', ...extra }}>
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

      <FilterSummary
        total={tournaments.isError ? null : tournaments.data?.total}
        filters={active}
        onReset={reset}
      />

      <Box sx={{ mt: 2 }}>
        <QueryState
          isPending={tournaments.isPending}
          error={tournaments.error}
          onRetry={() => void tournaments.refetch()}
          loading={<RowsSkeleton />}
        >
          {tournaments.data === undefined ? null : tournaments.data.items.length > 0 ? (
            <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1.5 }}>
              {tournaments.data.items.map((tournament) => (
                <Box component="li" key={tournament.id}>
                  <TournamentCard
                    tournament={tournament}
                    club={clubs.data?.get(tournament.clubId)}
                  />
                </Box>
              ))}
            </Box>
          ) : active.length > 0 ? (
            <EmptyState
              title={t('tournaments.notFound.title')}
              text={t('tournaments.notFound.text')}
              action={<Button onClick={reset}>{t('filter.resetAll')}</Button>}
            />
          ) : (
            <EmptyState
              title={t('tournaments.emptyState.title')}
              text={t('tournaments.emptyState.text')}
              action={<Button href="/ratings">{t('tournaments.emptyState.action')}</Button>}
            />
          )}
        </QueryState>
      </Box>

      <Pagination
        page={page}
        pages={pages}
        onPage={(next) => {
          void navigate({
            search: (previous) => ({ ...previous, page: next === 1 ? undefined : next }),
          });
        }}
      />
    </Container>
  );
}

/** Выбранный день — в поле адреса; пустое или недописанное — снятый фильтр. */
function toDay(value: Dayjs | null): string | undefined {
  return value?.isValid() === true ? value.format('YYYY-MM-DD') : undefined;
}

/**
 * Фильтры адреса — в запрос ТС 7.5.
 *
 * Границы дат раздвигаются до краёв суток по часам человека: он выбирает
 * день, а контракт принимает момент времени. Без этого турнир, начинающийся
 * в полдень, не попал бы в выборку «по сегодня», а границы по UTC сдвинули
 * бы казахстанские сутки на пять часов.
 */
function toQuery(search: Search, page: number): ListTournamentsQuery {
  return {
    page,
    limit: DEFAULT_PAGE_SIZE,
    ...(search.city === undefined ? {} : { cityId: search.city }),
    ...(search.club === undefined ? {} : { clubId: search.club }),
    ...(search.status === undefined ? {} : { status: search.status }),
    ...(search.from === undefined ? {} : { from: startOfDay(search.from).toISOString() }),
    ...(search.to === undefined ? {} : { to: endOfDay(search.to).toISOString() }),
  };
}
