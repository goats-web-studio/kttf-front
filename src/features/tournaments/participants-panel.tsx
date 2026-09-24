import type { RegistrationView, TournamentView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT } from '@/common/i18n';
import { useSessionStore } from '@/features/auth/session-store';
import { isClubStaff } from '@/features/clubs/roles';
import { playerName } from '@/features/players/player-name';

import AddParticipant from './add-participant';
import { removeRegistration, updateRegistration } from './api';
import { REGISTRATION_STATUS_KEYS } from './labels';
import { tournamentKeys } from './queries';

/** Числа — одной ширины цифр, чтобы разряды стояли столбиком (раздел 6.1). */
const NUM = { fontVariantNumeric: 'tabular-nums' } as const;

/** Действие в строке: на телефоне — зона нажатия 44px (раздел 9). */
const ROW_ACTION = { minHeight: { xs: 44, sm: 32 } } as const;

interface ParticipantsPanelProps {
  readonly tournament: TournamentView;
  readonly registrations: readonly RegistrationView[];
}

/**
 * Состав участников — ТЗ 4.3 и 4.4.
 *
 * Список открыт всем: кто заявился на турнир — такой же спортивный факт, как
 * и результаты. Органы управления показываются владельцу и организатору
 * клуба-хозяина (ADR-014); право всё равно проверяет сервер.
 *
 * Порядок задаёт сервер — посев, затем время записи. Пересортировывать на
 * клиенте нечего: посев и есть тот порядок, в котором участники войдут в
 * жеребьёвку.
 */
export default function ParticipantsPanel({
  tournament,
  registrations,
}: ParticipantsPanelProps): ReactNode {
  const t = useT();
  const user = useSessionStore((state) => state.user);
  const isStaff = isClubStaff(user, tournament.clubId);

  if (registrations.length === 0 && !isStaff) {
    return null;
  }

  return (
    <Box component="section" sx={{ mt: 5 }}>
      <Typography variant="h2">
        {t('participants.title')}{' '}
        <Typography
          component="span"
          variant="h2"
          color="text.secondary"
          sx={{ fontWeight: 400, ...NUM }}
        >
          {registrations.length}
        </Typography>
      </Typography>

      {isStaff && <AddParticipant tournament={tournament} registrations={registrations} />}

      {registrations.length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          {t('participants.empty')}
        </Typography>
      ) : (
        // Органы управления шире телефона: таблица прокручивается вбок
        // целиком, а не сминает имена.
        <TableContainer sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell align="right" sx={{ width: 48 }}>
                  {t('participants.seed')}
                </TableCell>
                <TableCell>{t('participants.player')}</TableCell>
                <TableCell align="right">{t('participants.rating')}</TableCell>
                <TableCell>{t('participants.status')}</TableCell>
                {isStaff && <TableCell>{t('participants.actions')}</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {registrations.map((registration) => (
                <Row
                  key={registration.id}
                  tournament={tournament}
                  registration={registration}
                  isStaff={isStaff}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

function Row({
  tournament,
  registration,
  isStaff,
}: {
  readonly tournament: TournamentView;
  readonly registration: RegistrationView;
  readonly isStaff: boolean;
}): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();

  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
  };

  const update = useMutation({
    mutationFn: (input: Parameters<typeof updateRegistration>[2]) =>
      updateRegistration(tournament.id, registration.id, input),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: () => removeRegistration(tournament.id, registration.id),
    onSuccess: refresh,
  });

  const isWithdrawn = registration.status === 'WITHDRAWN' || registration.status === 'NO_SHOW';
  const error = update.error ?? remove.error;

  return (
    <TableRow sx={{ verticalAlign: 'top' }}>
      <TableCell align="right" sx={{ color: 'text.secondary', ...NUM }}>
        {registration.seed ?? '—'}
      </TableCell>
      <TableCell>
        <Link
          href={`/players/${registration.player.id}`}
          color="text.primary"
          sx={{ fontWeight: 500 }}
        >
          {playerName(registration.player)}
        </Link>
        {!registration.isRated && (
          // Вне зачёта: играет, но результаты не рейтинговые — ТЗ 4.4.
          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            {t('participants.unrated')}
          </Typography>
        )}
        {error !== null && (
          <Typography role="alert" variant="body2" color="error" sx={{ mt: 0.5 }}>
            {t(errorMessageKey(error))}
          </Typography>
        )}
      </TableCell>
      <TableCell align="right" sx={NUM}>
        {/* Рейтинг на старте, если турнир начат: он и пошёл в расчёт (ТС 5.4). */}
        {registration.ratingAtStart ?? registration.player.rating}
      </TableCell>
      <TableCell sx={{ color: 'text.secondary' }}>
        {t(REGISTRATION_STATUS_KEYS[registration.status])}
      </TableCell>
      {isStaff && (
        <TableCell>
          <Stack
            direction="row"
            useFlexGap
            spacing={1}
            sx={{ flexWrap: 'wrap', alignItems: 'center', minWidth: 280 }}
          >
            <Button
              variant="text"
              size="small"
              disabled={update.isPending}
              onClick={() => {
                update.mutate({ isRated: !registration.isRated });
              }}
              sx={ROW_ACTION}
            >
              {registration.isRated ? t('participants.markUnrated') : t('participants.markRated')}
            </Button>

            <Button
              variant="text"
              size="small"
              disabled={update.isPending}
              onClick={() => {
                update.mutate({ status: isWithdrawn ? 'CONFIRMED' : 'WITHDRAWN' });
              }}
              sx={ROW_ACTION}
            >
              {isWithdrawn ? t('participants.restore') : t('participants.withdraw')}
            </Button>

            {/* Удалить запись можно только до старта: после него участник
                снимается, а не исчезает — его встречи уже в таблице (ADR-009). */}
            {tournament.startedAt === null && (
              <Button
                variant="text"
                color="error"
                size="small"
                disabled={remove.isPending}
                onClick={() => {
                  remove.mutate();
                }}
                sx={ROW_ACTION}
              >
                {t('participants.remove')}
              </Button>
            )}

            <TextField
              label={t('participants.seed')}
              type="number"
              defaultValue={registration.seed ?? ''}
              onBlur={(event) => {
                const raw = event.target.value.trim();
                const seed = raw === '' ? null : Number(raw);

                if (seed === registration.seed || (seed !== null && !Number.isInteger(seed))) {
                  return;
                }

                update.mutate({ seed });
              }}
              slotProps={{ htmlInput: { inputMode: 'numeric', min: 1, sx: NUM } }}
              sx={{ width: 88 }}
            />
          </Stack>
        </TableCell>
      )}
    </TableRow>
  );
}
