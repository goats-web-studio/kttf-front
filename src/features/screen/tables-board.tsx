import type { MatchView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';
import type { TableState } from '@/features/console/queue';

import { BOARD_TITLE, DISPLAY, size, tint } from './scale';

interface TablesBoardProps {
  readonly tables: readonly TableState[];
  readonly names: ReadonlyMap<string, string>;
  /** Подпись встречи: этап и группа. */
  readonly labelOf: (match: MatchView) => string;
  readonly now: number;
}

/** Сколько секунд после назначения стол подсвечен как «Вызов». */
const CALL_SECONDS = 120;

/**
 * Что происходит на столах — ТЗ 6.5.
 *
 * Показываются только столы, за которыми что-то есть: идущая встреча или
 * только что сыгранная с её счётом. Свободные собраны в одну строку внизу —
 * шесть пустых карточек на стене ничего не сообщают залу.
 *
 * Номер стола — цветная плашка: красная у идущей встречи, золотая у только
 * что позванной пары. Игрок, отошедший за водой, находит свой стол на стене
 * по цвету и слову «Вызов», не спрашивая судью.
 */
export default function TablesBoard({ tables, names, labelOf, now }: TablesBoardProps): ReactNode {
  const t = useT();
  const busy = tables.filter((table) => table.match !== null);
  const free = tables.filter((table) => table.match === null).map((table) => table.number);

  return (
    <Box component="section" aria-label={t('screen.now.title')} sx={{ flexShrink: 0 }}>
      <Typography component="h2" sx={BOARD_TITLE}>
        {t('screen.now.title')}
      </Typography>

      <Box
        component="ul"
        sx={{
          m: 0,
          mt: '1vh',
          p: 0,
          listStyle: 'none',
          display: 'grid',
          gap: '0.6vw',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        }}
      >
        {busy.map((table) => {
          const match = table.match;

          if (match === null) {
            return null;
          }

          const started = match.startedAt === null ? null : Date.parse(match.startedAt);
          const calling =
            table.status === 'PLAYING' && started !== null && now - started < CALL_SECONDS * 1000;
          const minutes =
            started === null ? null : Math.max(0, Math.floor((now - started) / 60_000));

          return (
            <Box
              key={table.number}
              component="li"
              sx={{
                display: 'grid',
                gridTemplateColumns: `${size(3)} minmax(0, 1fr)`,
                borderRadius: 2,
                overflow: 'hidden',
                border: '0.15vw solid',
                borderColor: calling
                  ? 'warning.main'
                  : table.status === 'PLAYING'
                    ? 'primary.main'
                    : 'divider',
                bgcolor: 'background.paper',
                ...(calling ? { animation: 'kttf-call 1.6s ease-in-out 4' } : {}),
                '@keyframes kttf-call': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.7 },
                },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: DISPLAY,
                  fontSize: size(2.4),
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  ...(calling
                    ? { bgcolor: 'warning.main', color: 'background.default' }
                    : table.status === 'PLAYING'
                      ? { bgcolor: 'primary.main', color: 'background.default' }
                      : { bgcolor: 'background.default', color: 'text.secondary' }),
                }}
              >
                {table.number}
              </Box>

              <Box sx={{ minWidth: 0, px: '0.8vw', py: '0.7vh' }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '0.6vw',
                    fontSize: size(0.75),
                    lineHeight: 1.3,
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      color: 'text.secondary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {labelOf(match)}
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      flexShrink: 0,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: calling
                        ? 'warning.main'
                        : table.status === 'PLAYING'
                          ? 'success.main'
                          : 'text.secondary',
                    }}
                  >
                    {calling
                      ? t('screen.call')
                      : table.status === 'PLAYING'
                        ? minutes === null
                          ? t('screen.match.playing')
                          : fill(t('screen.minutes'), { minutes: String(minutes) })
                        : t('screen.table.finished')}
                  </Box>
                </Box>
                <Side match={match} side="A" names={names} />
                <Side match={match} side="B" names={names} />
              </Box>
            </Box>
          );
        })}
      </Box>

      {free.length > 0 && (
        <Typography
          sx={{
            mt: '0.8vh',
            fontSize: size(0.95),
            color: 'text.secondary',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {fill(t('screen.free'), { list: free.join(', ') })}
        </Typography>
      )}
    </Box>
  );
}

function Side({
  match,
  side,
  names,
}: {
  readonly match: MatchView;
  readonly side: 'A' | 'B';
  readonly names: ReadonlyMap<string, string>;
}): ReactNode {
  const t = useT();
  const id = side === 'A' ? match.playerAId : match.playerBId;
  const sets = side === 'A' ? match.setsA : match.setsB;
  const other = side === 'A' ? match.setsB : match.setsA;
  const played = sets !== null && other !== null;
  const won = played && sets > other;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: '0.6vw',
        fontSize: size(1.2),
        lineHeight: 1.25,
      }}
    >
      <Box
        component="span"
        sx={{
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          ...(won
            ? { fontWeight: 700, color: 'primary.main' }
            : played
              ? { color: 'text.secondary' }
              : { fontWeight: 600 }),
        }}
      >
        {id === null ? t('screen.match.pending') : (names.get(id) ?? t('screen.match.pending'))}
      </Box>
      {sets !== null && (
        <Box
          component="span"
          sx={{
            flexShrink: 0,
            px: '0.4vw',
            borderRadius: 1,
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            ...(won ? { bgcolor: tint('night-red', 22), color: 'primary.main' } : {}),
          }}
        >
          {sets}
        </Box>
      )}
    </Box>
  );
}
