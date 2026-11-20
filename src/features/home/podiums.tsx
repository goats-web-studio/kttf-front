import type { HomePodium } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import { useQuery } from '@tanstack/react-query';
import { User } from 'lucide-react';
import type { ReactNode } from 'react';

import { fill, formatDate, formatTime, useLocale, useT } from '@/common/i18n';
import { Reveal } from '@/common/ui/motion';
import Surface from '@/common/ui/surface';
import RatingCapBadge from '@/features/tournaments/rating-cap-badge';

import { railSx } from './rail';
import { homePodiumsQuery } from './stats-queries';

/**
 * Итоги турниров — список завершённых в разделе турниров; над ним — полная
 * сетка призёров (ADR-071). Ссылка «Все итоги» главной ведёт сюда.
 */
export const RESULTS_HREF = '/tournaments?status=FINISHED&view=list';

/** Турниров в коротком блоке колонки главной. */
const SHORT = 4;

/** Цвет точки места — медаль, как в профиле игрока. */
const MEDAL = ['var(--gold)', 'var(--silver)', 'var(--bronze)'] as const;

/**
 * «Последние результаты турниров» — ADR-071, как у RTTF: карточка турнира
 * с тройкой призёров. Делённое третье — двумя строками с точкой бронзы.
 * Турнир без записанных мест не скрывается: он завершён, и это новость.
 *
 * Полная сетка — над итогами в разделе турниров; на главной — короткий
 * список `RecentResults`.
 */
export default function Podiums({
  items,
  wide = false,
}: {
  readonly items: readonly HomePodium[];
  /** Во всю ширину страницы — по четыре в ряд на компьютере. */
  readonly wide?: boolean;
}): ReactNode {
  return (
    <Box
      component="ul"
      data-home-podiums
      // На телефоне — ряд с прокруткой вбок и краешком следующей карточки:
      // столбик из шести карточек уводил ленту на три экрана вниз.
      sx={{
        ...railSx({ sm: 2, md: 2 }),
        gap: 1.5,
        gridTemplateColumns: {
          xs: 'none',
          sm: 'repeat(2, minmax(0, 1fr))',
          md: `repeat(${wide ? '3' : '2'}, minmax(0, 1fr))`,
          lg: `repeat(${wide ? '4' : '3'}, minmax(0, 1fr))`,
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

/**
 * «Последние результаты» коротко — левая колонка главной, под турнирами
 * (ADR-071, ADR-073): название, дата и победитель с точкой золота. Сетка
 * с призёрами — в итогах раздела турниров (`RESULTS_HREF`). Пусто — блока нет.
 */
export function RecentResults(): ReactNode {
  const t = useT();
  const locale = useLocale();
  const podiums = useQuery(homePodiumsQuery);
  const items = (podiums.data?.items ?? []).slice(0, SHORT);

  if (items.length === 0) return null;

  return (
    <Surface
      flush
      title={t('home.results.short')}
      action={
        <Link href={RESULTS_HREF} variant="body2" underline="hover" sx={{ whiteSpace: 'nowrap' }}>
          {t('home.results.all')}
        </Link>
      }
    >
      <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }} data-home-results>
        {items.map((podium) => {
          const winner = podium.places.find((place) => place.place === 1);

          return (
            <Box
              component="li"
              key={podium.tournamentId}
              sx={{
                display: 'grid',
                gap: 0.25,
                px: 2,
                py: 1,
                typography: 'body2',
                fontSize: 13,
                lineHeight: 1.35,
                borderTop: '1px solid var(--line)',
              }}
            >
              <Link
                href={`/tournaments/${podium.tournamentId}`}
                color="text.primary"
                underline="hover"
                noWrap
                sx={{ fontWeight: 600, fontSize: 14 }}
              >
                {podium.name}
              </Link>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                {winner === undefined ? (
                  <Box component="span" sx={{ flex: 1, color: 'text.secondary' }}>
                    {t('home.results.noPlaces')}
                  </Box>
                ) : (
                  <Box
                    component="span"
                    sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 0.75 }}
                  >
                    <Box
                      component="span"
                      aria-label={fill(t('home.results.place'), { place: '1' })}
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        flexShrink: 0,
                        bgcolor: MEDAL[0],
                      }}
                    />
                    <Link
                      href={`/players/${winner.playerId}`}
                      color="text.primary"
                      underline="hover"
                      noWrap
                    >
                      {winner.name}
                    </Link>
                  </Box>
                )}
                <Box
                  component="span"
                  sx={{
                    flexShrink: 0,
                    color: 'text.secondary',
                    fontSize: 12,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatDate(podium.startsAt, locale)}
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Surface>
  );
}
