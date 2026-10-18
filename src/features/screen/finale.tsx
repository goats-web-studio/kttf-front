import type { ParticipantRatingView, ResultParticipantView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Trophy } from 'lucide-react';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

import { BOARD_TITLE, DISPLAY, size } from './scale';

/**
 * Стена после турнира — ТЗ 6.5.
 *
 * Пока турнир идёт, стена отвечает на «кто где играет». Когда он закрыт, тот же
 * экран в зале отвечает на «кто победил»: пьедестал, итоговые места и рост
 * рейтинга. Места приходят от сервера (ADR-023) — ни одно из них здесь не
 * считается.
 */

/** Призовые места: цвета медалей — те же токены, что у пьедестала на сайте. */
const MEDALS = {
  1: { fill: 'var(--gold)', tint: 'var(--gold-50)', text: 'var(--gold-text)', height: '36vh' },
  2: {
    fill: 'var(--silver)',
    tint: 'var(--silver-50)',
    text: 'var(--silver-text)',
    height: '27vh',
  },
  3: {
    fill: 'var(--bronze)',
    tint: 'var(--bronze-50)',
    text: 'var(--bronze-text)',
    height: '20vh',
  },
} as const;

type Medal = keyof typeof MEDALS;

/** Порядок на пьедестале — 2, 1, 3: победитель в центре и выше всех. */
const ORDER: readonly Medal[] = [2, 1, 3];

function isMedal(place: number | null): place is Medal {
  return place === 1 || place === 2 || place === 3;
}

function nameOf(participant: ResultParticipantView): string {
  return `${participant.player.lastName} ${participant.player.firstName}`;
}

/**
 * Пьедестал во всю левую колонку стены.
 *
 * Третье место может делиться: без матча за третье оба проигравших в
 * полуфиналах стоят на одной ступени.
 */
export function PodiumBoard({
  participants,
}: {
  readonly participants: readonly ResultParticipantView[];
}): ReactNode {
  const t = useT();
  const places = new Map<Medal, ResultParticipantView[]>();

  for (const participant of participants) {
    if (isMedal(participant.place)) {
      places.set(participant.place, [...(places.get(participant.place) ?? []), participant]);
    }
  }

  return (
    <Box
      component="section"
      aria-label={t('screen.podium.title')}
      sx={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}
    >
      <Typography component="h2" sx={BOARD_TITLE}>
        {t('screen.podium.title')}
      </Typography>
      <Box
        sx={{
          mt: '1vh',
          flexGrow: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          alignItems: 'end',
          gap: '0.8vw',
        }}
      >
        {ORDER.map((medal) => {
          const winners = places.get(medal) ?? [];
          const style = MEDALS[medal];

          return (
            <Box key={medal} sx={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              {winners.map((participant) => (
                <Typography
                  key={participant.player.id}
                  component="p"
                  sx={{
                    mb: '1vh',
                    textAlign: 'center',
                    fontSize: size(medal === 1 ? 1.35 : 1.1),
                    fontWeight: medal === 1 ? 700 : 600,
                    lineHeight: 1.2,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {nameOf(participant)}
                </Typography>
              ))}
              <Box
                sx={{
                  height: winners.length === 0 ? '3vh' : style.height,
                  borderRadius: '1vw 1vw 0 0',
                  bgcolor: style.tint,
                  borderTop: `0.6vh solid ${style.fill}`,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                {winners.length > 0 && (
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: DISPLAY,
                      fontWeight: 700,
                      fontSize: size(medal === 1 ? 4 : 3),
                      lineHeight: 1,
                      color: style.text,
                    }}
                  >
                    {medal}
                  </Typography>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

/** Строк в колонке итоговых мест; на странице — две колонки. */
export const PLACES_PER_COLUMN = 10;

/**
 * Итоговые места — двумя колонками, чтобы двадцать фамилий читались без
 * прокрутки. Порядок задаёт сервер: занявшие места по возрастанию.
 */
export function PlacesBoard({
  participants,
}: {
  readonly participants: readonly ResultParticipantView[];
}): ReactNode {
  const columns = [
    participants.slice(0, PLACES_PER_COLUMN),
    participants.slice(PLACES_PER_COLUMN, PLACES_PER_COLUMN * 2),
  ];

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.4vw' }}>
      {columns.map((column, index) => (
        <Box key={index} component="ol" sx={{ m: 0, p: 0, listStyle: 'none', alignSelf: 'start' }}>
          {column.map((participant) => {
            const medal = isMedal(participant.place) ? MEDALS[participant.place] : null;

            return (
              <Box
                key={participant.player.id}
                component="li"
                sx={{
                  display: 'grid',
                  gridTemplateColumns: `${size(2.6)} minmax(0, 1fr)`,
                  alignItems: 'center',
                  gap: '0.8vw',
                  px: '0.8vw',
                  py: '0.7vh',
                  mb: '0.6vh',
                  borderRadius: 3,
                  border: 1,
                  borderColor: 'divider',
                  bgcolor: medal?.tint ?? 'background.paper',
                }}
              >
                <Typography
                  component="span"
                  sx={{
                    fontFamily: DISPLAY,
                    fontWeight: 700,
                    fontSize: size(1.3),
                    textAlign: 'center',
                    color: medal?.text ?? 'text.primary',
                  }}
                >
                  {participant.place ?? '—'}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontSize: size(1.2),
                    fontWeight: medal === null ? 500 : 700,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {nameOf(participant)}
                </Typography>
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}

/** Сколько строк рейтинга показывает стена. */
export const RATINGS_SHOWN = 10;

/**
 * Изменения рейтинга за турнир, сверху — выросшие сильнее всех: о них говорят
 * у стены после призёров.
 *
 * Строки уже отобраны и упорядочены вызывающим. Числа — строками от сервера
 * (ADR-014): здесь только знак плюса перед ростом.
 */
export function RatingsBoard({
  ratings,
  names,
}: {
  readonly ratings: readonly ParticipantRatingView[];
  readonly names: ReadonlyMap<string, string>;
}): ReactNode {
  return (
    <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none' }}>
      {ratings.map((rating) => {
        const grew = !rating.totalDelta.startsWith('-') && Number(rating.totalDelta) !== 0;

        return (
          <Box
            key={rating.playerId}
            component="li"
            sx={{
              display: 'grid',
              gridTemplateColumns: `minmax(0, 1fr) ${size(6)} ${size(6)}`,
              alignItems: 'center',
              gap: '1vw',
              px: '0.8vw',
              py: '0.7vh',
              mb: '0.6vh',
              borderRadius: 3,
              border: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Typography
              component="span"
              sx={{
                fontSize: size(1.2),
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {names.get(rating.playerId) ?? ''}
            </Typography>
            <Typography
              component="span"
              sx={{
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: size(1.3),
                textAlign: 'right',
                color: grew ? 'success.main' : 'text.secondary',
              }}
            >
              {grew ? `+${rating.totalDelta}` : rating.totalDelta}
            </Typography>
            <Typography
              component="span"
              sx={{
                fontFamily: DISPLAY,
                fontSize: size(1.1),
                textAlign: 'right',
                color: 'text.secondary',
              }}
            >
              {rating.ratingAfter}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

/**
 * Заставка в момент закрытия турнира.
 *
 * Зал узнаёт о конце турнира со стены, а не от судьи с микрофоном: экран,
 * который просто перестал меняться, выглядит зависшим. Заставка висит
 * несколько секунд и уступает место итогам; гасит её вызывающий.
 */
export function FinishedSplash({
  name,
  participants,
}: {
  readonly name: string;
  /** Итоги, если уже пришли: заставка называет победителя. */
  readonly participants: readonly ResultParticipantView[] | undefined;
}): ReactNode {
  const t = useT();
  const winner = participants?.find((participant) => participant.place === 1);

  return (
    <Box
      role="status"
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2vh',
        px: '4vw',
        textAlign: 'center',
        bgcolor: 'background.default',
        animation: 'kttf-splash 600ms ease-out',
        '@keyframes kttf-splash': { from: { opacity: 0 }, to: { opacity: 1 } },
      }}
    >
      <Box sx={{ color: 'var(--gold)', width: size(6), height: size(6) }}>
        <Trophy width="100%" height="100%" aria-hidden />
      </Box>
      <Typography component="p" sx={{ fontSize: size(4.2), fontWeight: 700, lineHeight: 1.1 }}>
        {t('screen.finished')}
      </Typography>
      <Typography component="p" color="text.secondary" sx={{ fontSize: size(1.8) }}>
        {name}
      </Typography>
      {winner !== undefined && (
        <Typography component="p" sx={{ mt: '2vh', fontSize: size(2.4), lineHeight: 1.2 }}>
          {t('screen.winner')}{' '}
          <Box component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>
            {nameOf(winner)}
          </Box>
        </Typography>
      )}
    </Box>
  );
}
