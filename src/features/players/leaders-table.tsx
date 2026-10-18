import type { ListPlayersQuery } from '@kttf/shared/types';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { formatCount, useLocale, useT } from '@/common/i18n';
import PlayerAvatar from '@/common/ui/player-avatar';
import QueryState from '@/common/ui/query-state';
import RankBadge from '@/common/ui/rank-badge';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { usePlaceName } from '@/features/places/place-name';

import { playerName } from './player-name';
import { playersQuery } from './queries';

const NUM = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } as const;

interface LeadersTableProps {
  /** Срез рейтинга: страна, город или клуб. Порядок задаёт сервер. */
  readonly query: ListPlayersQuery;
  /** Текст на случай пустого среза. */
  readonly empty: string;
}

/**
 * Верх рейтинга короткой таблицей — главная и страница клуба.
 *
 * Место, имя ссылкой на профиль, город и рейтинг. Полный список с фильтрами
 * — в рейтинге: здесь только срез, без постраничной навигации.
 */
export default function LeadersTable({ query, empty }: LeadersTableProps): ReactNode {
  const t = useT();
  const placeName = usePlaceName();
  const locale = useLocale();
  const players = useQuery(playersQuery(query));

  return (
    <QueryState
      isPending={players.isPending}
      error={players.error}
      onRetry={() => void players.refetch()}
      loading={<RowsSkeleton />}
    >
      {players.data === undefined ? null : players.data.items.length === 0 ? (
        <Typography color="text.secondary">{empty}</Typography>
      ) : (
        <Paper variant="outlined">
          <Table size="small" aria-label={t('page.ratings.title')}>
            <TableBody>
              {players.data.items.map((player, index) => {
                const rank = (query.page - 1) * query.limit + index + 1;

                return (
                  <TableRow key={player.id} hover sx={{ height: 60 }}>
                    <TableCell align="center" sx={{ ...NUM, width: 56 }}>
                      <RankBadge rank={rank} label={formatCount(rank, locale)} />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <PlayerAvatar
                          lastName={player.lastName}
                          firstName={player.firstName}
                          photoUrl={player.photoUrl}
                        />
                        <Link
                          href={`/players/${player.id}`}
                          color="text.primary"
                          sx={{ fontWeight: 600 }}
                        >
                          {playerName(player)}
                        </Link>
                      </Stack>
                    </TableCell>
                    <TableCell
                      sx={{ display: { xs: 'none', sm: 'table-cell' }, color: 'text.secondary' }}
                    >
                      {placeName(player.city)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        ...NUM,
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        fontSize: 18,
                      }}
                    >
                      {player.rating}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}
    </QueryState>
  );
}
