import type { MatchView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

import { BOARD_TITLE, DISPLAY, size } from './scale';

interface RecentBoardProps {
  /** Сыгранные встречи, свежие сверху — `playedMatches`. */
  readonly matches: readonly MatchView[];
  readonly names: ReadonlyMap<string, string>;
  readonly labelOf: (match: MatchView) => string;
  readonly shown: number;
}

/**
 * Последние результаты — то, ради чего к стене подходят между встречами:
 * «как сыграл Иванов». Победитель выделен цветом и насыщенностью, счёт
 * крупно справа.
 */
export default function RecentBoard({
  matches,
  names,
  labelOf,
  shown,
}: RecentBoardProps): ReactNode {
  const t = useT();

  return (
    <Box
      component="section"
      aria-label={t('screen.recent.title')}
      sx={{ flex: '1 1 0', minHeight: 0, overflow: 'hidden' }}
    >
      <Typography component="h2" sx={BOARD_TITLE}>
        {t('screen.recent.title')}
      </Typography>

      {matches.length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: '0.8vh', fontSize: size(1.1) }}>
          {t('screen.recent.empty')}
        </Typography>
      ) : (
        <Box component="ol" sx={{ m: 0, mt: '0.8vh', p: 0, listStyle: 'none' }}>
          {matches.slice(0, shown).map((match) => {
            const aWon = (match.setsA ?? 0) > (match.setsB ?? 0);

            return (
              <Box
                key={match.id}
                component="li"
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto',
                  alignItems: 'center',
                  gap: '0.8vw',
                  py: '0.45vh',
                  borderBottom: 1,
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    component="span"
                    sx={{
                      display: 'block',
                      fontSize: size(1.05),
                      lineHeight: 1.3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Player id={match.playerAId} names={names} won={aWon} />
                    <Box component="span" sx={{ px: '0.4vw', color: 'text.secondary' }}>
                      —
                    </Box>
                    <Player id={match.playerBId} names={names} won={!aWon} />
                  </Typography>
                  <Typography
                    component="span"
                    sx={{ display: 'block', fontSize: size(0.7), color: 'text.secondary' }}
                  >
                    {labelOf(match)}
                  </Typography>
                </Box>
                <Box
                  component="span"
                  sx={{
                    fontFamily: DISPLAY,
                    fontSize: size(1.5),
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  <Box component="span" sx={{ color: aWon ? 'primary.main' : 'text.secondary' }}>
                    {match.setsA}
                  </Box>
                  :
                  <Box component="span" sx={{ color: aWon ? 'text.secondary' : 'primary.main' }}>
                    {match.setsB}
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

function Player({
  id,
  names,
  won,
}: {
  readonly id: string | null;
  readonly names: ReadonlyMap<string, string>;
  readonly won: boolean;
}): ReactNode {
  const t = useT();

  return (
    <Box
      component="span"
      sx={won ? { fontWeight: 700, color: 'primary.main' } : { color: 'text.secondary' }}
    >
      {id === null ? t('screen.match.pending') : (names.get(id) ?? t('screen.match.pending'))}
    </Box>
  );
}
