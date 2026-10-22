import Box from '@mui/material/Box';
import CardActionArea from '@mui/material/CardActionArea';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import {
  ArrowRight,
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
}

/**
 * Зачем приходят на сайт — по одному входу на интерес. Порядок — от игры к
 * покупке: сыграть турнир, посмотреть рейтинг, найти зал, тренера,
 * тренировку, инвентарь.
 */
const INTERESTS: readonly Interest[] = [
  { key: 'play', href: '/tournaments', icon: Trophy },
  { key: 'rating', href: '/players', icon: TrendingUp },
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
 * Большая иконка в углу под фирменным наклоном — декор, его нет для
 * читалки экрана; плитка целиком — одна ссылка.
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
        gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' },
      }}
    >
      {INTERESTS.map(({ key, href, icon: Icon }, index) => (
        <Reveal component="li" key={key} delay={index * 60}>
          <Paper variant="outlined" sx={{ height: '100%', overflow: 'hidden' }}>
            <CardActionArea
              href={href}
              sx={{
                position: 'relative',
                height: '100%',
                p: { xs: 2, sm: 3 },
                minHeight: { xs: 112, sm: 0 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                '&:hover .interest-arrow': {
                  transform: 'translateX(4px)',
                  color: 'var(--red-600)',
                },
                '&:hover .interest-decor': { color: 'var(--red-100)' },
              }}
            >
              <Box
                className="interest-decor"
                aria-hidden
                sx={{
                  display: { xs: 'none', sm: 'block' },
                  position: 'absolute',
                  right: -12,
                  bottom: -18,
                  color: 'var(--red-50)',
                  transform: 'rotate(-9deg)',
                  transition: 'color var(--dur-base) var(--ease)',
                  '& svg': { width: 120, height: 120 },
                }}
              >
                <Icon strokeWidth={1.5} />
              </Box>
              <Box
                aria-hidden
                sx={{
                  position: 'relative',
                  width: 44,
                  height: 44,
                  borderRadius: 3,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'var(--red-50)',
                  color: 'var(--red-600)',
                }}
              >
                <Icon size={22} strokeWidth={2} />
              </Box>
              <Typography
                variant="h3"
                component="h3"
                sx={{
                  position: 'relative',
                  mt: { xs: 1.5, sm: 2 },
                  fontSize: { xs: 15, sm: 17 },
                  lineHeight: { xs: '20px', sm: '26px' },
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                }}
              >
                {t(`home.interests.${key}.title` as MessageKey)}
                <Box
                  component="span"
                  className="interest-arrow"
                  sx={{
                    display: { xs: 'none', sm: 'inline-flex' },
                    color: 'var(--ink-400)',
                    transition:
                      'transform var(--dur-base) var(--ease), color var(--dur-base) var(--ease)',
                  }}
                >
                  <ArrowRight size={18} aria-hidden />
                </Box>
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                // На телефоне — только иконка и название: шесть плиток с
                // описанием занимали два экрана до первого турнира.
                sx={{ display: { xs: 'none', sm: 'block' }, position: 'relative', mt: 0.5, pr: 6 }}
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
