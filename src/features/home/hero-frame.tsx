import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import Atmosphere from '@/common/ui/atmosphere';

import { rise } from './hero-style';

/**
 * Первый экран главной — тёмная фирменная подложка (`Atmosphere`), как
 * шапка YouTube-канала и постеры: почти чёрный фон и красное свечение.
 *
 * Свечение стоит за поиском — главным действием экрана. Нижнее поле с
 * запасом: плитки разделов и личная полоса заходят на постер снизу.
 */
export function HeroFrame({
  glow,
  children,
}: {
  readonly glow: readonly [number, number];
  readonly children: ReactNode;
}): ReactNode {
  return (
    <Atmosphere component="section" glow={glow}>
      <Container
        maxWidth="lg"
        sx={{ position: 'relative', pt: { xs: 4, md: 5 }, pb: { xs: 7, md: 9 } }}
      >
        {children}
      </Container>
    </Atmosphere>
  );
}

/**
 * Строка бренда маленькой надписью над заголовком: «KTTF · турниры ·
 * рейтинг · клубы · игроки». KTTF — светлым красным, остальное тише.
 *
 * Точки — только на широком экране: на телефоне строка переносится, и
 * перенос оставлял точку в начале строки; там слова стоят с равными
 * промежутками.
 */
export function HeroEyebrow({ align }: { readonly align: 'center' | 'start' }): ReactNode {
  const t = useT();
  const words = t('home.hero.line').split(' · ');

  return (
    <Typography
      {...rise(0)}
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        columnGap: { xs: 1.5, sm: 1 },
        rowGap: 0.5,
        fontSize: 12,
        fontWeight: 700,
        lineHeight: 1.5,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--night-ink-700)',
      }}
    >
      {words.map((word, index) => (
        <Box component="span" key={word} sx={{ display: 'inline-flex', gap: 1 }}>
          {index > 0 && (
            <Box component="span" aria-hidden sx={{ display: { xs: 'none', sm: 'inline' } }}>
              ·
            </Box>
          )}
          <Box component="span" sx={index === 0 ? { color: 'var(--night-red)' } : undefined}>
            {word}
          </Box>
        </Box>
      ))}
    </Typography>
  );
}

/**
 * Заголовок экрана — обычным регистром и коротко: что здесь можно сделать.
 * Тень отделяет белые буквы от красного свечения.
 */
export function HeroTitle({ align }: { readonly align: 'center' | 'start' }): ReactNode {
  const t = useT();

  return (
    <Typography
      {...rise(80)}
      component="h1"
      sx={{
        mt: 1.5,
        fontWeight: 800,
        fontSize: { xs: 26, sm: 32, md: 36 },
        lineHeight: 1.15,
        letterSpacing: '-0.01em',
        textAlign: align === 'center' ? 'center' : 'left',
        textWrap: 'balance',
        textShadow: '0 2px 6px rgb(0 0 0 / 0.45), 0 8px 32px rgb(0 0 0 / 0.4)',
      }}
    >
      {t('home.hero.title')}
    </Typography>
  );
}

/**
 * Две колонки на широком экране: поиск слева, карточка справа. На телефоне
 * — одна колонка, сначала поиск.
 */
export function HeroColumns({
  start,
  end,
}: {
  readonly start: ReactNode;
  readonly end: ReactNode;
}): ReactNode {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) 380px' },
        columnGap: { md: 6, lg: 10 },
        rowGap: 4,
        alignItems: 'center',
      }}
    >
      <Box sx={{ minWidth: 0 }}>{start}</Box>
      <Box {...rise(240)} sx={{ minWidth: 0 }}>
        {end}
      </Box>
    </Box>
  );
}

/**
 * Карточка на постере — тёмная, полупрозрачная: свечение проходит сквозь
 * неё, и карточка остаётся частью постера, а не белым пятном поверх.
 */
export function NightCard({
  title,
  subtitle,
  action,
  children,
  data,
}: {
  readonly title: string;
  readonly subtitle: string;
  readonly action: { readonly href: string; readonly label: string };
  readonly children: ReactNode;
  readonly data?: string;
}): ReactNode {
  return (
    <Box
      component="section"
      aria-label={title}
      data-hero-card={data}
      sx={{
        borderRadius: 3,
        border: '1px solid var(--night-line)',
        bgcolor: 'color-mix(in srgb, var(--night) 80%, transparent)',
        backdropFilter: 'blur(8px)',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          px: 2,
          pt: 1.5,
          pb: 1,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h2" sx={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>
            {title}
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'var(--night-ink-500)', lineHeight: 1.5 }}>
            {subtitle}
          </Typography>
        </Box>
        <Link
          href={action.href}
          underline="none"
          sx={{
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            minHeight: 44,
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--night-ink-700)',
            '&:hover': { color: 'var(--night-red)' },
          }}
        >
          {action.label}
        </Link>
      </Box>
      {children}
    </Box>
  );
}
