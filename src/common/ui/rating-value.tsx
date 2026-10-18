import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import { Star } from 'lucide-react';
import type { ReactNode } from 'react';

import { formatRating } from '@/common/i18n';

interface RatingValueProps {
  /** Рейтинг строкой, как пришёл от сервера (ADR-014); два знака дописываются при показе. */
  readonly value: string;
  /** Кегль, начертание и гарнитуру задаёт место: звезда — доля кегля. */
  readonly sx?: Exclude<SxProps<Theme>, readonly unknown[]>;
}

/**
 * Рейтинг со звездой — `★421.22`, как у RTTF (ADR-050).
 *
 * Звезда — знак «это рейтинг», а не украшение: в строке «421.22 · 8 место ·
 * 3:1» без неё не понять, какое из чисел рейтинг. Одна на всё приложение,
 * чтобы рейтинг везде читался одинаково — в шапке, таблице, графике.
 *
 * Звезда брендовым `--red-500`: это не текст, а знак, и порог для него 3:1
 * (07, 3.2). Число остаётся цветом текста — красные цифры в каждой строке
 * таблицы съели бы правило 5% (07, 1.3). Чтецу экрана звезда не нужна: рядом
 * всегда подпись «Рейтинг» или заголовок колонки.
 */
export default function RatingValue({ value, sx }: RatingValueProps): ReactNode {
  return (
    <Box
      component="span"
      data-rating-value
      sx={[
        {
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: '0.12em',
          whiteSpace: 'nowrap',
          fontVariantNumeric: 'tabular-nums',
        },
        sx ?? false,
      ]}
    >
      <Box
        component={Star}
        aria-hidden
        strokeWidth={0}
        fill="currentColor"
        sx={{
          color: 'var(--red-500)',
          width: '0.78em',
          height: '0.78em',
          flexShrink: 0,
          // Звезда садится на линию цифр, а не на базовую линию шрифта.
          alignSelf: 'center',
        }}
      />
      <span>{formatRating(value)}</span>
    </Box>
  );
}
