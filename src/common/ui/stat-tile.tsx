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
 * Плитка факта: подпись с иконкой, под ней значение — дата, участники, взнос.
 *
 * Значение крупнее подписи: глаз ищет «когда» и «сколько», а не слово
 * «Начало». Иконка стоит в строке подписи, без собственной подложки:
 * квадрат с тенью внутри плитки внутри карточки — три слоя там, где
 * нужен один. Иконка декоративна, смысл несёт подпись.
 */
export default function StatTile({ icon: Icon, label, value }: StatTileProps): ReactNode {
  return (
    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'var(--paper-sunken)', minWidth: 0 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        component="div"
        sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
      >
        <Icon size={14} strokeWidth={2} aria-hidden style={{ flexShrink: 0 }} />
        {label}
      </Typography>
      <Typography
        component="div"
        sx={{
          mt: 0.25,
          fontWeight: 600,
          fontSize: 15,
          lineHeight: '20px',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
