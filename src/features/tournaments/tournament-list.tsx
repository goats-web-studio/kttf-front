import type { ClubView, TournamentListItemView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { UseInfiniteQueryResult, InfiniteData } from '@tanstack/react-query';
import type { Page } from '@kttf/shared/types';
import { MapPin } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';

import { fill, formatDate, formatWeekday, useLocale, useT, type MessageKey } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';
import RatingValue from '@/common/ui/rating-value';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { VISUALLY_HIDDEN } from '@/common/ui/visually-hidden';

import { dateOfDay, groupByDate, type DayKey } from './calendar-model';
import RatingCapBadge from './rating-cap-badge';
import { useVenue } from './tournament-calendar';
import { Participants, StartTime, TournamentName } from './tournament-line';

type Feed = UseInfiniteQueryResult<InfiniteData<Page<TournamentListItemView>>>;

interface TournamentListProps {
  readonly upcoming: Feed;
  readonly past: Feed;
  /** Клуб по идентификатору: в ответе турнира клуба нет. */
  readonly clubOf: (clubId: string) => ClubView | undefined;
}

/**
 * Список турниров как у RTTF — ADR-052: «Ближайшие» от ранних и
 * «Прошедшие» от свежих, внутри — по датам. В строке время, планка, турнир
 * с клубом, средний рейтинг поля, участники и сыгранные игры: по ним видно,
 * насколько сильный и большой был турнир, не открывая его.
 *
 * На телефоне строка — в две линии, без горизонтального скролла (07, 4).
 */
export default function TournamentList({ upcoming, past, clubOf }: TournamentListProps): ReactNode {
  return (
    <Box sx={{ display: 'grid', gap: 4 }}>
      <Block
        feed={upcoming}
        title="tournaments.upcoming"
        empty="tournaments.upcoming.empty"
        clubOf={clubOf}
      />
      <Block feed={past} title="tournaments.past" empty="tournaments.past.empty" clubOf={clubOf} />
    </Box>
  );
}

function Block({
  feed,
  title,
  empty,
  clubOf,
}: {
  readonly feed: Feed;
  readonly title: MessageKey;
  readonly empty: MessageKey;
  readonly clubOf: (clubId: string) => ClubView | undefined;
}): ReactNode {
  const t = useT();
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true });
  const items = feed.data?.pages.flatMap((page) => page.items) ?? [];
  const groups = groupByDate(items);

  return (
    <Box component="section" data-feed={title}>
      <Typography variant="h2" sx={{ mb: 1.5 }}>
        {t(title)}
      </Typography>
      <QueryState
        isPending={feed.isPending}
        error={feed.error}
        onRetry={() => void feed.refetch()}
        loading={<RowsSkeleton rows={3} />}
      >
        {items.length === 0 ? (
          <Typography color="text.secondary">{t(empty)}</Typography>
        ) : (
          <Box
            sx={{
              bgcolor: 'var(--paper)',
              border: 1,
              borderColor: 'var(--line)',
              borderRadius: 4,
              boxShadow: 'var(--shadow-card)',
              overflow: 'hidden',
            }}
          >
            {wide ? (
              <ListTable title={t(title)} groups={groups} clubOf={clubOf} />
            ) : (
              <ListRows groups={groups} clubOf={clubOf} />
            )}
          </Box>
        )}
      </QueryState>
      {feed.hasNextPage && (
        <Button
          onClick={() => void feed.fetchNextPage()}
          disabled={feed.isFetchingNextPage}
          sx={{ mt: 1.5, minHeight: 44 }}
        >
          {feed.isFetchingNextPage ? t('common.loading') : t('tournaments.more')}
        </Button>
      )}
    </Box>
  );
}

interface GroupsProps {
  readonly groups: readonly (readonly [DayKey, readonly TournamentListItemView[]])[];
  readonly clubOf: (clubId: string) => ClubView | undefined;
}

function ListTable({ title, groups, clubOf }: GroupsProps & { readonly title: string }): ReactNode {
  const t = useT();

  return (
    <Table size="small" data-list-table>
      <Box component="caption" sx={VISUALLY_HIDDEN}>
        {title}
      </Box>
      <TableHead>
        <TableRow>
          <TableCell sx={{ pl: 3, width: 72 }}>{t('tournaments.col.time')}</TableCell>
          <TableCell sx={{ width: 56 }}>
            <Box component="span" sx={VISUALLY_HIDDEN}>
              {t('tournaments.col.cap')}
            </Box>
          </TableCell>
          <TableCell>{t('tournaments.col.name')}</TableCell>
          {/* Ширины числовых колонок заданы: у «Ближайших» и «Прошедших»
              колонки стоят на одной вертикали, а не по длине содержимого. */}
          <TableCell align="right" sx={{ width: 120 }}>
            <abbr title={t('tournaments.col.avgFull')}>{t('tournaments.col.avg')}</abbr>
          </TableCell>
          <TableCell align="right" sx={{ width: 112, whiteSpace: 'nowrap' }}>
            <abbr title={t('tournaments.col.ageFull')}>{t('tournaments.col.age')}</abbr>
          </TableCell>
          <TableCell align="right" sx={{ width: 120 }}>
            {t('tournaments.col.players')}
          </TableCell>
          <TableCell align="right" sx={{ pr: 3, width: 88 }}>
            {t('tournaments.col.games')}
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {groups.map(([key, items]) => (
          <Fragment key={key}>
            <TableRow data-date={key}>
              <TableCell
                component="th"
                scope="rowgroup"
                colSpan={7}
                sx={{
                  pl: 3,
                  bgcolor: 'var(--paper-sunken)',
                  fontWeight: 700,
                  color: 'text.primary',
                }}
              >
                <DayHeading dayKey={key} />
              </TableCell>
            </TableRow>
            {items.map((tournament) => (
              <TableRow key={tournament.id} data-tournament={tournament.id}>
                <TableCell sx={{ pl: 3 }}>
                  <StartTime startsAt={tournament.startsAt} />
                </TableCell>
                <TableCell>
                  <RatingCapBadge tournament={tournament} />
                </TableCell>
                <TableCell>
                  <TournamentName tournament={tournament} />
                  <ClubLine club={clubOf(tournament.clubId)} />
                </TableCell>
                <TableCell align="right">
                  {tournament.averageRating === null ? (
                    '—'
                  ) : (
                    <RatingValue
                      value={String(tournament.averageRating)}
                      sx={{ fontWeight: 600 }}
                    />
                  )}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}
                >
                  {tournament.averageAge ?? '—'}
                </TableCell>
                <TableCell align="right">
                  <Participants tournament={tournament} />
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ pr: 3, fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}
                >
                  {tournament.matchesPlayed === 0 ? '—' : tournament.matchesPlayed}
                </TableCell>
              </TableRow>
            ))}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  );
}

/** Телефон: дата заголовком, турнир — в две линии. */
function ListRows({ groups, clubOf }: GroupsProps): ReactNode {
  const t = useT();

  return (
    <Box component="ol" data-list-rows sx={{ m: 0, p: 0, listStyle: 'none' }}>
      {groups.map(([key, items]) => (
        <Box key={key} component="li" data-date={key}>
          <Box
            component="h3"
            sx={{
              m: 0,
              px: 2,
              py: 1,
              typography: 'body2',
              fontWeight: 700,
              bgcolor: 'var(--paper-sunken)',
            }}
          >
            <DayHeading dayKey={key} />
          </Box>
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
            {items.map((tournament) => (
              <Box
                key={tournament.id}
                component="li"
                data-tournament={tournament.id}
                sx={{
                  px: 2,
                  py: 1.25,
                  borderTop: 1,
                  borderColor: 'var(--line)',
                  display: 'grid',
                  gridTemplateColumns: 'auto auto minmax(0, 1fr)',
                  columnGap: 1,
                  rowGap: 0.5,
                  alignItems: 'center',
                  typography: 'body2',
                }}
              >
                <StartTime startsAt={tournament.startsAt} />
                <RatingCapBadge tournament={tournament} />
                <TournamentName tournament={tournament} />
                <Box
                  sx={{
                    gridColumn: '1 / -1',
                    display: 'flex',
                    flexWrap: 'wrap',
                    columnGap: 1.5,
                    rowGap: 0.25,
                    alignItems: 'center',
                    color: 'text.secondary',
                    typography: 'caption',
                  }}
                >
                  <Box sx={{ flexBasis: '100%' }}>
                    <ClubLine club={clubOf(tournament.clubId)} />
                  </Box>
                  {tournament.averageRating !== null && (
                    <span title={t('tournaments.col.avgFull')}>
                      <RatingValue value={String(tournament.averageRating)} />
                    </span>
                  )}
                  {tournament.averageAge !== null && (
                    <span title={t('tournaments.col.ageFull')}>
                      {fill(t('tournaments.ageShort'), { age: String(tournament.averageAge) })}
                    </span>
                  )}
                  <Participants tournament={tournament} />
                  {tournament.matchesPlayed > 0 && (
                    <span>
                      {t('tournaments.col.games')} {tournament.matchesPlayed}
                    </span>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

/**
 * Клуб и где он: «KTTF Тест · ул. Абая, 1, Алматы» — как в подсказке
 * календаря (ADR-094). Пока справочник клубов не пришёл — пусто.
 */
function ClubLine({ club }: { readonly club: ClubView | undefined }): ReactNode {
  const venue = useVenue();
  if (club === undefined) return null;

  return (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 0.75 }}
    >
      <Box component="span" sx={{ fontWeight: 600 }}>
        {club.name}
      </Box>
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
        <MapPin size={12} aria-hidden style={{ flexShrink: 0 }} />
        {venue(club)}
      </Box>
    </Typography>
  );
}

/** «19 октября · понедельник». */
function DayHeading({ dayKey }: { readonly dayKey: DayKey }): ReactNode {
  const locale = useLocale();
  const date = dateOfDay(dayKey);

  return (
    <>
      {formatDate(date.toISOString(), locale)}
      <Box component="span" sx={{ ml: 1, fontWeight: 400, color: 'text.secondary' }}>
        {formatWeekday(date, locale, 'long')}
      </Box>
    </>
  );
}
