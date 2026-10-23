import Box from '@mui/material/Box';
import CardActionArea from '@mui/material/CardActionArea';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import {
  Building2,
  CalendarClock,
  GraduationCap,
  ShoppingBag,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { useT, type MessageKey } from '@/common/i18n';
import { Reveal } from '@/common/ui/motion';

interface Interest {
  readonly key: string;
  readonly href: string;
  readonly icon: LucideIcon;
  /** Главные входы — турниры и рейтинг — крупнее остальных. */
  readonly major?: boolean;
}

/**
 * Зачем приходят на сайт — по одному входу на интерес. Порядок — от игры к
 * покупке: сыграть турнир, посмотреть рейтинг, найти зал, тренера,
 * тренировку, инвентарь.
 */
const INTERESTS: readonly Interest[] = [
  { key: 'play', href: '/tournaments', icon: Trophy, major: true },
  { key: 'rating', href: '/players', icon: TrendingUp, major: true },
  { key: 'club', href: '/clubs', icon: Building2 },
  { key: 'coach', href: '/trainings?view=coaches', icon: GraduationCap },
  { key: 'training', href: '/trainings', icon: CalendarClock },
  { key: 'gear', href: '/market', icon: ShoppingBag },
];

/**
 * «Что вас интересует» — плитки входа в разделы сразу под первым экраном.
 *
 * Шапка перечисляет разделы названиями; плитка говорит, что человек там
 * сделает. Новичок, пришедший с рекламы, не знает, что «Тренировки» — это
 * где найти тренера, а «Маркет» — где посмотреть, чем играют сильные.
 *
 * Плитки разного веса: турниры и рейтинг — то, ради чего сайт открывают
 * чаще всего, — вдвое шире и с описанием на любом экране; остальные четыре
 * ниже и уже. Иконка стоит в строке с заголовком, без собственной
 * подложки; плитка целиком — одна ссылка.
 */
export default function InterestTiles(): ReactNode {
  const t = useT();

  return (
    <Box
      component="ul"
      aria-label={t('home.interests.title')}
      sx={{
        listStyle: 'none',
        m: 0,
        p: 0,
        display: 'grid',
        gap: { xs: 1.5, sm: 2 },
        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(12, minmax(0, 1fr))' },
      }}
    >
      {INTERESTS.map(({ key, href, icon: Icon, major = false }, index) => (
        <Reveal
          component="li"
          key={key}
          delay={index * 60}
          sx={{
            gridColumn: major
              ? { xs: 'span 2', sm: 'span 6' }
              : { xs: 'span 1', sm: 'span 6', md: 'span 3' },
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              height: '100%',
              overflow: 'hidden',
              transition: 'border-color var(--dur-base) var(--ease)',
              '&:hover': { borderColor: 'var(--line-strong)' },
            }}
          >
            <CardActionArea
              href={href}
              sx={{
                height: '100%',
                p: { xs: 2, sm: major ? 3 : 2.5 },
                minHeight: { xs: major ? 0 : 96, sm: 0 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
              }}
            >
              <Typography
                variant="h3"
                component="h3"
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1,
                  fontSize: major ? { xs: 18, sm: 22 } : { xs: 15, sm: 17 },
                  lineHeight: major ? { xs: '24px', sm: '28px' } : { xs: '20px', sm: '24px' },
                }}
              >
                <Box
                  component="span"
                  aria-hidden
                  sx={{
                    display: 'inline-flex',
                    flexShrink: 0,
                    color: 'var(--ink-700)',
                    // Иконка по центру первой строки заголовка.
                    height: major ? { xs: 24, sm: 28 } : { xs: 20, sm: 24 },
                    alignItems: 'center',
                  }}
                >
                  <Icon size={major ? 22 : 18} strokeWidth={2} />
                </Box>
                {t(`home.interests.${key}.title` as MessageKey)}
              </Typography>
              <Typography
                variant={major ? 'body1' : 'body2'}
                color="text.secondary"
                // На телефоне у малых плиток только название: шесть
                // описаний занимали два экрана до первого турнира.
                sx={{ display: major ? 'block' : { xs: 'none', sm: 'block' }, mt: 0.75 }}
              >
                {t(`home.interests.${key}.text` as MessageKey)}
              </Typography>
            </CardActionArea>
          </Paper>
        </Reveal>
      ))}
    </Box>
  );
}
