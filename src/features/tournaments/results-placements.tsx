import type { RegistrationStatus, ResultParticipantView, TieGroupView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import PlayerAvatar from '@/common/ui/player-avatar';
import Surface from '@/common/ui/surface';
import { playerName } from '@/features/players/player-name';
import PlayerLink from '@/features/players/player-link';

import CoachNote from './coach-note';
import { PLACEMENT_REASON_KEYS, REGISTRATION_STATUS_KEYS } from './labels';
import Podium from './podium';
import ResultsTies from './results-ties';

interface ResultsPlacementsProps {
  readonly participants: readonly ResultParticipantView[];
  readonly shared: readonly TieGroupView[];
  readonly unresolved: readonly TieGroupView[];
  readonly names: ReadonlyMap<string, string>;
}

/**
 * Статусы, о которых зритель обязан узнать.
 *
 * Про остальные говорить нечего: «зарегистрирован» и «играет» ничего не
 * добавляют к строке с местом, а колонка, заполненная у всех, перестаёт
 * привлекать внимание там, где это нужно.
 */
/** Числа — одной ширины цифр, чтобы разряды стояли столбиком (раздел 6.1). */
const NUM = { fontVariantNumeric: 'tabular-nums' } as const;

/** Посев на телефоне не помещается: место и игрок важнее. */
const WIDE = { display: { xs: 'none', sm: 'table-cell' } } as const;

const NOTABLE: ReadonlySet<RegistrationStatus> = new Set<RegistrationStatus>([
  'WITHDRAWN',
  'NO_SHOW',
  'WAITLIST',
]);

/**
 * Итоговые места — ТЗ 9.4.
 *
 * Порядок строк задаёт сервер: занявшие места по возрастанию, затем прочие.
 * Пересортировка здесь означала бы второе понимание того, кто выше, — при
 * делёжке мест оно разойдётся с серверным (ADR-023).
 */
export default function ResultsPlacements({
  participants,
  shared,
  unresolved,
  names,
}: ResultsPlacementsProps): ReactNode {
  const t = useT();

  return (
    <Box sx={{ mt: 6 }}>
      <Surface title={t('results.places.title')} flush>
        <Podium participants={participants} />
        <Table size="small" stickyHeader={participants.length > 20} sx={{ mt: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell align="right" sx={{ width: 48 }}>
                {t('results.places.place')}
              </TableCell>
              <TableCell>{t('results.places.player')}</TableCell>
              <TableCell align="right" sx={WIDE}>
                {t('results.places.seed')}
              </TableCell>
              <TableCell sx={WIDE}>{t('results.places.note')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {participants.map((participant) => (
              <TableRow key={participant.player.id}>
                <TableCell align="right" sx={{ fontWeight: 600, ...NUM }}>
                  {participant.place ?? (
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
                      <PlayerLink id={participant.player.id}>
                        {playerName(participant.player)}
                      </PlayerLink>
                      <CoachNote coach={participant.coach} />
                      {/* На телефоне примечание — подписью под именем: третья
                          колонка мяла фамилии в две строки. */}
                      <Box
                        sx={{
                          display: { sm: 'none' },
                          typography: 'caption',
                          color: 'text.secondary',
                          fontWeight: 400,
                        }}
                      >
                        <Notes participant={participant} />
                      </Box>
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell align="right" sx={{ ...WIDE, ...NUM, color: 'text.secondary' }}>
                  {participant.seed ?? ''}
                </TableCell>
                <TableCell sx={{ ...WIDE, color: 'text.secondary' }}>
                  <Notes participant={participant} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Surface>

      <ResultsTies title={t('results.shared.title')} ties={shared} names={names} />
      <ResultsTies title={t('results.unresolved.title')} ties={unresolved} names={names} />
    </Box>
  );
}

function Notes({ participant }: { readonly participant: ResultParticipantView }): ReactNode {
  const t = useT();

  const notes = [
    participant.place === null ? t(PLACEMENT_REASON_KEYS[participant.reason]) : null,
    NOTABLE.has(participant.status) ? t(REGISTRATION_STATUS_KEYS[participant.status]) : null,
    participant.isRated ? null : t('results.notRated'),
  ].filter((note) => note !== null);

  return notes.join(' · ');
}
