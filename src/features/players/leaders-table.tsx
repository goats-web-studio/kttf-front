import type { ListPlayersQuery } from '@kttf/shared/types';
import Link from '@mui/material/Link';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { formatCount, useLocale, useT } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';

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
        <Table size="small" aria-label={t('page.ratings.title')}>
          <TableBody>
            {players.data.items.map((player, index) => (
              <TableRow key={player.id} hover sx={{ height: 48 }}>
                <TableCell align="right" sx={{ ...NUM, width: 40, color: 'text.secondary' }}>
                  {formatCount((query.page - 1) * query.limit + index + 1, locale)}
                </TableCell>
                <TableCell>
                  <Link href={`/players/${player.id}`} color="text.primary" sx={{ fontWeight: 500 }}>
                    {playerName(player)}
                  </Link>
                </TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, color: 'text.secondary' }}>
                  {player.city}
                </TableCell>
                <TableCell align="right" sx={{ ...NUM, fontWeight: 600 }}>
                  {player.rating}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </QueryState>
  );
}
