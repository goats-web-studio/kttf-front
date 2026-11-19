import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import PlayerAvatar from '@/common/ui/player-avatar';
import RatingValue from '@/common/ui/rating-value';
import { useMyCity } from '@/features/places/my-city';
import { usePlaceName } from '@/features/places/place-name';
import { playerName } from '@/features/players/player-name';
import { playersQuery } from '@/features/players/queries';

import { HeroColumns, HeroEyebrow, HeroFrame, HeroTitle, NightCard } from './hero-frame';
import { NIGHT_ROW, rise } from './hero-style';
import LiveSearch from './live-search';

/** Строк в карточке: полный рейтинг — по ссылке. */
const TOP = 5;

/**
 * Вариант C «Поиск и рейтинг»: слева поиск, справа пятёрка сильнейших
 * города шапки. Без города — страны; в городе без игроков с рейтингом
 * карточка тоже берёт страну, а не стоит пустой.
 */
export default function HeroRating(): ReactNode {
  return (
    <HeroFrame glow={[28, 70]}>
      <HeroColumns
        start={
          <>
            <HeroEyebrow align="start" />
            <HeroTitle align="start" />
            <Box {...rise(160)} sx={{ mt: 3 }}>
              <LiveSearch align="start" />
            </Box>
          </>
        }
        end={<TopRating />}
      />
    </HeroFrame>
  );
}

function TopRating(): ReactNode {
  const t = useT();
  const placeName = usePlaceName();
  const myCity = useMyCity();

  // Список уже отсортирован сервером по рейтингу — сильнейшие первыми.
  const city = useQuery({
    ...playersQuery({ page: 1, limit: TOP, cityId: myCity?.id ?? '' }),
    enabled: myCity !== null,
  });
  const cityEmpty = myCity === null || (city.isSuccess && city.data.items.length === 0);
  const country = useQuery({ ...playersQuery({ page: 1, limit: TOP }), enabled: cityEmpty });
  const shown = cityEmpty ? country : city;
  const items = shown.data?.items ?? [];

  return (
    <NightCard
      data="rating"
      title={t('home.hero.top')}
      subtitle={cityEmpty ? t('home.hero.country') : placeName(myCity)}
      action={{ href: '/players', label: t('home.top.all') }}
    >
      {shown.isPending ? (
        <Box role="status" aria-label={t('common.loading')} sx={{ px: 2, pb: 1.5 }}>
          {Array.from({ length: TOP }, (_, index) => (
            <Skeleton
              key={index}
              variant="rounded"
              height={32}
              sx={{ mt: 1, bgcolor: 'var(--night-raised)' }}
            />
          ))}
        </Box>
      ) : items.length === 0 ? (
        <Typography
          sx={{
            px: 2,
            py: 2,
            borderTop: '1px solid var(--night-line)',
            fontSize: 14,
            color: 'var(--night-ink-700)',
          }}
        >
          {t('home.hero.topEmpty')}
        </Typography>
      ) : (
        <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none' }}>
          {items.map((player, index) => (
            <Box
              component="li"
              key={player.id}
              data-player={player.id}
              sx={{
                ...NIGHT_ROW,
                gridTemplateColumns: '16px auto minmax(0, 1fr) auto',
                minHeight: { xs: 48, md: 40 },
              }}
            >
              <Box
                sx={{
                  fontSize: 14,
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  color: index === 0 ? 'var(--night-red)' : 'var(--night-ink-500)',
                }}
              >
                {index + 1}
              </Box>
              <PlayerAvatar
                lastName={player.lastName}
                firstName={player.firstName}
                photoUrl={player.photoUrl}
                size="sm"
              />
              <Box sx={{ minWidth: 0 }}>
                <Link
                  data-row-link
                  href={`/players/${player.id}`}
                  underline="none"
                  sx={{
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: 14,
                    fontWeight: 600,
                    lineHeight: 1.4,
                    color: 'var(--night-ink-900)',
                  }}
                >
                  {playerName(player, t)}
                </Link>
              </Box>
              <RatingValue
                value={player.rating}
                animate={false}
                sx={{ fontSize: 14, fontWeight: 700, color: 'var(--night-ink-900)' }}
              />
            </Box>
          ))}
        </Box>
      )}
    </NightCard>
  );
}
