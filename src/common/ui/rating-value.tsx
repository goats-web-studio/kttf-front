import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import { Star } from 'lucide-react';
import type { ReactNode } from 'react';

import { formatRating } from '@/common/i18n';

import { CountUp } from './motion';

interface RatingValueProps {
  /** Рейтинг строкой, как пришёл от сервера (ADR-014); целым он становится при показе. */
  readonly value: string;
  /** Кегль, начертание и гарнитуру задаёт место: звезда — доля кегля. */
  readonly sx?: Exclude<SxProps<Theme>, readonly unknown[]>;
  /**
   * Расти от нуля при первом показе. Выключается там, где число меняется
   * от наведения или открывается заново каждый раз: подсказка графика,
   * меню аккаунта, выбор в поле формы.
   */
  readonly animate?: boolean;
}

/**
 * Рейтинг со звездой — `★421`, как у RTTF (ADR-050, ADR-053).
 *
 * Звезда — знак «это рейтинг», а не украшение: в строке «421 · 8 место ·
 * 3:1» без неё не понять, какое из чисел рейтинг. Одна на всё приложение,
 * чтобы рейтинг везде читался одинаково — в шапке, таблице, графике.
 *
 * Звезда брендовым `--red-500`: это не текст, а знак, и порог для него 3:1
 * (07, 3.2). Число остаётся цветом текста — красные цифры в каждой строке
 * таблицы съели бы правило 5% (07, 1.3). Чтецу экрана звезда не нужна: рядом
 * всегда подпись «Рейтинг» или заголовок колонки.
 *
 * При первом показе число растёт от нуля до рейтинга (`CountUp`): рейтинг —
 * итог игры, и пусть он так и читается.
 */
export default function RatingValue({ value, sx, animate = true }: RatingValueProps): ReactNode {
  const whole = Number(formatRating(value));

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
      {animate && Number.isFinite(whole) ? (
        <CountUp value={whole} format={(shown) => String(Math.round(shown))} />
      ) : (
        <span>{formatRating(value)}</span>
      )}
    </Box>
  );
}
