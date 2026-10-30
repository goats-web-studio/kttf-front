import type {
  ParticipantRatingView,
  ResultParticipantView,
  TournamentResultsView,
} from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Trophy } from 'lucide-react';
import type { ReactNode } from 'react';

import { formatDelta, formatRating, useT } from '@/common/i18n';

import FitName from './fit-name';
import { BOARD_TITLE, DISPLAY, TYPE, size } from './scale';
import { PLACES_COLUMNS, PLACES_PER_COLUMN } from './slides';
import { placeLabels } from './wall-model';

/**
 * Стена после турнира — ТЗ 6.5, ADR-082.
 *
 * Пока турнир идёт, стена отвечает на «кто где играет». Когда он закрыт, тот же
 * экран отвечает на «кто победил»: призёры строкой сверху, под ними места с
 * рейтингом после турнира и прибавкой. Отдельного слайда «Изменения рейтинга»
 * больше нет: дельта стоит в строке игрока. Места приходят от сервера
 * (ADR-023) — ни одно из них здесь не считается.
 */

/** Призовые места: цвета медалей — те же токены, что у пьедестала на сайте. */
const MEDALS = {
  1: { fill: 'var(--gold)', tint: 'var(--gold-50)', text: 'var(--gold-text)' },
  2: { fill: 'var(--silver)', tint: 'var(--silver-50)', text: 'var(--silver-text)' },
  3: { fill: 'var(--bronze)', tint: 'var(--bronze-50)', text: 'var(--bronze-text)' },
} as const;

type Medal = keyof typeof MEDALS;

function isMedal(place: number | null): place is Medal {
  return place === 1 || place === 2 || place === 3;
}

function nameOf(participant: ResultParticipantView): string {
  return `${participant.player.lastName} ${participant.player.firstName}`;
}

function deltaTone(delta: string): string {
  const value = Number(delta);

  return value > 0 ? 'var(--ok-text)' : value < 0 ? 'var(--red-700)' : 'text.secondary';
}

/** Призёры одной строкой: место, имя, рейтинг после и прибавка. */
function PodiumRow({
  participants,
  ratings,
}: {
  readonly participants: readonly ResultParticipantView[];
  readonly ratings: ReadonlyMap<string, ParticipantRatingView>;
}): ReactNode {
  const t = useT();
  const medalists = participants.filter((participant) => isMedal(participant.place));

  return (
    <Box component="section" aria-label={t('screen.podium.title')}>
      <Typography component="h2" sx={{ ...BOARD_TITLE, mb: '12px' }}>
        {t('screen.podium.title')}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          // Без матча за 3-е место бронзовых двое — четыре карточки в ряд.
          gridTemplateColumns: `repeat(${String(Math.max(3, medalists.length))}, minmax(0, 1fr))`,
          gap: '16px',
        }}
      >
        {medalists.map((participant) => {
          const medal = MEDALS[participant.place as Medal];
          const rating = ratings.get(participant.player.id);

          return (
            <Box
              key={participant.player.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: '64px minmax(0, 1fr) auto',
                alignItems: 'center',
                gap: '16px',
                px: '20px',
                height: 104,
                borderRadius: '12px',
                borderTop: `6px solid ${medal.fill}`,
                bgcolor: medal.tint,
              }}
            >
              <Box
                component="span"
                sx={{
                  fontFamily: DISPLAY,
                  fontWeight: 700,
                  fontSize: 56,
                  lineHeight: 1,
                  color: medal.text,
                  textAlign: 'center',
                }}
              >
                {participant.place}
              </Box>
              <Box
                component="span"
                sx={{ minWidth: 0, fontSize: TYPE.l, fontWeight: 700, lineHeight: 1.15 }}
              >
                <FitName text={nameOf(participant)} width={360} font={TYPE.l} />
              </Box>
              {rating?.ratingAfter != null && (
                <Box sx={{ textAlign: 'right', fontFamily: DISPLAY, lineHeight: 1.25 }}>
                  <Box sx={{ fontSize: TYPE.m, fontWeight: 700 }}>
                    {formatRating(rating.ratingAfter)}
                  </Box>
                  <Box
                    sx={{ fontSize: TYPE.s, fontWeight: 700, color: deltaTone(rating.totalDelta) }}
                  >
                    {formatDelta(rating.totalDelta)}
                  </Box>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

/**
 * Слайд «Итоги»: призёры и места тремя колонками по 14 строк.
 *
 * Рейтинг — после турнира, целым (ADR-053); «±» — за турнир, два знака и
 * настоящий минус (`formatDelta`). Пока рейтинг не начислен, колонки пусты.
 */
export function ResultsSlide({
  results,
  participants,
  page,
  pages,
}: {
  readonly results: TournamentResultsView;
  readonly participants: readonly ResultParticipantView[];
  readonly page: number;
  readonly pages: number;
}): ReactNode {
  const t = useT();
  const ratings = new Map(results.ratings.map((rating) => [rating.playerId, rating]));
  const places = placeLabels(results);
  const columns = Array.from({ length: PLACES_COLUMNS }, (_unused, index) =>
    participants.slice(index * PLACES_PER_COLUMN, (index + 1) * PLACES_PER_COLUMN),
  ).filter((column) => column.length > 0);
  const best = [...results.ratings]
    .filter((rating) => rating.ratingAfter !== null)
    .sort((left, right) => Number(right.totalDelta) - Number(left.totalDelta))[0];
  const bestName =
    best === undefined
      ? undefined
      : results.participants.find((item) => item.player.id === best.playerId);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <PodiumRow participants={results.participants} ratings={ratings} />

      <Box component="section" aria-label={t('screen.places.title')} sx={{ minHeight: 0 }}>
        {/* Подпись рядом с заголовком, а не внутри: имя заголовка — «Итоговые места». */}
        <Box sx={{ ...BOARD_TITLE, alignItems: 'baseline' }}>
          <Typography component="h2" sx={{ font: 'inherit' }}>
            {t('screen.places.title')}
          </Typography>
          <Box
            component="span"
            sx={{ fontSize: TYPE.xs, fontWeight: 500, color: 'text.secondary' }}
          >
            {best !== undefined && bestName !== undefined && Number(best.totalDelta) > 0 && (
              <>
                {t('screen.places.best')}{' '}
                <Box component="b" sx={{ color: 'text.primary' }}>
                  {nameOf(bestName)}
                </Box>{' '}
                <Box component="b" sx={{ fontFamily: DISPLAY, color: 'var(--ok-text)' }}>
                  {formatDelta(best.totalDelta)}
                </Box>
                {' · '}
              </>
            )}
            {pages > 1
              ? `${t('screen.places.legend')} · ${String(page)}/${String(pages)}`
              : t('screen.places.legend')}
          </Box>
        </Box>

        <Box
          sx={{
            mt: '8px',
            display: 'grid',
            gridTemplateColumns: `repeat(${String(PLACES_COLUMNS)}, minmax(0, 1fr))`,
            gap: '0 24px',
          }}
        >
          {columns.map((column, index) => (
            <Box key={index} component="ol" sx={{ m: 0, p: 0, listStyle: 'none' }}>
              <Box
                component="li"
                aria-hidden
                sx={{
                  ...ROW,
                  height: 30,
                  fontSize: 15,
                  color: 'text.secondary',
                  borderColor: 'var(--line-strong)',
                }}
              >
                <span>{t('screen.standings.place')}</span>
                <span>{t('screen.standings.player')}</span>
                <Box component="span" sx={{ textAlign: 'right' }}>
                  {t('screen.places.rating')}
                </Box>
                <Box component="span" sx={{ textAlign: 'right' }}>
                  ±
                </Box>
              </Box>
              {column.map((participant) => {
                const rating = ratings.get(participant.player.id);
                const medal = isMedal(participant.place) ? MEDALS[participant.place] : null;

                return (
                  <Box key={participant.player.id} component="li" sx={ROW}>
                    <Box
                      component="span"
                      sx={{
                        fontFamily: DISPLAY,
                        fontWeight: 700,
                        color: medal?.text ?? 'text.secondary',
                      }}
                    >
                      {places.get(participant.player.id) ?? '—'}
                    </Box>
                    <Box
                      component="span"
                      sx={{ minWidth: 0, fontWeight: medal === null ? 400 : 700 }}
                    >
                      <FitName text={nameOf(participant)} width={330} font={TYPE.s} />
                    </Box>
                    <Box
                      component="span"
                      sx={{ fontFamily: DISPLAY, textAlign: 'right', color: 'text.secondary' }}
                    >
                      {rating?.ratingAfter == null ? '' : formatRating(rating.ratingAfter)}
                    </Box>
                    <Box
                      component="span"
                      sx={{
                        fontFamily: DISPLAY,
                        fontWeight: 700,
                        textAlign: 'right',
                        color:
                          rating === undefined ? 'text.secondary' : deltaTone(rating.totalDelta),
                      }}
                    >
                      {rating?.ratingAfter == null ? '' : formatDelta(rating.totalDelta)}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

const ROW = {
  display: 'grid',
  gridTemplateColumns: '72px minmax(0, 1fr) 64px 100px',
  alignItems: 'center',
  gap: '12px',
  px: '8px',
  height: 42,
  borderBottom: 1,
  borderColor: 'divider',
  fontSize: TYPE.s,
  fontVariantNumeric: 'tabular-nums',
} as const;

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
        position: 'absolute',
        inset: 0,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        px: '80px',
        textAlign: 'center',
        bgcolor: 'background.default',
        animation: 'kttf-splash 600ms ease-out',
        '@keyframes kttf-splash': { from: { opacity: 0 }, to: { opacity: 1 } },
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      <Box sx={{ color: 'var(--gold)', width: size(6), height: size(6) }}>
        <Trophy width="100%" height="100%" aria-hidden />
      </Box>
      <Typography component="p" sx={{ fontSize: 80, fontWeight: 700, lineHeight: 1.1 }}>
        {t('screen.finished')}
      </Typography>
      <Typography component="p" color="text.secondary" sx={{ fontSize: 34 }}>
        {name}
      </Typography>
      {winner !== undefined && (
        <Typography component="p" sx={{ mt: '24px', fontSize: 46, lineHeight: 1.2 }}>
          {t('screen.winner')}{' '}
          <Box component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>
            {nameOf(winner)}
          </Box>
        </Typography>
      )}
    </Box>
  );
}
