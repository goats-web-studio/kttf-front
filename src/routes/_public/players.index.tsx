import type { PlayerListItemView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useCallback, type ReactNode } from 'react';

import { fill, formatCount, formatDate, useLocale, useT, type MessageKey } from '@/common/i18n';
import EmptyState from '@/common/ui/empty-state';
import FilterSummary, { type ActiveFilter } from '@/common/ui/filter-summary';
import Pagination from '@/common/ui/pagination';
import PlayerAvatar from '@/common/ui/player-avatar';
import PillTabs from '@/common/ui/pill-tabs';
import RankBadge from '@/common/ui/rank-badge';
import RatingValue from '@/common/ui/rating-value';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { clubDirectoryQuery } from '@/features/clubs/queries';
import type { PickedProduct } from '@/features/market/picked-product';
import { useCityLabel } from '@/features/places/city-label';
import { usePlaceName } from '@/features/places/place-name';
import { playerName } from '@/features/players/player-name';
import { equipmentFilterLabel } from '@/features/players/equipment-labels';
import { EquipmentText } from '@/features/players/equipment-text';
import PlayersFilter, { type PlayersFilterValue } from '@/features/players/players-filter';
import {
  citiesOf,
  parsePlayersSearch,
  toPlayersQuery,
  type PlayersSearch,
} from '@/features/players/players-search';
import { playersQuery } from '@/features/players/queries';

export const Route = createFileRoute('/_public/players/')({
  validateSearch: parsePlayersSearch,
  component: PlayersPage,
});

const VIEWS: readonly (readonly ['list' | 'equipment', MessageKey])[] = [
  ['list', 'players.view.list'],
  ['equipment', 'players.view.equipment'],
];

/** Колонки, которых на телефоне нет: город уходит подписью под фамилию. */
const WIDE = { display: { xs: 'none', sm: 'table-cell' } } as const;

/** «Обновлён» — только на широком экране: на планшете строке и так тесно. */
const WIDEST = { display: { xs: 'none', md: 'table-cell' } } as const;

/**
 * Игроки — ADR-054, по образцу страницы «Игроки» RTTF; бывший «Рейтинг»
 * (ТЗ 9.1).
 *
 * Порядок задаёт сервер: рейтинг приходит строкой, и сортировка строк на
 * клиенте поставила бы «9.50» выше «100.00». Заголовок «Рейтинг» переключает
 * порядок, но сортирует по-прежнему сервер.
 *
 * Фильтры — рейтинг «от / до», несколько городов, клуб, пол, рука и поиск по
 * ФИО. Логина в таблице и в поиске нет: им входят на сайт (ADR-054).
 * Направление одно — настольный теннис; рейтинга федерации пока нет.
 *
 * История изменений рейтинга живёт в профиле игрока, куда ведёт фамилия.
 * Фильтры, порядок и страница — в адресе (docs/07-design-system.md, 6.2):
 * ссылку на рейтинг города пересылают в чат.
 */
function PlayersPage(): ReactNode {
  const t = useT();
  const locale = useLocale();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const page = search.page ?? 1;
  const players = useQuery(playersQuery(toPlayersQuery(search)));
  const clubs = useQuery(clubDirectoryQuery);
  const placeName = usePlaceName();
  const cityLabel = useCityLabel();

  // Смена фильтра возвращает на первую страницу.
  const filter = useCallback(
    (patch: Partial<PlayersSearch>) => {
      void navigate({ search: (previous) => ({ ...previous, ...patch, page: undefined }) });
    },
    [navigate],
  );

  const items = players.data?.items ?? [];
  const bladeLabel =
    search.bladeId === undefined ? undefined : equipmentFilterLabel(search.bladeId, 'blade', items);
  const rubberLabel =
    search.rubberId === undefined
      ? undefined
      : equipmentFilterLabel(search.rubberId, 'rubber', items);
  const picked = (id: string | undefined, label: string | undefined): PickedProduct | null =>
    id === undefined
      ? null
      : { id, label: label ?? t('players.filter.productChosen'), image: null };

  const active = activeFilters(search, {
    t,
    cityLabel,
    clubName: (id) => clubs.data?.get(id)?.name ?? t('common.loading'),
    remove: filter,
  });
  if (search.bladeId !== undefined) {
    active.push({
      key: 'blade',
      label: fill(t('filter.chip'), {
        label: t('players.filter.blade'),
        value: bladeLabel ?? t('players.filter.productChosen'),
      }),
      onRemove: () => {
        filter({ bladeId: undefined });
      },
    });
  }
  if (search.rubberId !== undefined) {
    active.push({
      key: 'rubber',
      label: fill(t('filter.chip'), {
        label: t('players.filter.rubber'),
        value: rubberLabel ?? t('players.filter.productChosen'),
      }),
      onRemove: () => {
        filter({ rubberId: undefined });
      },
    });
  }
  const equipmentView = search.view === 'equipment';

  const reset = (): void => {
    void navigate({ search: {} });
  };

  const descending = search.order === undefined;
  const total = players.data?.total ?? 0;
  const pages =
    players.data === undefined
      ? 1
      : Math.max(1, Math.ceil(players.data.total / players.data.limit));

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <Typography variant="h1">{t('page.players.title')}</Typography>

      {/* Ключ — фильтры из адреса: снятый чип или «Назад» заново заполняют поля. */}
      <PlayersFilter
        key={JSON.stringify([filterPart(search), bladeLabel, rubberLabel])}
        initial={search}
        blade={picked(search.bladeId, bladeLabel)}
        rubber={picked(search.rubberId, rubberLabel)}
        onSubmit={(value: PlayersFilterValue) => {
          filter(value);
        }}
      />

      {/* «Список игроков / инвентарь игроков», как у RTTF (ADR-058). */}
      <Box sx={{ mt: 3 }}>
        <PillTabs
          value={equipmentView ? 'equipment' : 'list'}
          options={VIEWS}
          label={t('players.view.label')}
          onChange={(next) => {
            void navigate({
              search: (previous) => ({
                ...previous,
                view: next === 'equipment' ? 'equipment' : undefined,
              }),
              replace: true,
              resetScroll: false,
            });
          }}
        />
      </Box>

      <FilterSummary
        total={players.isError ? null : players.data?.total}
        filters={active}
        onReset={reset}
      />

      <Box sx={{ mt: 2 }}>
        <QueryState
          isPending={players.isPending}
          error={players.error}
          onRetry={() => void players.refetch()}
          loading={<RowsSkeleton />}
        >
          {players.data === undefined ? null : players.data.items.length > 0 ? (
            // До 640px таблица сжимается до трёх колонок, а город уходит
            // подписью под фамилию (docs/08-ux-draft.md, 3.3): место и
            // рейтинг остаются крупными, горизонтальной прокрутки нет.
            // Шапка липкая (раздел 6.1).
            <Paper variant="outlined">
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell align="center" sx={{ width: 56 }}>
                      {t('ratings.column.rank')}
                    </TableCell>
                    <TableCell>{t('ratings.column.player')}</TableCell>
                    {equipmentView ? null : (
                      <TableCell sx={WIDE}>{t('ratings.column.city')}</TableCell>
                    )}
                    <TableCell align="right" sortDirection={descending ? 'desc' : 'asc'}>
                      <TableSortLabel
                        active
                        direction={descending ? 'desc' : 'asc'}
                        onClick={() => {
                          filter({ order: descending ? 'asc' : undefined });
                        }}
                        sx={{ minHeight: 44 }}
                      >
                        {t('ratings.column.rating')}
                      </TableSortLabel>
                    </TableCell>
                    {equipmentView ? (
                      <>
                        <TableCell sx={WIDE}>{t('player.form.blade')}</TableCell>
                        <TableCell sx={WIDE}>{t('players.column.forehand')}</TableCell>
                        <TableCell sx={WIDE}>{t('players.column.backhand')}</TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell align="right" sx={WIDE}>
                          {t('ratings.column.matches')}
                        </TableCell>
                        <TableCell align="right" sx={WIDEST}>
                          {t('players.column.updated')}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {players.data.items.map((player, index) => {
                    // Место — в отобранном списке по силе: при порядке «слабые
                    // первыми» первая строка — последнее место, а не первое.
                    const position = (page - 1) * players.data.limit + index;
                    const rank = descending ? position + 1 : total - position;

                    return (
                      <PlayerRow
                        key={player.id}
                        player={player}
                        rank={rank}
                        rankLabel={formatCount(rank, locale)}
                        city={placeName(player.city)}
                        updated={
                          player.ratingUpdatedAt === null
                            ? '—'
                            : formatDate(player.ratingUpdatedAt, locale)
                        }
                        matches={formatCount(player.ratedMatches, locale)}
                        provisional={t('ratings.provisional')}
                        equipment={equipmentView}
                      />
                    );
                  })}
                </TableBody>
              </Table>
            </Paper>
          ) : active.length > 0 ? (
            <EmptyState
              title={t('ratings.notFound.title')}
              text={t('ratings.notFound.text')}
              action={<Button onClick={reset}>{t('filter.resetAll')}</Button>}
            />
          ) : (
            <EmptyState
              title={t('ratings.emptyState.title')}
              text={t('ratings.emptyState.text')}
              action={<Button href="/tournaments">{t('ratings.emptyState.action')}</Button>}
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

function PlayerRow({
  player,
  rank,
  rankLabel,
  city,
  updated,
  matches,
  provisional,
  equipment,
}: {
  readonly player: PlayerListItemView;
  /** «Инвентарь игроков»: основание и накладки вместо города, встреч и даты. */
  readonly equipment: boolean;
  readonly rank: number;
  readonly rankLabel: string;
  readonly city: string;
  readonly updated: string;
  readonly matches: string;
  readonly provisional: string;
}): ReactNode {
  return (
    <TableRow hover sx={{ height: { xs: 68, sm: 60 } }}>
      <TableCell align="center" sx={NUM}>
        <RankBadge rank={rank} label={rankLabel} />
      </TableCell>
      <TableCell>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <PlayerAvatar
            lastName={player.lastName}
            firstName={player.firstName}
            photoUrl={player.photoUrl}
          />
          <Box sx={{ minWidth: 0 }}>
            <Link
              href={`/players/${player.id}`}
              color="text.primary"
              sx={{ fontWeight: 600, display: 'inline-block', py: 0.5 }}
            >
              {playerName(player)}
            </Link>
            {player.isProvisional && (
              // Провизорный рейтинг двигается быстрее и означает, что
              // игрок сыграл меньше 20 рейтинговых встреч (ТЗ 7.1).
              // Подписью, а не плашкой в рамке: в новом рейтинге
              // провизорны почти все, и рамки в каждой строке
              // рябили сильнее самих фамилий.
              <Typography
                component="span"
                variant="caption"
                color="text.secondary"
                sx={{
                  ml: { xs: 0, sm: 1 },
                  display: { xs: 'block', sm: 'inline' },
                  whiteSpace: 'nowrap',
                }}
              >
                {provisional}
              </Typography>
            )}
            {equipment ? (
              // На телефоне колонок инвентаря нет — он строками под фамилией.
              <Box sx={{ display: { sm: 'none' }, typography: 'body2', color: 'text.secondary' }}>
                <Box>
                  <EquipmentText value={player.blade} />
                </Box>
                <Box>
                  <EquipmentText value={player.rubberForehand} />
                  {' / '}
                  <EquipmentText value={player.rubberBackhand} />
                </Box>
              </Box>
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ display: { sm: 'none' }, mt: -0.5 }}
              >
                {city}
              </Typography>
            )}
          </Box>
        </Stack>
      </TableCell>
      {equipment ? null : <TableCell sx={{ ...WIDE, color: 'text.secondary' }}>{city}</TableCell>}
      <TableCell
        align="right"
        sx={{ ...NUM, fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 18 }}
      >
        <RatingValue value={player.rating} />
      </TableCell>
      {equipment ? (
        <>
          {[player.blade, player.rubberForehand, player.rubberBackhand].map((value, index) => (
            <TableCell key={index} sx={{ ...WIDE, typography: 'body2' }}>
              <EquipmentText value={value} />
            </TableCell>
          ))}
        </>
      ) : (
        <>
          <TableCell align="right" sx={{ ...WIDE, ...NUM, color: 'text.secondary' }}>
            {matches}
          </TableCell>
          <TableCell
            align="right"
            sx={{ ...WIDEST, ...NUM, color: 'text.secondary', whiteSpace: 'nowrap' }}
          >
            {updated}
          </TableCell>
        </>
      )}
    </TableRow>
  );
}

/** Числа — одной ширины цифр, чтобы разряды стояли столбиком (раздел 6.1). */
const NUM = { fontVariantNumeric: 'tabular-nums' } as const;

/** Фильтры без порядка и страницы — по ним панель пересобирается. */
function filterPart(search: PlayersSearch): PlayersFilterValue {
  return {
    search: search.search,
    city: search.city,
    club: search.club,
    from: search.from,
    to: search.to,
    gender: search.gender,
    hand: search.hand,
    bladeId: search.bladeId,
    rubberId: search.rubberId,
  };
}

/**
 * Чипы заданных условий — docs/07 6.2. Каждый город — своим чипом: снять
 * один из трёх, не открывая список, быстрее.
 */
function activeFilters(
  search: PlayersSearch,
  {
    t,
    cityLabel,
    clubName,
    remove,
  }: {
    readonly t: ReturnType<typeof useT>;
    readonly cityLabel: (id: string) => string;
    readonly clubName: (id: string) => string;
    readonly remove: (patch: Partial<PlayersSearch>) => void;
  },
): ActiveFilter[] {
  const chip = (label: string, value: string): string => fill(t('filter.chip'), { label, value });
  const active: ActiveFilter[] = [];

  if (search.search !== undefined) {
    active.push({
      key: 'search',
      label: fill(t('filter.chipQuoted'), { value: search.search }),
      onRemove: () => {
        remove({ search: undefined });
      },
    });
  }
  if (search.from !== undefined || search.to !== undefined) {
    const value =
      search.from !== undefined && search.to !== undefined
        ? `${String(search.from)}–${String(search.to)}`
        : search.from !== undefined
          ? fill(t('players.range.from'), { value: String(search.from) })
          : fill(t('players.range.to'), { value: String(search.to) });
    active.push({
      key: 'rating',
      label: chip(t('players.filter.rating'), value),
      onRemove: () => {
        remove({ from: undefined, to: undefined });
      },
    });
  }
  const cities = citiesOf(search);
  for (const city of cities) {
    active.push({
      key: `city-${city}`,
      label: chip(t('filter.city'), cityLabel(city)),
      onRemove: () => {
        const rest = cities.filter((id) => id !== city);
        remove({ city: rest.length === 0 ? undefined : rest.join(',') });
      },
    });
  }
  if (search.club !== undefined) {
    active.push({
      key: 'club',
      label: chip(t('filter.club'), clubName(search.club)),
      onRemove: () => {
        remove({ club: undefined });
      },
    });
  }
  if (search.gender !== undefined) {
    active.push({
      key: 'gender',
      label: chip(t('players.filter.gender'), t(`players.filter.${search.gender}`)),
      onRemove: () => {
        remove({ gender: undefined });
      },
    });
  }
  if (search.hand !== undefined) {
    active.push({
      key: 'hand',
      label: chip(t('players.filter.hand'), t(`players.filter.${search.hand}`)),
      onRemove: () => {
        remove({ hand: undefined });
      },
    });
  }

  return active;
}
