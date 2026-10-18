import type { MatchView, StageView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useState, type ReactNode } from 'react';

import { useT } from '@/common/i18n';
import { VISUALLY_HIDDEN } from '@/common/ui/visually-hidden';

import MatchLine from './match-line';
import { matchLabel } from './queue';

interface PlayedZoneProps {
  readonly matches: readonly MatchView[];
  readonly stages: readonly StageView[];
  readonly names: ReadonlyMap<string, string>;
  /** Без обработчика строки только показывают счёт: турнир завершён, править нечего. */
  readonly onOpen?: ((matchId: string) => void) | undefined;
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
      {/* Глазу заголовок дублирует вкладка над панелью — остаётся диктору. */}
      <Typography component="h2" sx={VISUALLY_HIDDEN}>
        {t('console.played.title')}
      </Typography>
      {matches.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t('console.played.empty')}
        </Typography>
      ) : (
        // Строки в одной карточке, как очередь: карточка на каждую встречу
        // превращала пять результатов в пять отдельных плиток.
        <Paper variant="outlined" component="ol" sx={{ m: 0, p: 0, listStyle: 'none' }}>
          {shown.map((match, index) => (
            <Box
              key={match.id}
              component="li"
              sx={{ borderTop: index === 0 ? 0 : 1, borderColor: 'divider' }}
            >
              <ButtonBase
                disabled={onOpen === undefined}
                onClick={() => {
                  onOpen?.(match.id);
                }}
                sx={{
                  display: 'block',
                  width: '100%',
                  minHeight: 64,
                  px: 2,
                  py: 1.25,
                  textAlign: 'left',
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
            </Box>
          ))}
        </Paper>
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
