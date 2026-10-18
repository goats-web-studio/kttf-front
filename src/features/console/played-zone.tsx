import type { MatchView, StageView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useState, type ReactNode } from 'react';

import { useT } from '@/common/i18n';

import MatchLine from './match-line';
import { matchLabel } from './queue';

interface PlayedZoneProps {
  readonly matches: readonly MatchView[];
  readonly stages: readonly StageView[];
  readonly names: ReadonlyMap<string, string>;
  readonly onOpen: (matchId: string) => void;
}

/**
 * Сыгранные встречи — отсюда исправляют счёт (ТЗ 6.3).
 *
 * Свежие сверху: ошибку замечают почти сразу, когда игроки подходят к судье
 * со словами «было три-два, а не три-один». Исправление — в окне встречи,
 * за отдельной кнопкой: правка пишется в журнал.
 */
export default function PlayedZone({ matches, stages, names, onOpen }: PlayedZoneProps): ReactNode {
  const t = useT();
  const [all, setAll] = useState(false);
  const shown = all ? matches : matches.slice(0, SHOWN);

  return (
    <section>
      <Typography
        component="h2"
        variant="subtitle2"
        color="text.secondary"
        sx={{ fontWeight: 600 }}
      >
        {t('console.played.title')}
      </Typography>
      {matches.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t('console.played.empty')}
        </Typography>
      ) : (
        <Stack component="ol" spacing={1} sx={{ mt: 1, p: 0, listStyle: 'none' }}>
          {shown.map((match) => (
            <Paper key={match.id} component="li" variant="outlined">
              <ButtonBase
                onClick={() => {
                  onOpen(match.id);
                }}
                sx={{
                  display: 'block',
                  width: '100%',
                  minHeight: 56,
                  p: 1.5,
                  textAlign: 'left',
                  borderRadius: 1,
                  typography: 'body2',
                }}
              >
                <Typography component="span" variant="caption" color="text.secondary">
                  {matchLabel(stages, match, t)}
                  {match.tableNumber !== null &&
                    ` · ${t('console.table.number')} ${String(match.tableNumber)}`}
                  {match.resultType === 'WALKOVER' && (
                    <Box component="span" sx={{ color: 'warning.main' }}>
                      {' · '}
                      {t('console.played.walkover')}
                    </Box>
                  )}
                </Typography>
                <MatchLine match={match} names={names} />
              </ButtonBase>
            </Paper>
          ))}
        </Stack>
      )}
      {!all && matches.length > SHOWN && (
        <Button
          variant="text"
          onClick={() => {
            setAll(true);
          }}
          sx={{ mt: 1, minHeight: 44, color: 'text.secondary' }}
        >
          {t('console.played.all')} ({matches.length})
        </Button>
      )}
    </section>
  );
}

/** Последних встреч без раскрытия: правят обычно только что введённое. */
const SHOWN = 5;
