import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { formatCount, useLocale, useT } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { playerName } from '@/features/players/player-name';
import { playersQuery } from '@/features/players/queries';

/** Сколько лидеров на главной. Полный список — в рейтинге. */
const TOP = 10;

const NUM = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } as const;

interface TopPlayersProps {
  /** Выбранный город; `undefined` — вся страна. Живёт в адресе главной. */
  readonly city: string | undefined;
  /** Города, по которым есть клубы, — из справочника клубов. */
  readonly cities: readonly string[];
  readonly onCity: (city: string | undefined) => void;
}

/**
 * Лидеры рейтинга — ТЗ 9.1, срез для главной.
 *
 * Порядок задаёт сервер, как и в полном рейтинге. Переключатель города —
 * чипы, а не список: городов с клубами немного, и все видны сразу.
 */
export default function TopPlayers({ city, cities, onCity }: TopPlayersProps): ReactNode {
  const t = useT();
  const locale = useLocale();
  const players = useQuery(
    playersQuery({ page: 1, limit: TOP, ...(city === undefined ? {} : { city }) }),
  );

  return (
    <Box>
      {cities.length > 1 && (
        <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap', mb: 2 }}>
          <Chip
            label={t('home.top.country')}
            color={city === undefined ? 'primary' : 'default'}
            variant={city === undefined ? 'filled' : 'outlined'}
            onClick={() => {
              onCity(undefined);
            }}
          />
          {cities.map((name) => (
            <Chip
              key={name}
              label={name}
              color={city === name ? 'primary' : 'default'}
              variant={city === name ? 'filled' : 'outlined'}
              onClick={() => {
                onCity(name);
              }}
            />
          ))}
        </Stack>
      )}

      <QueryState
        isPending={players.isPending}
        error={players.error}
        onRetry={() => void players.refetch()}
        loading={<RowsSkeleton />}
      >
        {players.data !== undefined && (
          <Table size="small">
            <TableBody>
              {players.data.items.map((player, index) => (
                <TableRow key={player.id} hover sx={{ height: 48 }}>
                  <TableCell align="right" sx={{ ...NUM, width: 40, color: 'text.secondary' }}>
                    {formatCount(index + 1, locale)}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/players/${player.id}`}
                      color="text.primary"
                      sx={{ fontWeight: 500 }}
                    >
                      {playerName(player)}
                    </Link>
                  </TableCell>
                  <TableCell
                    sx={{ display: { xs: 'none', sm: 'table-cell' }, color: 'text.secondary' }}
                  >
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
    </Box>
  );
}
