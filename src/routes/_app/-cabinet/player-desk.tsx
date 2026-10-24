import type { TournamentStatus } from '@kttf/shared/types';
import { MAX_PAGE_SIZE } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { fill, formatCount, useLocale, useT } from '@/common/i18n';
import DeltaPill from '@/common/ui/delta-pill';
import RatingValue from '@/common/ui/rating-value';
import { RowsSkeleton } from '@/common/ui/skeleton';
import Surface from '@/common/ui/surface';
import { clubDirectoryQuery } from '@/features/clubs/queries';
import ClaimProfile from '@/features/players/claim-profile';
import TournamentList from '@/features/clubs/tournament-list';
import { ratingPointTitle } from '@/features/players/rating-point';
import {
  playerQuery,
  playerRatingHistoryQuery,
  playerSummaryQuery,
} from '@/features/players/queries';
import { tournamentsQuery } from '@/features/tournaments/queries';

/** Турнир ещё впереди или идёт: туда игрок собирается или уже играет. */
const AHEAD: ReadonlySet<TournamentStatus> = new Set<TournamentStatus>([
  'PUBLISHED',
  'REG_OPEN',
  'REG_CLOSED',
  'RUNNING',
]);

/**
 * Рабочий стол игрока — ADR-048.
 *
 * Вопросы игрока к кабинету: где я сейчас и куда я записан. Рейтинг с
 * местом в стране и последним изменением — коротко, подробности на
 * публичном профиле. Ниже — турниры, куда записан, от ближайшего; пусто —
 * приглашение в календарь.
 */
export default function PlayerDesk({ playerId }: { readonly playerId: string }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const player = useQuery(playerQuery(playerId));
  const summary = useQuery(playerSummaryQuery(playerId, 'ALL'));
  const history = useQuery(playerRatingHistoryQuery(playerId));
  const directory = useQuery(clubDirectoryQuery);
  const mine = useQuery(tournamentsQuery({ page: 1, limit: MAX_PAGE_SIZE, playerId }));

  const last = history.data?.points.at(-1);
  const ahead = (mine.data?.items ?? []).filter((tournament) => AHEAD.has(tournament.status));

  // Анкета без рейтинга (ADR-072): ни рейтинга, ни турниров у неё нет —
  // первое дело найти свой профиль с рейтингом.
  if (player.data?.confirmed === false) {
    return (
      <Surface
        title={t('claim.title')}
        action={<Button href={`/players/${playerId}`}>{t('nav.myProfile')}</Button>}
      >
        <ClaimProfile hasSheet />
      </Surface>
    );
  }

  return (
    <>
      <Surface
        title={t('cabinet.player.title')}
        action={<Button href={`/players/${playerId}`}>{t('nav.myProfile')}</Button>}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 1.5, sm: 4 }}
          sx={{ alignItems: { sm: 'flex-end' } }}
        >
          <Box>
            <Typography variant="body2" color="text.secondary">
              {t('ratings.column.rating')}
            </Typography>
            <Typography
              component="p"
              sx={{
                fontSize: 40,
                lineHeight: '44px',
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {player.data === undefined ? '—' : <RatingValue value={player.data.rating} />}
            </Typography>
          </Box>
          {summary.data !== undefined && (
            <Typography color="text.secondary">
              {fill(t('cabinet.player.rank'), {
                rank: formatCount(summary.data.rank, locale),
                total: formatCount(summary.data.rankedPlayers, locale),
              })}
            </Typography>
          )}
          {/* Последнее изменение — турнир или дуэль (ADR-065); корректировку не
              показываем: она не «что я сыграл». */}
          {last !== undefined && (last.tournamentName !== null || last.duel !== null) && (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
              <DeltaPill value={last.delta} />
              <Typography color="text.secondary" noWrap>
                {ratingPointTitle(last, t)}
              </Typography>
            </Stack>
          )}
        </Stack>
      </Surface>

      <Surface
        title={t('cabinet.my.title')}
        action={<Button href="/tournaments">{t('cabinet.my.find')}</Button>}
      >
        {mine.isPending ? (
          <RowsSkeleton rows={2} />
        ) : ahead.length === 0 ? (
          <Typography color="text.secondary">{t('cabinet.my.empty')}</Typography>
        ) : (
          <TournamentList
            tournaments={ahead}
            club={undefined}
            clubOf={(tournament) => directory.data?.get(tournament.clubId)}
          />
        )}
      </Surface>
    </>
  );
}
