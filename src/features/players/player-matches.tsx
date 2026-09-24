import { DEFAULT_PAGE_SIZE } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { useT } from '@/common/i18n';
import EmptyState from '@/common/ui/empty-state';
import Pagination from '@/common/ui/pagination';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';

import MatchesTable from './matches-table';
import { playerMatchesQuery } from './queries';

interface PlayerMatchesProps {
  readonly playerId: string;
  readonly onSelectOpponent: (opponentId: string) => void;
}

/**
 * История встреч — ТЗ 9.3.
 *
 * Фильтров, которых требует ТЗ, здесь нет: `playerMatchesQuerySchema` — это
 * ровно постраничность, других полей в контракте ТС 7.2 не заведено.
 * Отфильтровать загруженную страницу на клиенте нельзя по той же причине,
 * по которой личный счёт считает сервер: фильтр по одной странице показал бы
 * не историю, а её случайный срез. Расхождение записано открытым вопросом
 * ОВ-19, самовольно контракт не расширялся (бриф 4.2).
 */
export default function PlayerMatches({
  playerId,
  onSelectOpponent,
}: PlayerMatchesProps): ReactNode {
  const t = useT();
  const [page, setPage] = useState(1);

  const matches = useQuery(playerMatchesQuery(playerId, { page, limit: DEFAULT_PAGE_SIZE }));

  const pages =
    matches.data === undefined
      ? 1
      : Math.max(1, Math.ceil(matches.data.total / matches.data.limit));

  return (
    <Box component="section" sx={{ mt: 5 }}>
      <Typography variant="h2">{t('player.matches.title')}</Typography>

      <QueryState
        isPending={matches.isPending}
        error={matches.error}
        onRetry={() => void matches.refetch()}
        loading={<RowsSkeleton />}
      >
        {matches.data === undefined ? null : matches.data.items.length === 0 ? (
          <Box sx={{ mt: 2 }}>
            <EmptyState title={t('player.matches.empty')} />
          </Box>
        ) : (
          <MatchesTable matches={matches.data.items} onSelectOpponent={onSelectOpponent} />
        )}
      </QueryState>

      <Pagination page={page} pages={pages} onPage={setPage} />
    </Box>
  );
}
