import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';

import MatchesTable from './matches-table';
import { playerName } from './player-name';
import { headToHeadQuery } from './queries';

interface HeadToHeadProps {
  readonly playerId: string;
  readonly opponentId: string;
  readonly onClose: () => void;
}

/**
 * Личный счёт против соперника — ТЗ 9.3.
 *
 * Все числа приходят посчитанными: победы, поражения и сеты считает сервер по
 * всем очным встречам сразу. Сложить их по видимой странице истории значило бы
 * показать счёт, который меняется от перелистывания.
 *
 * Соперник выбирается в истории встреч, а не отдельным поиском: спрашивают
 * про того, с кем играли, и список уже перед глазами.
 */
export default function HeadToHead({ playerId, opponentId, onClose }: HeadToHeadProps): ReactNode {
  const t = useT();
  const headToHead = useQuery(headToHeadQuery(playerId, opponentId));

  return (
    <Box component="section" sx={{ mt: 5 }}>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}
      >
        <Typography variant="h2">{t('player.headToHead.title')}</Typography>
        <Button variant="text" onClick={onClose} sx={{ minHeight: { xs: 44, sm: 40 } }}>
          {t('player.headToHead.close')}
        </Button>
      </Stack>

      <QueryState
        isPending={headToHead.isPending}
        error={headToHead.error}
        onRetry={() => void headToHead.refetch()}
        loading={<RowsSkeleton rows={2} />}
      >
        {headToHead.data === undefined ? null : (
          <>
            <Typography sx={{ mt: 1.5 }}>
              {playerName(headToHead.data.opponent)}
              {' · '}
              <Box component="span" sx={NUM}>
                {headToHead.data.wins} : {headToHead.data.losses}
              </Box>{' '}
              <Typography component="span" variant="body2" color="text.secondary">
                {t('player.headToHead.matches')}
              </Typography>
              {' · '}
              <Box component="span" sx={NUM}>
                {headToHead.data.setsWon} : {headToHead.data.setsLost}
              </Box>{' '}
              <Typography component="span" variant="body2" color="text.secondary">
                {t('player.headToHead.sets')}
              </Typography>
            </Typography>

            {headToHead.data.matches.length === 0 ? (
              <Typography color="text.secondary" sx={{ mt: 1.5 }}>
                {t('player.headToHead.empty')}
              </Typography>
            ) : (
              // Соперник уже выбран: кнопка на его же фамилии вела бы туда,
              // где человек и находится.
              <MatchesTable matches={headToHead.data.matches} />
            )}
          </>
        )}
      </QueryState>
    </Box>
  );
}

/** Счёт — одной ширины цифр (раздел 3.5). */
const NUM = { fontVariantNumeric: 'tabular-nums', fontWeight: 600 } as const;
