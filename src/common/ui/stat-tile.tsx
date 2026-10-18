import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface StatTileProps {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: ReactNode;
}

/**
 * Плитка факта: иконка, подпись, значение — дата, участники, взнос.
 *
 * Значение крупнее подписи: глаз ищет «когда» и «сколько», а не слово
 * «Начало». Иконка декоративна, смысл несёт подпись.
 */
export default function StatTile({ icon: Icon, label, value }: StatTileProps): ReactNode {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 1.5,
        borderRadius: 3,
        bgcolor: 'var(--paper-sunken)',
        minWidth: 0,
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 36,
          height: 36,
          flexShrink: 0,
          borderRadius: 2.5,
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'var(--paper)',
          color: 'var(--ink-700)',
          boxShadow: '0 1px 2px rgb(31 31 29 / 0.06)',
        }}
      >
        <Icon size={18} strokeWidth={2} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" component="div">
          {label}
        </Typography>
        <Typography
          component="div"
          sx={{
            fontWeight: 600,
            fontSize: 15,
            lineHeight: '20px',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </Typography>
      </Box>
    </Box>
  );
}
