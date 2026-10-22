import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

/**
 * Зерно плёнки — шум из SVG, вшитый в адрес картинки. Файла нет, запроса
 * нет; CSP картинки `data:` пропускает. Один на тёмные и светлые подложки.
 */
export const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

interface AtmosphereProps {
  /** Центр красного свечения, проценты по ширине и высоте блока. */
  readonly glow?: readonly [number, number];
  readonly component?: 'div' | 'section' | 'footer';
  /** Высота блока по точкам перелома — у первого экрана. */
  readonly minHeight?: { readonly xs?: number; readonly md?: number };
  readonly children?: ReactNode;
}

/**
 * Тёмная фирменная подложка — та же, что у постеров и шапки YouTube-канала
 * (`kttf-marketing`, `studio/src/brand/Atmosphere.tsx`): почти чёрный фон,
 * красное свечение, виньетка к краям и зерно. Один язык у рекламы и у сайта:
 * человек, пришедший с поста, узнаёт бренд на первом экране.
 *
 * Только для крупных блоков — первый экран, подвал. Карточка на таком фоне
 * перестаёт быть карточкой.
 */
export default function Atmosphere({
  glow = [50, 45],
  component = 'div',
  minHeight,
  children,
}: AtmosphereProps): ReactNode {
  const [x, y] = glow;

  return (
    <Box
      component={component}
      sx={{
        position: 'relative',
        isolation: 'isolate',
        overflow: 'hidden',
        bgcolor: 'var(--night)',
        color: 'var(--night-ink-900)',
        backgroundImage: [
          'radial-gradient(ellipse 120% 90% at 50% 50%, transparent 55%, rgb(0 0 0 / 0.7) 100%)',
          `radial-gradient(ellipse 60% 65% at ${String(x)}% ${String(y)}%, rgb(224 52 44 / 0.78) 0%, rgb(94 13 9 / 0.62) 45%, transparent 78%)`,
        ].join(', '),
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          zIndex: -1,
          backgroundImage: GRAIN,
          opacity: 0.22,
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
        },
        ...(minHeight !== undefined && { minHeight }),
      }}
    >
      {children}
    </Box>
  );
}
