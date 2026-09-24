import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

import MatchLine from './match-line';
import type { TableState } from './queue';

interface TablesZoneProps {
  readonly tables: readonly TableState[];
  readonly names: ReadonlyMap<string, string>;
}

/**
 * Зона столов — ТЗ 6.1.
 *
 * Три состояния, а не два: свободен, занят, встреча закрыта и ждёт, когда
 * за стол сядут следующие. Третье существует потому, что счёт вводится
 * раньше, чем игроки уходят от стола.
 */
export default function TablesZone({ tables, names }: TablesZoneProps): ReactNode {
  const t = useT();

  return (
    <section>
      <Typography
        component="h2"
        variant="subtitle2"
        color="text.secondary"
        sx={{ fontWeight: 600 }}
      >
        {t('console.tables.title')}
      </Typography>
      <Box
        component="ul"
        sx={{
          mt: 1,
          p: 0,
          listStyle: 'none',
          display: 'grid',
          gap: 1,
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' },
        }}
      >
        {tables.map((table) => (
          <Paper
            key={table.number}
            component="li"
            variant="outlined"
            // Идущий матч маркируется красным — принцип 1.3 дизайн-системы.
            // Состояние при этом всегда написано словом рядом: цвет здесь
            // второй носитель смысла, а не единственный (запрет №6).
            sx={{
              p: 1,
              typography: 'body2',
              borderColor:
                table.status === 'PLAYING'
                  ? 'primary.main'
                  : table.status === 'AWAITING'
                    ? 'warning.main'
                    : 'divider',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Box
                component="span"
                sx={{
                  fontFamily: "'Oswald', system-ui, sans-serif",
                  fontSize: 22,
                  lineHeight: '26px',
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {table.number}
              </Box>
              <Typography component="span" variant="caption" color="text.secondary">
                {table.status === 'PLAYING'
                  ? t('console.table.busy')
                  : table.status === 'AWAITING'
                    ? t('console.table.awaiting')
                    : t('console.table.free')}
              </Typography>
            </Box>
            {table.match !== null && (
              <Box sx={{ mt: 0.5, typography: 'caption' }}>
                <MatchLine match={table.match} names={names} />
              </Box>
            )}
          </Paper>
        ))}
      </Box>
    </section>
  );
}
