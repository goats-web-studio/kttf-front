import { clubImageVariant, type ClubListItemView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import CardActionArea from '@mui/material/CardActionArea';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { fill, formatDate, useLocale, useT } from '@/common/i18n';
import { GRAIN } from '@/common/ui/atmosphere';
import TableArt from '@/common/ui/table-art';
import { Reveal } from '@/common/ui/motion';
import ClubMark from '@/features/clubs/club-mark';
import OpenStatus from '@/features/clubs/open-status';
import { usePlaceName } from '@/features/places/place-name';

import { railSx } from './rail';

/**
 * Клубы на главной — карточками с обложкой, а не строками каталога: здесь
 * клуб продаёт себя картинкой зала (`docs/09`, страница клуба — канал
 * продаж).
 *
 * Порядок — порядок каталога: ближайший турнир, потом свежесть страницы.
 * Это и есть «популярные», пока нет платного продвижения: место в этом
 * ряду потом станет продаваемым (бэклог рекламы, `05-state` 5).
 */
export default function PopularClubs({
  clubs,
}: {
  readonly clubs: readonly ClubListItemView[];
}): ReactNode {
  return (
    <Box component="ul" sx={railSx({ sm: 2, md: 3 })}>
      {clubs.map((club, index) => (
        <Reveal component="li" key={club.id} delay={index * 60}>
          <ClubTile club={club} />
        </Reveal>
      ))}
    </Box>
  );
}

function ClubTile({ club }: { readonly club: ClubListItemView }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const placeName = usePlaceName();
  const titleId = `home-club-${club.id}`;

  return (
    <Paper variant="outlined" component="article" sx={{ height: '100%', overflow: 'hidden' }}>
      <CardActionArea
        href={`/clubs/${club.id}`}
        aria-labelledby={titleId}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
          '&:hover .club-cover img': { transform: 'scale(1.03)' },
        }}
      >
        <Box
          className="club-cover"
          sx={{
            position: 'relative',
            aspectRatio: '16 / 9',
            overflow: 'hidden',
            // Без обложки — фирменная тёплая подложка с зерном и столом, а не
            // серый прямоугольник «нет фото».
            bgcolor: 'var(--red-50)',
            backgroundImage: `radial-gradient(ellipse 80% 90% at 80% 0%, var(--red-100) 0, transparent 70%), ${GRAIN}`,
            backgroundBlendMode: 'normal, soft-light',
          }}
        >
          {club.coverUrl === null && (
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                inset: '8% 18% 14%',
                '& svg': { width: '100%', height: '100%' },
              }}
            >
              <TableArt line="var(--red-200)" net="var(--red-200)" />
            </Box>
          )}
          {club.coverUrl !== null && (
            <Box
              component="img"
              src={clubImageVariant(club.coverUrl, 960)}
              alt=""
              loading="lazy"
              decoding="async"
              width={960}
              height={540}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                transition: 'transform var(--dur-slow) var(--ease)',
              }}
            />
          )}
          {club.nextTournamentAt !== null && (
            <Box
              component="span"
              sx={{
                position: 'absolute',
                top: 12,
                left: 12,
                px: 1.25,
                height: 26,
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                bgcolor: 'var(--paper)',
                color: 'var(--red-700)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              {fill(t('clubs.card.next'), { date: formatDate(club.nextTournamentAt, locale) })}
            </Box>
          )}
        </Box>
        <Box sx={{ p: 2.5, pt: 0, display: 'flex', flexDirection: 'column', flex: 1 }}>
          <Box
            sx={{
              mt: -3.5,
              mb: 1.5,
              width: 'fit-content',
              borderRadius: '30%',
              border: '3px solid var(--paper)',
              position: 'relative',
            }}
          >
            <ClubMark club={club} size={52} />
          </Box>
          <Typography id={titleId} variant="h3" component="h3">
            {club.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {placeName(club.city)}
            {' · '}
            <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {fill(t('club.tables'), { count: String(club.tableCount) })}
            </Box>
            {club.coachesCount > 0 &&
              ` · ${fill(t('clubs.card.coaches'), { count: String(club.coachesCount) })}`}
          </Typography>
          <Box sx={{ mt: 'auto', pt: 1.5 }}>
            <OpenStatus hours={club.hours} short />
          </Box>
        </Box>
      </CardActionArea>
    </Paper>
  );
}
