import type { MatchView, ParticipantRatingView, StageView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { formatDelta, formatRating, useT } from '@/common/i18n';
import DeltaPill from '@/common/ui/delta-pill';
import RatingValue from '@/common/ui/rating-value';
import PlayerLink from '@/features/players/player-link';

import type { ResultsModel } from './results-model';

/** Числа — одной ширины цифр, чтобы разряды стояли столбиком (раздел 6.1). */
const NUM = { fontVariantNumeric: 'tabular-nums' } as const;

/** «До» и «после» на телефоне не помещаются: главное — изменение. */
const WIDE = { display: { xs: 'none', sm: 'table-cell' } } as const;

interface ResultsRatingsProps {
  readonly ratings: readonly ParticipantRatingView[];
  readonly stages: readonly StageView[];
  readonly model: ResultsModel;
}

/**
 * Изменения рейтинга участников — ТЗ 9.4 и ТЗ 7.3.
 *
 * Сверху — кто прибавил больше всех: это и смотрят после турнира. У каждого
 * — победы и поражения, а раскрытие показывает каждую встречу: соперника,
 * счёт и изменение за неё.
 *
 * Ни одно число рейтинга здесь не считается: `totalDelta` приходит от
 * сервера уже сложенным, а рейтинги — строками. Сложение строк через число с
 * плавающей точкой — ровно тот способ потерять сотую долю, ради которого
 * рейтинг и передаётся строкой (ADR-014). Порядок строк — только сравнение.
 *
 * `ratingAtStart` и `ratingAfter` не обязаны отличаться ровно на `totalDelta`:
 * дельта считается против снимка на старте, а применяется к текущей проекции,
 * и между ними мог лечь другой турнир (ADR-022).
 */
export default function ResultsRatings({ ratings, stages, model }: ResultsRatingsProps): ReactNode {
  const t = useT();

  if (ratings.length === 0) {
    return null;
  }

  const matches = new Map(
    stages.flatMap((stage) => stage.matches).map((match) => [match.id, match]),
  );
  const ordered = [...ratings].sort(
    (left, right) =>
      Number(left.ratingAfter === null) - Number(right.ratingAfter === null) ||
      Number(right.totalDelta) - Number(left.totalDelta),
  );

  return (
    <Box component="section" sx={{ mt: 6 }}>
      <Typography variant="h2">{t('results.ratings.title')}</Typography>

      <Table size="small" stickyHeader={ratings.length > 20} sx={{ mt: 2 }}>
        <TableHead>
          <TableRow>
            <TableCell>{t('results.ratings.player')}</TableCell>
            <TableCell align="right" sx={WIDE}>
              {t('results.col.record')}
            </TableCell>
            <TableCell align="right" sx={WIDE}>
              {t('results.ratings.before')}
            </TableCell>
            <TableCell align="right">{t('results.ratings.delta')}</TableCell>
            <TableCell align="right" sx={WIDE}>
              {t('results.ratings.after')}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {ordered.map((rating) => {
            const tally = model.tallies.get(rating.playerId);

            return (
              <TableRow key={rating.playerId} sx={{ verticalAlign: 'top' }}>
                <TableCell sx={{ fontWeight: 500 }}>
                  <PlayerLink id={rating.playerId}>
                    {model.names.get(rating.playerId) ?? rating.playerId}
                  </PlayerLink>
                  <Events rating={rating} matches={matches} model={model} />
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ ...WIDE, ...NUM, color: 'text.secondary', whiteSpace: 'nowrap' }}
                >
                  {tally === undefined ? '—' : `${String(tally.wins)}–${String(tally.losses)}`}
                </TableCell>
                <TableCell align="right" sx={{ ...WIDE, ...NUM, color: 'text.secondary' }}>
                  {rating.ratingAtStart === null ? (
                    '—'
                  ) : (
                    <RatingValue value={rating.ratingAtStart} />
                  )}
                </TableCell>
                <TableCell align="right" sx={{ ...NUM, fontWeight: 600 }}>
                  <DeltaPill value={rating.totalDelta} />
                </TableCell>
                <TableCell align="right" sx={{ ...WIDE, ...NUM, color: 'text.secondary' }}>
                  {rating.ratingAfter !== null ? (
                    <RatingValue value={rating.ratingAfter} />
                  ) : (
                    <Box component="span" sx={{ color: 'text.disabled' }}>
                      {t('results.ratings.pending')}
                    </Box>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
}

/**
 * Журнал по встречам — ТЗ 7.3.
 *
 * Свёрнут: разобрать спор по нему нужно редко, а развёрнутым он превращает
 * таблицу на двадцать участников в несколько экранов. Строка — соперник,
 * счёт глазами игрока и изменение за встречу.
 */
function Events({
  rating,
  matches,
  model,
}: {
  readonly rating: ParticipantRatingView;
  readonly matches: ReadonlyMap<string, MatchView>;
  readonly model: ResultsModel;
}): ReactNode {
  const t = useT();

  if (rating.events.length === 0) {
    return null;
  }

  return (
    // Родное раскрытие: работает с клавиатуры и у чтеца экрана без
    // единой строки кода, а в строке таблицы ему не нужно ничего больше.
    <Box component="details" sx={{ mt: 0.5, fontWeight: 400 }}>
      <Box
        component="summary"
        sx={{
          cursor: 'pointer',
          typography: 'caption',
          color: 'text.secondary',
          py: { xs: 1, sm: 0.5 },
        }}
      >
        {t('results.ratings.events')}
      </Box>
      <Box
        component="ol"
        sx={{ m: 0, mt: 0.5, pl: 2.5, typography: 'caption', color: 'text.secondary', ...NUM }}
      >
        {rating.events.map((event, index) => {
          const match = event.matchId === null ? undefined : matches.get(event.matchId);
          const mineA = match?.playerAId === rating.playerId;
          const opponent = match === undefined ? null : mineA ? match.playerBId : match.playerAId;
          const value = Number(event.delta);
          const sets =
            match?.setsA == null || match.setsB === null
              ? null
              : mineA
                ? `${String(match.setsA)}:${String(match.setsB)}`
                : `${String(match.setsB)}:${String(match.setsA)}`;

          return (
            <li key={event.matchId ?? index}>
              {opponent !== null && (
                <>
                  {t('results.ratings.vs')}{' '}
                  <PlayerLink id={opponent}>{model.names.get(opponent) ?? ''}</PlayerLink>{' '}
                  {sets !== null && (
                    <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {sets}
                    </Box>
                  )}{' '}
                  ·{' '}
                </>
              )}
              {formatRating(event.ratingBefore)}{' '}
              <Box
                component="span"
                sx={{ color: value > 0 ? 'var(--ok)' : value < 0 ? 'var(--red-600)' : 'inherit' }}
              >
                {formatDelta(event.delta)}
              </Box>{' '}
              = {formatRating(event.ratingAfter)}
            </li>
          );
        })}
      </Box>
    </Box>
  );
}
