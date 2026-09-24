import type { MatchView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import type { TableState } from '@/features/console/queue';

interface TablesBoardProps {
  readonly tables: readonly TableState[];
  readonly names: ReadonlyMap<string, string>;
}

/**
 * Столы зала — ТЗ 6.5.
 *
 * Своя вёрстка, а не консольная: на телевизор смотрят с десяти метров, и всё,
 * что здесь есть, — номер стола, две фамилии и счёт. Кнопок нет вовсе: экран
 * ничего не умеет, кроме показа.
 *
 * Состояние стола различается по цвету, а не подписью: слово «Занят» с той же
 * дистанции не читается.
 */
export default function TablesBoard({ tables, names }: TablesBoardProps): ReactNode {
  const t = useT();

  return (
    <section>
      <Typography variant="h2" color="text.secondary" sx={BOARD_TITLE}>
        {t('screen.tables.title')}
      </Typography>
      <Box
        component="ul"
        sx={{
          mt: 1.5,
          p: 0,
          listStyle: 'none',
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            xl: 'repeat(3, minmax(0, 1fr))',
          },
        }}
      >
        {tables.map((table) => (
          <Paper
            key={table.number}
            component="li"
            variant="outlined"
            sx={{
              p: 2,
              borderWidth: 2,
              borderRadius: 2,
              ...(table.status === 'PLAYING'
                ? { borderColor: 'success.main' }
                : table.status === 'AWAITING'
                  ? { borderColor: 'warning.main' }
                  : { borderColor: 'divider', bgcolor: 'background.default' }),
            }}
          >
            <Typography
              sx={{
                fontFamily: DISPLAY,
                fontSize: 30,
                lineHeight: '32px',
                fontWeight: 700,
                color: 'text.secondary',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {table.number}
            </Typography>

            {table.match === null ? (
              <Typography color="text.secondary" sx={{ mt: 1, fontSize: 22, lineHeight: '28px' }}>
                {t('screen.table.free')}
              </Typography>
            ) : (
              <TableMatch match={table.match} names={names} />
            )}
          </Paper>
        ))}
      </Box>
    </section>
  );
}

const DISPLAY = "'Oswald', system-ui, sans-serif";

/** Заголовок доски: читается с десяти метров, но не спорит с данными. */
const BOARD_TITLE = {
  fontFamily: 'inherit',
  fontSize: 22,
  lineHeight: '28px',
  fontWeight: 600,
} as const;

function TableMatch({
  match,
  names,
}: {
  readonly match: MatchView;
  readonly names: ReadonlyMap<string, string>;
}): ReactNode {
  const t = useT();
  const played = match.setsA !== null && match.setsB !== null;

  return (
    <Box sx={{ mt: 1, display: 'grid', gap: 0.5 }}>
      <Side
        id={match.playerAId}
        names={names}
        sets={match.setsA}
        won={played && (match.setsA ?? 0) > (match.setsB ?? 0)}
      />
      <Side
        id={match.playerBId}
        names={names}
        sets={match.setsB}
        won={played && (match.setsB ?? 0) > (match.setsA ?? 0)}
      />
      {!played && (
        <Typography color="success.main" sx={{ fontSize: 17, lineHeight: '26px' }}>
          {t('screen.match.playing')}
        </Typography>
      )}
    </Box>
  );
}

function Side({
  id,
  names,
  sets,
  won,
}: {
  readonly id: string | null;
  readonly names: ReadonlyMap<string, string>;
  readonly sets: number | null;
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
        pl: 1,
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 2,
        fontSize: 24,
        lineHeight: '32px',
        borderLeft: '3px solid',
        borderColor: won ? 'primary.main' : 'transparent',
      }}
    >
      <Box
        component="span"
        sx={won ? { fontWeight: 700, color: 'primary.main' } : { color: 'text.secondary' }}
      >
        {id === null ? t('screen.match.pending') : (names.get(id) ?? t('screen.match.pending'))}
      </Box>
      {sets !== null && (
        <Box
          component="span"
          sx={{ fontFamily: DISPLAY, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
        >
          {sets}
        </Box>
      )}
    </Box>
  );
}
