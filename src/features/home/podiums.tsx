import type { HomePodium } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import { User } from 'lucide-react';
import type { ReactNode } from 'react';

import { fill, formatDate, formatTime, useLocale, useT } from '@/common/i18n';
import { Reveal } from '@/common/ui/motion';
import RatingCapBadge from '@/features/tournaments/rating-cap-badge';

/** Цвет точки места — медаль, как в профиле игрока. */
const MEDAL = ['var(--gold)', 'var(--silver)', 'var(--bronze)'] as const;

/**
 * «Последние результаты турниров» — ADR-071, как у RTTF: карточка турнира
 * с тройкой призёров. Делённое третье — двумя строками с точкой бронзы.
 * Турнир без записанных мест не скрывается: он завершён, и это новость.
 */
export default function Podiums({ items }: { readonly items: readonly HomePodium[] }): ReactNode {
  return (
    <Box
      component="ul"
      data-home-podiums
      sx={{
        m: 0,
        p: 0,
        listStyle: 'none',
        display: 'grid',
        gap: 1.5,
        // На телефоне карточки идут столбиком — хватает четырёх свежих.
        '& > li:nth-of-type(n+5)': { display: { xs: 'none', sm: 'block' } },
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          sm: 'repeat(2, minmax(0, 1fr))',
          lg: 'repeat(3, minmax(0, 1fr))',
        },
      }}
    >
      {items.map((podium, index) => (
        <Reveal component="li" key={podium.tournamentId} delay={index * 40}>
          <PodiumCard podium={podium} />
        </Reveal>
      ))}
    </Box>
  );
}

function PodiumCard({ podium }: { readonly podium: HomePodium }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const count = String(podium.participants);

  return (
    <Paper variant="outlined" sx={{ p: 1.75, height: '100%', display: 'grid', gap: 1 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          color: 'text.secondary',
          fontSize: 12,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <span>
          {formatDate(podium.startsAt, locale)} · {formatTime(podium.startsAt, locale)}
        </span>
        <Box
          component="span"
          aria-label={fill(t('tournaments.participants'), { count })}
          sx={{ ml: 'auto', display: 'inline-flex', alignItems: 'center', gap: 0.25 }}
        >
          <User size={13} aria-hidden />
          <span aria-hidden>{count}</span>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
        <RatingCapBadge tournament={podium} />
        <Link
          href={`/tournaments/${podium.tournamentId}`}
          color="text.primary"
          underline="hover"
          sx={{
            fontWeight: 600,
            fontSize: 14,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {podium.name}
        </Link>
      </Box>
      <Link
        href={`/clubs/${podium.club.id}`}
        variant="body2"
        color="text.secondary"
        underline="hover"
        sx={{ fontSize: 12, mt: -0.5 }}
      >
        {podium.club.name}
      </Link>

      {podium.places.length === 0 ? (
        <Box sx={{ color: 'text.secondary', fontSize: 13 }}>{t('home.results.noPlaces')}</Box>
      ) : (
        <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 0.5 }}>
          {podium.places.map((place) => (
            <Box
              component="li"
              key={place.playerId}
              sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, fontSize: 13 }}
            >
              <Box
                component="span"
                aria-label={fill(t('home.results.place'), {
                  place:
                    place.placeTo === null
                      ? String(place.place)
                      : `${String(place.place)}–${String(place.placeTo)}`,
                })}
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  flexShrink: 0,
                  bgcolor: MEDAL[Math.min(place.place, 3) - 1],
                }}
              />
              <Link
                href={`/players/${place.playerId}`}
                color="text.primary"
                underline="hover"
                sx={{
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {place.name}
              </Link>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
}
