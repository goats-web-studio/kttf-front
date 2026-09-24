import type { MatchView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

interface MatchLineProps {
  readonly match: MatchView;
  readonly names: ReadonlyMap<string, string>;
  /** Рейтинг рядом с фамилией — ТЗ 6.6. */
  readonly ratings?: ReadonlyMap<string, string> | undefined;
}

/** Пара и счёт: то, что судья читает в зале, не приглядываясь. */
export default function MatchLine({ match, names, ratings }: MatchLineProps): ReactNode {
  const t = useT();
  const played = match.setsA !== null && match.setsB !== null;

  return (
    <Box
      component="span"
      sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1.5 }}
    >
      <span>
        <Side id={match.playerAId} names={names} ratings={ratings} won={won(match, 'A')} />
        <Box component="span" sx={{ px: 1, color: 'text.secondary' }}>
          —
        </Box>
        <Side id={match.playerBId} names={names} ratings={ratings} won={won(match, 'B')} />
      </span>
      {played && (
        <Box
          component="span"
          sx={{
            fontFamily: "'Oswald', system-ui, sans-serif",
            fontVariantNumeric: 'tabular-nums',
            fontSize: 22,
            lineHeight: '26px',
            fontWeight: 600,
          }}
        >
          {match.setsA}:{match.setsB}
        </Box>
      )}
      {!played && match.status === 'PLAYING' && (
        <Box component="span" sx={{ typography: 'caption', color: 'text.secondary' }}>
          {t('console.playing.inProgress')}
        </Box>
      )}
    </Box>
  );
}

function won(match: MatchView, side: 'A' | 'B'): boolean {
  if (match.setsA === null || match.setsB === null) {
    return false;
  }

  return side === 'A' ? match.setsA > match.setsB : match.setsB > match.setsA;
}

function Side({
  id,
  names,
  ratings,
  won: isWinner,
}: {
  readonly id: string | null;
  readonly names: ReadonlyMap<string, string>;
  readonly ratings: ReadonlyMap<string, string> | undefined;
  readonly won: boolean;
}): ReactNode {
  const t = useT();

  if (id === null) {
    return (
      <Box component="span" sx={{ color: 'text.secondary' }}>
        {t('console.match.pending')}
      </Box>
    );
  }

  const rating = ratings?.get(id);

  // Победитель отличается не только цветом: полужирный и линейка слева
  // (раздел 3.4, запрет №6).
  return (
    <Box
      component="span"
      sx={
        isWinner
          ? {
              fontWeight: 600,
              color: 'primary.main',
              borderLeft: '2px solid',
              borderColor: 'primary.main',
              pl: 0.5,
            }
          : { color: 'text.secondary' }
      }
    >
      {names.get(id) ?? t('console.match.unknownPlayer')}
      {rating !== undefined && (
        <Box component="span" sx={{ ml: 0.5, typography: 'caption', color: 'text.secondary' }}>
          {rating}
        </Box>
      )}
    </Box>
  );
}
