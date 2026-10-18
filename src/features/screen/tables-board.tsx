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

/** Скрыто от глаза, видно чтецу экрана. */
const HIDDEN = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;

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
                borderRadius: 3,
                overflow: 'hidden',
                border: '0.1vw solid',
                // Выделяется только вызов — ради него игрок и смотрит на стену.
                // Идущая встреча — обычная карточка: их на стене большинство.
                borderColor: calling ? 'var(--warn)' : 'divider',
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
                    ? { bgcolor: 'var(--warn)', color: '#ffffff' }
                    : { bgcolor: 'var(--paper-sunken)', color: 'text.primary' }),
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
                      fontWeight: 600,
                      color: calling ? 'var(--warn-text)' : 'text.secondary',
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
        // Свободные столы — пилюлями с зелёной точкой: зритель ищет «куда
        // идти» глазами, а не читает строку через запятую. Подпись словом
        // остаётся для чтеца экрана.
        <Box
          sx={{ mt: '1vh', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5vw' }}
        >
          {/* Чтецу экрана — фраза целиком, глазу — пилюли. */}
          <Box component="span" sx={HIDDEN}>
            {fill(t('screen.free'), { list: free.join(', ') })}
          </Box>
          <Typography
            component="span"
            aria-hidden
            sx={{ fontSize: size(0.95), color: 'text.secondary', mr: '0.3vw' }}
          >
            {t('screen.free.label')}
          </Typography>
          {free.map((number) => (
            <Box
              key={number}
              component="span"
              aria-hidden
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35vw',
                px: '0.7vw',
                py: '0.25vh',
                borderRadius: 999,
                bgcolor: 'color-mix(in srgb, var(--ok) 16%, transparent)',
                color: 'var(--ok)',
                fontFamily: "'Oswald', system-ui, sans-serif",
                fontWeight: 700,
                fontSize: size(1),
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <Box
                component="span"
                aria-hidden
                sx={{
                  width: '0.4vw',
                  height: '0.4vw',
                  borderRadius: '50%',
                  bgcolor: 'currentColor',
                }}
              />
              {number}
            </Box>
          ))}
        </Box>
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
            ...(won ? { bgcolor: tint('red-600', 22), color: 'primary.main' } : {}),
          }}
        >
          {sets}
        </Box>
      )}
    </Box>
  );
}
