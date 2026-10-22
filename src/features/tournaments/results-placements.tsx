import type { RegistrationStatus, ResultParticipantView, TieGroupView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import type { ReactNode } from 'react';

import { fill, useT, type MessageKey } from '@/common/i18n';
import { roundName } from '@/common/ui/bracket-model';
import DeltaPill from '@/common/ui/delta-pill';
import PlayerAvatar from '@/common/ui/player-avatar';
import RatingValue from '@/common/ui/rating-value';
import Surface from '@/common/ui/surface';
import { playerName } from '@/features/players/player-name';
import PlayerLink from '@/features/players/player-link';

import CoachNote from './coach-note';
import { PLACEMENT_REASON_KEYS, REGISTRATION_STATUS_KEYS } from './labels';
import Podium from './podium';
import { orderPlacements, placeLabel, type Finish, type ResultsModel } from './results-model';
import ResultsTies from './results-ties';

interface ResultsPlacementsProps {
  readonly participants: readonly ResultParticipantView[];
  readonly shared: readonly TieGroupView[];
  readonly unresolved: readonly TieGroupView[];
  readonly model: ResultsModel;
}

/** Числа — одной ширины цифр, чтобы разряды стояли столбиком (раздел 6.1). */
const NUM = { fontVariantNumeric: 'tabular-nums' } as const;

/** На телефоне — только место, игрок и изменение: остальное под именем. */
const WIDE = { display: { xs: 'none', md: 'table-cell' } } as const;

/**
 * Статусы, о которых зритель обязан узнать.
 *
 * Про остальные говорить нечего: «зарегистрирован» и «играет» ничего не
 * добавляют к строке с местом, а колонка, заполненная у всех, перестаёт
 * привлекать внимание там, где это нужно.
 */
const NOTABLE: ReadonlySet<RegistrationStatus> = new Set<RegistrationStatus>([
  'WITHDRAWN',
  'NO_SHOW',
  'WAITLIST',
]);

/**
 * Итоговые места — ТЗ 9.4.
 *
 * Строка — итог человека на турнире целиком: место (у делящих — диапазон),
 * рейтинг до и после с изменением, победы и поражения, сеты и где он
 * закончил: финал, полуфинал, группа с местом в ней.
 *
 * Порядок занявших места задаёт сервер (ADR-023). Остальные выстроены так,
 * чтобы их можно было прочесть: делящие — по началу диапазона, выбывшие из
 * групп — по месту в группе.
 */
export default function ResultsPlacements({
  participants,
  shared,
  unresolved,
  model,
}: ResultsPlacementsProps): ReactNode {
  const t = useT();
  const rows = orderPlacements(participants, shared, model.finishes);

  return (
    <Box sx={{ mt: 6 }}>
      <Surface title={t('results.places.title')} flush>
        <Podium participants={participants} />
        <TableContainer sx={{ mt: 2 }}>
          <Table size="small" stickyHeader={participants.length > 20}>
            <TableHead>
              <TableRow>
                <TableCell align="right" sx={{ width: 56 }}>
                  {t('results.places.place')}
                </TableCell>
                <TableCell>{t('results.places.player')}</TableCell>
                <TableCell align="right" sx={WIDE}>
                  {t('results.ratings.before')}
                </TableCell>
                <TableCell align="right">{t('results.col.delta')}</TableCell>
                <TableCell align="right" sx={WIDE}>
                  {t('results.ratings.after')}
                </TableCell>
                <TableCell align="right" sx={WIDE}>
                  {t('results.col.record')}
                </TableCell>
                <TableCell align="right" sx={WIDE}>
                  {t('standings.sets')}
                </TableCell>
                <TableCell sx={WIDE}>{t('results.col.finish')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((participant) => (
                <Row
                  key={participant.player.id}
                  participant={participant}
                  shared={shared}
                  model={model}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Surface>

      <ResultsTies title={t('results.shared.title')} ties={shared} names={model.names} />
      <ResultsTies title={t('results.unresolved.title')} ties={unresolved} names={model.names} />
    </Box>
  );
}

function Row({
  participant,
  shared,
  model,
}: {
  readonly participant: ResultParticipantView;
  readonly shared: readonly TieGroupView[];
  readonly model: ResultsModel;
}): ReactNode {
  const t = useT();
  const id = participant.player.id;
  const place = placeLabel(participant, shared);
  const rating = model.rating.get(id);
  const tally = model.tallies.get(id);
  const finish = finishLabel(model.finishes.get(id), t);
  const end = model.finishes.get(id);
  // Выбывший из группы с известным местом в ней объяснён колонкой «где
  // закончил»; без места — словами (ADR-023: выбыл, а не «не определено»).
  const notes = notesOf(participant, end?.kind === 'GROUP' && end.place !== null, t);

  return (
    <TableRow>
      <TableCell align="right" sx={{ fontWeight: 700, ...NUM, whiteSpace: 'nowrap' }}>
        {place ?? (
          <Box component="span" sx={{ color: 'text.disabled' }}>
            —
          </Box>
        )}
      </TableCell>
      <TableCell sx={{ fontWeight: 500 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <PlayerAvatar
            lastName={participant.player.lastName}
            firstName={participant.player.firstName}
            photoUrl={participant.player.photoUrl}
            size="sm"
          />
          <Box sx={{ minWidth: 0 }}>
            <PlayerLink id={id}>{playerName(participant.player)}</PlayerLink>
            <CoachNote coach={participant.coach} />
            {/* На телефоне колонки «где закончил», счёта и рейтинга нет —
                они подписью под именем. */}
            <Box
              sx={{
                display: { md: 'none' },
                typography: 'caption',
                color: 'text.secondary',
                fontWeight: 400,
                ...NUM,
              }}
            >
              {[
                model.ratings.has(id)
                  ? `★${String(Math.round(Number(model.ratings.get(id))))}`
                  : null,
                tally === undefined
                  ? null
                  : fill(t('results.col.recordShort'), {
                      wins: String(tally.wins),
                      losses: String(tally.losses),
                    }),
                finish,
                ...notes,
              ]
                .filter((part) => part !== null)
                .join(' · ')}
            </Box>
            {notes.length > 0 && (
              <Box
                sx={{
                  display: { xs: 'none', md: 'block' },
                  typography: 'caption',
                  color: 'text.secondary',
                  fontWeight: 400,
                }}
              >
                {notes.join(' · ')}
              </Box>
            )}
          </Box>
        </Stack>
      </TableCell>
      <TableCell align="right" sx={{ ...WIDE, ...NUM, color: 'text.secondary' }}>
        {model.ratings.has(id) ? <RatingValue value={model.ratings.get(id) ?? ''} /> : '—'}
      </TableCell>
      <TableCell align="right" sx={NUM}>
        {rating?.ratingAfter == null ? (
          <Box component="span" sx={{ color: 'text.disabled' }}>
            —
          </Box>
        ) : (
          <DeltaPill value={rating.totalDelta} />
        )}
      </TableCell>
      <TableCell align="right" sx={{ ...WIDE, ...NUM, color: 'text.secondary' }}>
        {rating?.ratingAfter == null ? '—' : <RatingValue value={rating.ratingAfter} />}
      </TableCell>
      <TableCell align="right" sx={{ ...WIDE, ...NUM, whiteSpace: 'nowrap' }}>
        {tally === undefined ? '—' : `${String(tally.wins)}–${String(tally.losses)}`}
      </TableCell>
      <TableCell
        align="right"
        sx={{ ...WIDE, ...NUM, whiteSpace: 'nowrap', color: 'text.secondary' }}
      >
        {tally === undefined ? '—' : `${String(tally.setsWon)}:${String(tally.setsLost)}`}
      </TableCell>
      <TableCell sx={{ ...WIDE, color: 'text.secondary' }}>{finish ?? ''}</TableCell>
    </TableRow>
  );
}

/** Где закончил: «Победитель», «Финал», «1/4 финала», «гр. 2 · 3-е место». */
function finishLabel(finish: Finish | undefined, t: (key: MessageKey) => string): string | null {
  if (finish === undefined) return null;

  switch (finish.kind) {
    case 'CHAMPION':
      return t('results.finish.champion');
    case 'THIRD_PLACE':
      return t('results.bracket.thirdPlace');
    case 'BRACKET': {
      const round = roundName(finish.fromFinal, t);
      return finish.consolation ? `${t('stage.type.CONSOLATION')} · ${round}` : round;
    }
    case 'GROUP':
      return finish.place === null
        ? finish.label
        : fill(t('results.finish.group'), { group: finish.label, place: String(finish.place) });
  }
}

/** Повод отсутствия места и особый статус: снялся, не явился, вне зачёта. */
function notesOf(
  participant: ResultParticipantView,
  groupPlaceShown: boolean,
  t: (key: MessageKey) => string,
): string[] {
  return [
    participant.place === null &&
    participant.reason !== 'SHARED' &&
    !(participant.reason === 'GROUP_EXIT' && groupPlaceShown)
      ? t(PLACEMENT_REASON_KEYS[participant.reason])
      : null,
    NOTABLE.has(participant.status) ? t(REGISTRATION_STATUS_KEYS[participant.status]) : null,
    participant.isRated ? null : t('results.notRated'),
  ].filter((note) => note !== null);
}
