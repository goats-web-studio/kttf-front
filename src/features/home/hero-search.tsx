import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import { CalendarDays, MapPin, Trophy, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { useT, type MessageKey } from '@/common/i18n';
import { useMyCity } from '@/features/places/my-city';
import { usePlaceName } from '@/features/places/place-name';

import { HeroEyebrow, HeroFrame, HeroTitle } from './hero-frame';
import { rise } from './hero-style';
import LiveSearch from './live-search';

/** Быстрые ссылки под поиском: с городом шапки — и подпись с городом. */
const QUICK: readonly {
  readonly href: string;
  readonly icon: LucideIcon;
  readonly city: MessageKey;
  readonly all: MessageKey;
}[] = [
  {
    href: '/tournaments',
    icon: CalendarDays,
    city: 'home.hero.quick.tournaments',
    all: 'home.hero.quick.tournamentsAll',
  },
  {
    href: '/players',
    icon: Trophy,
    city: 'home.hero.quick.rating',
    all: 'home.hero.quick.ratingAll',
  },
  { href: '/clubs', icon: MapPin, city: 'home.hero.quick.clubs', all: 'home.hero.quick.clubsAll' },
];

/**
 * Вариант A «Поиск в центре» — первый экран как строка поиска: строка
 * бренда, короткий заголовок, живой поиск и три тихие ссылки под ним.
 *
 * Ссылки ведут в разделы, которые и так открываются городом шапки
 * (ADR-093); город в подписи — только когда он известен, иначе подпись
 * честная: «рейтинг страны», а не «моего города».
 */
export default function HeroSearch(): ReactNode {
  const t = useT();
  const myCity = useMyCity();
  const placeName = usePlaceName();
  const city = myCity === null ? undefined : placeName(myCity);

  return (
    <HeroFrame glow={[50, 64]}>
      <Box sx={{ maxWidth: 640, mx: 'auto' }}>
        <HeroEyebrow align="center" />
        <HeroTitle align="center" />
        <Box {...rise(160)} sx={{ mt: 3 }}>
          <LiveSearch align="center" />
        </Box>
        <Box
          component="nav"
          aria-label={t('home.hero.quick')}
          {...rise(240)}
          sx={{
            mt: 2.5,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 1,
          }}
        >
          {QUICK.map(({ href, icon: Icon, city: withCity, all }) => (
            <Link
              key={href}
              href={href}
              underline="none"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                minHeight: { xs: 44, sm: 40 },
                px: 2,
                borderRadius: 999,
                border: '1px solid var(--night-line-strong)',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--night-ink-900)',
                transition:
                  'border-color var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease)',
                '& svg': { color: 'var(--night-ink-500)' },
                '@media (hover: hover)': {
                  '&:hover': { borderColor: 'var(--night-ink-500)', color: 'var(--night-ink-900)' },
                  '&:hover svg': { color: 'var(--night-red)' },
                },
              }}
            >
              <Icon size={16} aria-hidden />
              {city === undefined ? (
                t(all)
              ) : (
                <>
                  {t(withCity)}
                  <Box component="span" sx={{ color: 'var(--night-ink-500)', fontWeight: 500 }}>
                    {city}
                  </Box>
                </>
              )}
            </Link>
          ))}
        </Box>
      </Box>
    </HeroFrame>
  );
}
