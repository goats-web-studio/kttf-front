import type { HomeLeader, HomeStatsPeriod, HomeUpset } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useId, useState, type ReactNode } from 'react';

import { formatDate, formatDelta, useLocale, useT, type MessageKey } from '@/common/i18n';
import PillTabs from '@/common/ui/pill-tabs';
import RatingValue from '@/common/ui/rating-value';
import { RowsSkeleton } from '@/common/ui/skeleton';
import Surface from '@/common/ui/surface';
import { VISUALLY_HIDDEN } from '@/common/ui/visually-hidden';

import { homeLeadersQuery, homeUpsetsQuery } from './stats-queries';

const PERIODS = [
  ['WEEK', 'home.stats.period.WEEK'],
  ['MONTH', 'home.stats.period.MONTH'],
  ['YEAR', 'home.stats.period.YEAR'],
] as const;

const NUM = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } as const;

/** «за неделю» — подпись периода у короткого блока лучших побед. */
const OVER: Readonly<Record<HomeStatsPeriod, MessageKey>> = {
  WEEK: 'home.stats.over.WEEK',
  MONTH: 'home.stats.over.MONTH',
  YEAR: 'home.stats.over.YEAR',
};

/** Полная статистика — в рейтинге; короткие блоки главной ведут сюда. */
export const STATS_HREF = '/players#stats';

/** Лучших побед в колонке главной: остальное — в рейтинге. */
const UPSETS_SHORT = 3;

/**
 * Раскладка по ширине своей колонки, а не экрана: полный блок стоит и в
 * боковой колонке рейтинга, и под таблицей на всю ширину.
 */
const WIDE_TABLES = '@container home-stats (min-width: 520px)';
const WIDE_UPSETS = '@container home-stats (min-width: 640px)';

interface HomeStatsProps {
  readonly period: HomeStatsPeriod;
  readonly onPeriod: (period: HomeStatsPeriod) => void;
}

/**
 * «Статистика» целиком — ADR-071, как у RTTF: кто больше всех играл и
 * выигрывал, и лучшие победы — слабый по рейтингу обыграл сильного. Один
 * переключатель периода на весь блок: три таблицы отвечают на один вопрос
 * «что было за неделю», и разные периоды рядом сбивали бы с толку.
 *
 * Пустые таблицы не выводятся; пустой весь блок — тоже: на пилотной базе
 * за неделю бывает тихо, и тогда лучше показать месяц, чем «нет данных».
 */
export default function HomeStats({ period, onPeriod }: HomeStatsProps): ReactNode {
  const t = useT();
  const leaders = useQuery(homeLeadersQuery(period));
  const upsets = useQuery(homeUpsetsQuery(period));

  const pending = leaders.isPending || upsets.isPending;
  const tournaments = leaders.data?.tournaments ?? [];
  const wins = leaders.data?.wins ?? [];
  const best = upsets.data?.items ?? [];
  const empty = !pending && tournaments.length + wins.length + best.length === 0;

  return (
    <Box
      sx={{ display: 'grid', gap: 2, containerType: 'inline-size', containerName: 'home-stats' }}
      data-home-stats
    >
      {/* В сетке переключатель растянулся бы на всю ширину — как у профиля, по содержимому. */}
      <Box sx={{ justifySelf: { xs: 'stretch', sm: 'start' }, maxWidth: '100%' }}>
        <PillTabs
          value={period}
          options={PERIODS}
          label={t('home.stats.periodLabel')}
          onChange={onPeriod}
        />
      </Box>

      {pending ? (
        <RowsSkeleton rows={5} />
      ) : empty ? (
        <Typography color="text.secondary">{t('home.stats.empty')}</Typography>
      ) : (
        <>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: 'minmax(0, 1fr)',
              [WIDE_TABLES]: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
            }}
          >
            {tournaments.length > 0 && (
              <LeaderTable
                title={t('home.stats.tournaments')}
                unit={t('home.stats.tournamentsUnit')}
                rows={tournaments}
                data="tournaments"
              />
            )}
            {wins.length > 0 && (
              <LeaderTable
                title={t('home.stats.wins')}
                unit={t('home.stats.winsUnit')}
                rows={wins}
                data="wins"
              />
            )}
          </Box>
          {best.length > 0 && <Upsets rows={best} />}
        </>
      )}
    </Box>
  );
}

function LeaderTable({
  title,
  unit,
  rows,
  data,
}: {
  readonly title: string;
  readonly unit: string;
  readonly rows: readonly HomeLeader[];
  readonly data: string;
}): ReactNode {
  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }} data-home-leaders={data}>
      <Typography variant="h3" component="h3" sx={{ px: 2, pt: 1.75, pb: 1 }}>
        {title}
      </Typography>
      <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none' }}>
        {rows.map((row, index) => (
          <Box
            component="li"
            key={row.player.id}
            sx={{
              display: 'grid',
              gridTemplateColumns: '20px minmax(0, 1fr) auto auto',
              alignItems: 'center',
              columnGap: 1.25,
              px: 2,
              py: 0.75,
              fontSize: 13.5,
              borderTop: '1px solid var(--line)',
            }}
          >
            <Box component="span" sx={{ ...NUM, color: 'text.secondary' }}>
              {index + 1}
            </Box>
            <Link
              href={`/players/${row.player.id}`}
              color="text.primary"
              underline="hover"
              sx={{
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {row.player.name}
            </Link>
            <RatingValue value={row.player.rating} animate={false} />
            <Box
              component="span"
              title={unit}
              sx={{ ...NUM, fontWeight: 700, minWidth: 24, textAlign: 'right' }}
            >
              {row.count}
            </Box>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

/**
 * Лучшие победы строкой RTTF: победитель с рейтингом и приростом, счёт по
 * партиям, проигравший с потерей. Счёта по сетам нет — его не ведут (ADR-063).
 */
function Upsets({ rows }: { readonly rows: readonly HomeUpset[] }): ReactNode {
  const t = useT();
  const locale = useLocale();

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }} data-home-upsets>
      <Typography variant="h3" component="h3" sx={{ px: 2, pt: 1.75, pb: 1 }}>
        {t('home.stats.upsets')}
      </Typography>
      <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
        {rows.map((row) => (
          <Box
            component="li"
            key={row.matchId}
            sx={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
              [WIDE_UPSETS]: { gridTemplateColumns: '96px minmax(0, 1fr) auto minmax(0, 1fr)' },
              alignItems: 'center',
              columnGap: 1.5,
              rowGap: 0.25,
              px: 2,
              py: 1,
              fontSize: 13.5,
              borderTop: '1px solid var(--line)',
            }}
          >
            <Box
              sx={{
                display: 'none',
                [WIDE_UPSETS]: { display: 'grid' },
                color: 'text.secondary',
                fontSize: 12,
                minWidth: 0,
              }}
            >
              <span>{formatDate(row.tournament.startsAt, locale)}</span>
              <Link
                href={`/tournaments/${row.tournament.id}`}
                color="inherit"
                underline="hover"
                sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {row.club.name}
              </Link>
            </Box>
            <Side
              id={row.winner.id}
              name={row.winner.name}
              rating={row.winnerRating}
              delta={row.winnerDelta}
              align="right"
            />
            <Box
              component="span"
              sx={{ ...NUM, fontWeight: 800, px: 0.5 }}
              aria-label={`${String(row.setsWinner)}:${String(row.setsLoser)}`}
            >
              {row.setsWinner}:{row.setsLoser}
            </Box>
            <Side
              id={row.loser.id}
              name={row.loser.name}
              rating={row.loserRating}
              delta={row.loserDelta}
              align="left"
            />
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

function Side({
  id,
  name,
  rating,
  delta,
  align,
}: {
  readonly id: string;
  readonly name: string;
  readonly rating: string;
  readonly delta: string;
  readonly align: 'left' | 'right';
}): ReactNode {
  const gain = !delta.startsWith('-');

  return (
    <Box sx={{ minWidth: 0, display: 'grid', justifyItems: align === 'right' ? 'end' : 'start' }}>
      <Link
        href={`/players/${id}`}
        color="text.primary"
        underline="hover"
        sx={{
          maxWidth: '100%',
          fontWeight: 600,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {name}
      </Link>
      <Box
        component="span"
        sx={{ ...NUM, display: 'flex', gap: 0.75, fontSize: 12, color: 'text.secondary' }}
      >
        <RatingValue value={rating} animate={false} />
        <Box component="span" sx={{ color: gain ? 'var(--ok)' : 'var(--red-600)' }}>
          {formatDelta(delta)}
        </Box>
      </Box>
    </Box>
  );
}

type LeaderKind = 'tournaments' | 'wins';

const KINDS: readonly (readonly [LeaderKind, MessageKey])[] = [
  ['tournaments', 'home.stats.tournaments'],
  ['wins', 'home.stats.wins'],
];

/**
 * «Статистика» коротко — правая колонка главной: тот же период и те же
 * пятёрки, но одна таблица за раз — «Турниры» или «Победы». Целиком, с
 * лучшими победами за период, — в рейтинге (`STATS_HREF`).
 */
export function StatsCard({ period, onPeriod }: HomeStatsProps): ReactNode {
  const t = useT();
  const [kind, setKind] = useState<LeaderKind>('tournaments');
  const listId = useId();
  const leaders = useQuery(homeLeadersQuery(period));
  const rows = leaders.data?.[kind] ?? [];
  const unit = t(kind === 'tournaments' ? 'home.stats.tournamentsUnit' : 'home.stats.winsUnit');

  return (
    <Surface
      flush
      title={t('home.stats.title')}
      action={
        <Link href={STATS_HREF} variant="body2" underline="hover" sx={{ whiteSpace: 'nowrap' }}>
          {t('home.stats.all')}
        </Link>
      }
    >
      <Box sx={{ px: 2 }} data-home-stats-card>
        <PillTabs
          value={period}
          options={PERIODS}
          label={t('home.stats.periodLabel')}
          onChange={onPeriod}
          fullWidth
        />
      </Box>
      {/* Таблица — вкладками-строкой, не второй «таблеткой»: период главнее,
          и две одинаковые дорожки подряд не читались бы как разное. */}
      <Box
        role="tablist"
        aria-label={t('home.stats.title')}
        sx={{ mt: 1, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
      >
        {KINDS.map(([value, label]) => {
          const selected = value === kind;

          return (
            <ButtonBase
              key={value}
              role="tab"
              aria-selected={selected}
              aria-controls={listId}
              onClick={() => {
                setKind(value);
              }}
              sx={{
                minHeight: 44,
                typography: 'body2',
                fontWeight: 600,
                color: selected ? 'text.primary' : 'text.secondary',
                borderBottom: '2px solid',
                borderColor: selected ? 'var(--red-600)' : 'transparent',
                transition: 'color var(--dur-fast) var(--ease)',
                '@media (hover: hover)': { '&:hover': { color: 'text.primary' } },
              }}
            >
              {t(label)}
            </ButtonBase>
          );
        })}
      </Box>

      <Box id={listId} role="tabpanel">
        {leaders.isPending ? (
          <Box sx={{ px: 2, pb: 2 }}>
            <RowsSkeleton rows={5} />
          </Box>
        ) : rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1.5 }}>
            {t('home.stats.empty')}
          </Typography>
        ) : (
          <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none' }} data-home-leaders={kind}>
            {rows.map((row, index) => (
              <Box
                component="li"
                key={row.player.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '20px minmax(0, 1fr) auto',
                  alignItems: 'center',
                  columnGap: 1.25,
                  px: 2,
                  py: 1,
                  typography: 'body2',
                  borderTop: '1px solid var(--line)',
                }}
              >
                <Box
                  component="span"
                  sx={{
                    ...NUM,
                    fontWeight: 700,
                    color: index === 0 ? 'var(--red-600)' : 'text.secondary',
                  }}
                >
                  {index + 1}
                </Box>
                <Link
                  href={`/players/${row.player.id}`}
                  color="text.primary"
                  underline="hover"
                  noWrap
                  sx={{ fontWeight: 600 }}
                >
                  {row.player.name}
                </Link>
                <Box component="span" title={unit} sx={{ ...NUM, fontWeight: 700 }}>
                  {row.count}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Surface>
  );
}

/**
 * «Лучшие победы» коротко — правая колонка главной, за период блока
 * «Статистика» над ней: три строки «победитель → проигравший», счёт и
 * прирост победителя. Пусто — блока нет.
 */
export function UpsetsCard({ period }: { readonly period: HomeStatsPeriod }): ReactNode {
  const t = useT();
  const upsets = useQuery(homeUpsetsQuery(period));
  const rows = (upsets.data?.items ?? []).slice(0, UPSETS_SHORT);

  if (rows.length === 0) return null;

  return (
    <Surface
      flush
      title={t('home.stats.upsets')}
      subtitle={t(OVER[period])}
      action={
        <Link href={STATS_HREF} variant="body2" underline="hover" sx={{ whiteSpace: 'nowrap' }}>
          {t('home.stats.all')}
        </Link>
      }
    >
      <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }} data-home-upsets="short">
        {rows.map((row) => (
          <Box
            component="li"
            key={row.matchId}
            sx={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) auto',
              alignItems: 'center',
              columnGap: 1.5,
              px: 2,
              py: 1,
              typography: 'body2',
              borderTop: '1px solid var(--line)',
            }}
          >
            <Box sx={{ minWidth: 0, display: 'grid' }}>
              <Link
                href={`/players/${row.winner.id}`}
                color="text.primary"
                underline="hover"
                noWrap
                sx={{ fontWeight: 600 }}
              >
                {row.winner.name}
              </Link>
              <Box
                component="span"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, fontSize: 12 }}
              >
                <Box component="span" aria-hidden sx={{ color: 'text.secondary', flexShrink: 0 }}>
                  →
                </Box>
                <Box component="span" sx={VISUALLY_HIDDEN}>
                  {t('home.stats.beat')}
                </Box>
                <Link
                  href={`/players/${row.loser.id}`}
                  color="text.secondary"
                  underline="hover"
                  noWrap
                >
                  {row.loser.name}
                </Link>
              </Box>
            </Box>
            <Box sx={{ display: 'grid', justifyItems: 'end' }}>
              <Box component="span" sx={{ ...NUM, fontWeight: 800 }}>
                {row.setsWinner}:{row.setsLoser}
              </Box>
              <Box
                component="span"
                sx={{
                  ...NUM,
                  fontSize: 12,
                  color: row.winnerDelta.startsWith('-') ? 'var(--red-600)' : 'var(--ok)',
                }}
              >
                {formatDelta(row.winnerDelta)}
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Surface>
  );
}
