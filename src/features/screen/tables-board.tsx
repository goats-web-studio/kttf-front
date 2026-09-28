import type { MatchView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import type { TableState } from '@/features/console/queue';

import { DISPLAY, size } from './scale';

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
 * Столы зала — ТЗ 6.5.
 *
 * Сетка заполняет всю доступную высоту: число колонок и строк подбирается
 * под число столов, и на телевизоре не бывает ни прокрутки, ни пустой
 * нижней половины. На стену смотрят с десяти метров, поэтому на карточке
 * только номер стола, две фамилии и счёт.
 *
 * Только что назначенная пара подсвечена словом «Вызов»: игрок, отошедший
 * за водой, должен найти свой стол на стене, не спрашивая судью.
 */
export default function TablesBoard({ tables, names, labelOf, now }: TablesBoardProps): ReactNode {
  const t = useT();
  const columns = columnsFor(tables.length);
  const rows = Math.max(1, Math.ceil(tables.length / columns));

  return (
    <Box
      component="section"
      aria-label={t('screen.tables.title')}
      sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
    >
      <Typography component="h2" color="text.secondary" sx={TITLE}>
        {t('screen.tables.title')}
      </Typography>
      <Box
        component="ul"
        sx={{
          m: 0,
          mt: '0.8vh',
          p: 0,
          listStyle: 'none',
          flexGrow: 1,
          minHeight: 0,
          display: 'grid',
          gap: '0.8vw',
          gridTemplateColumns: `repeat(${String(columns)}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${String(rows)}, minmax(0, 1fr))`,
        }}
      >
        {tables.map((table) => {
          const calling =
            table.status === 'PLAYING' &&
            table.match?.startedAt != null &&
            now - Date.parse(table.match.startedAt) < CALL_SECONDS * 1000;

          return (
            <Box
              key={table.number}
              component="li"
              sx={{
                position: 'relative',
                minHeight: 0,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                px: '1vw',
                py: '1vh',
                borderRadius: 2,
                border: '0.2vw solid',
                ...(table.status === 'PLAYING'
                  ? {
                      borderColor: calling ? 'warning.main' : 'success.main',
                      bgcolor: 'background.paper',
                    }
                  : table.status === 'AWAITING'
                    ? { borderColor: 'divider', bgcolor: 'background.paper' }
                    : { borderColor: 'divider', bgcolor: 'background.default' }),
                ...(calling ? { animation: 'kttf-call 1.6s ease-in-out 4' } : {}),
                '@keyframes kttf-call': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.72 },
                },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: '1vw',
                }}
              >
                <Typography
                  component="span"
                  sx={{
                    fontFamily: DISPLAY,
                    fontSize: size(2.6),
                    lineHeight: 1,
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    color: table.status === 'FREE' ? 'text.secondary' : 'text.primary',
                  }}
                >
                  {table.number}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontSize: size(1),
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
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
                      ? t('screen.match.playing')
                      : table.status === 'AWAITING'
                        ? t('screen.table.finished')
                        : t('screen.table.free')}
                </Typography>
              </Box>

              {table.match !== null && (
                <TableMatch match={table.match} names={names} label={labelOf(table.match)} />
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

/** Колонки под число столов: карточка не уже трети экрана при малом зале. */
function columnsFor(count: number): number {
  if (count <= 4) return 2;
  if (count <= 9) return 3;
  if (count <= 16) return 4;

  return 5;
}

const TITLE = {
  fontSize: size(1.2),
  lineHeight: 1.2,
  fontWeight: 600,
} as const;

function TableMatch({
  match,
  names,
  label,
}: {
  readonly match: MatchView;
  readonly names: ReadonlyMap<string, string>;
  readonly label: string;
}): ReactNode {
  const played = match.setsA !== null && match.setsB !== null;

  return (
    <Box
      sx={{
        my: 'auto',
        pt: '1vh',
        display: 'grid',
        gap: '0.6vh',
        gridTemplateColumns: 'minmax(0, 1fr)',
      }}
    >
      <Typography
        component="span"
        color="text.secondary"
        sx={{
          fontSize: size(0.9),
          lineHeight: 1.3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </Typography>
      <Side
        id={match.playerAId}
        names={names}
        sets={match.setsA}
        played={played}
        won={played && (match.setsA ?? 0) > (match.setsB ?? 0)}
      />
      <Side
        id={match.playerBId}
        names={names}
        sets={match.setsB}
        played={played}
        won={played && (match.setsB ?? 0) > (match.setsA ?? 0)}
      />
    </Box>
  );
}

function Side({
  id,
  names,
  sets,
  played,
  won,
}: {
  readonly id: string | null;
  readonly names: ReadonlyMap<string, string>;
  readonly sets: number | null;
  readonly played: boolean;
  readonly won: boolean;
}): ReactNode {
  const t = useT();

  // Победитель — цвет, насыщенность и линейка слева: цвет не единственный
  // носитель смысла (запрет №6).
  return (
    <Box
      component="p"
      sx={{
        m: 0,
        pl: '0.6vw',
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: '1vw',
        fontSize: size(2),
        lineHeight: 1.2,
        borderLeft: '0.25vw solid',
        borderColor: won ? 'primary.main' : 'transparent',
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
              : { fontWeight: 600, color: 'text.primary' }),
        }}
      >
        {id === null ? t('screen.match.pending') : (names.get(id) ?? t('screen.match.pending'))}
      </Box>
      {sets !== null && (
        <Box
          component="span"
          sx={{
            flexShrink: 0,
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {sets}
        </Box>
      )}
    </Box>
  );
}
