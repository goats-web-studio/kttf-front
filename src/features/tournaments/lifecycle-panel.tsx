import type { ClubCollisionView, DrawResult, TournamentView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT, type MessageKey } from '@/common/i18n';
import { useSessionStore } from '@/features/auth/session-store';
import { isClubStaff } from '@/features/clubs/roles';

import {
  cancelTournament,
  closeRegistration,
  drawTournament,
  finishTournament,
  openRegistration,
  publishTournament,
  startTournament,
} from './api';
import { availableActions, type LifecycleAction } from './lifecycle';
import { tournamentKeys } from './queries';
import StatusBadge from './status-badge';

interface LifecyclePanelProps {
  readonly tournament: TournamentView;
  /** Имена игроков: несведённые одноклубники приходят идентификаторами. */
  readonly names: ReadonlyMap<string, string>;
}

/** Жеребьёвка отвечает расстановкой, остальные действия — самим турниром. */
type ActionResult = DrawResult | TournamentView;

const ACTION_LABELS: Readonly<Record<LifecycleAction, MessageKey>> = {
  publish: 'lifecycle.publish',
  openRegistration: 'lifecycle.openRegistration',
  closeRegistration: 'lifecycle.closeRegistration',
  draw: 'lifecycle.draw',
  start: 'lifecycle.start',
  rate: 'lifecycle.rate',
  cancel: 'lifecycle.cancel',
};

/** Подсказка, объясняющая шаг. Не у каждого состояния она есть. */
const HINTS: Partial<Readonly<Record<TournamentView['status'], MessageKey>>> = {
  DRAFT: 'lifecycle.hint.DRAFT',
  REG_CLOSED: 'lifecycle.hint.REG_CLOSED',
  FINISHED: 'lifecycle.hint.FINISHED',
};

function perform(id: string, action: LifecycleAction): Promise<ActionResult> {
  switch (action) {
    case 'publish':
      return publishTournament(id);
    case 'openRegistration':
      return openRegistration(id);
    case 'closeRegistration':
      return closeRegistration(id);
    case 'draw':
      return drawTournament(id);
    case 'start':
      return startTournament(id);
    case 'rate':
      return finishTournament(id);
    case 'cancel':
      return cancelTournament(id);
  }
}

/**
 * Проведение турнира организатором — ТЗ 4.1.
 *
 * Здесь турнир проходит путь от черновика до старта: публикация, запись,
 * жеребьёвка, начало. Дальше его ведёт консоль судьи. Без этой панели
 * заведённый в интерфейсе турнир остаётся черновиком навсегда, а критерий
 * готовности MVP требует, чтобы организатор провёл второй турнир, не открывая
 * инструкцию, — не говоря уже о `curl`.
 *
 * Показывается только тому, кто ведёт клуб-хозяин (ADR-014). Право всё равно
 * проверяет сервер, и он же стережёт условия сверх статуса: старт без
 * жеребьёвки и завершение с несыгранными встречами он отвергает.
 */
export default function LifecyclePanel({ tournament, names }: LifecyclePanelProps): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const user = useSessionStore((state) => state.user);

  const [collisions, setCollisions] = useState<readonly ClubCollisionView[] | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const run = useMutation({
    mutationFn: (action: LifecycleAction) => perform(tournament.id, action),
    onSuccess: async (result) => {
      // Несведённые одноклубники приходят только от жеребьёвки и только один
      // раз: перечитать их потом неоткуда, поэтому они держатся здесь до
      // следующего действия (ADR-011).
      setCollisions('clubCollisions' in result ? result.clubCollisions : null);
      setConfirmingCancel(false);
      await queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
    },
  });

  if (!isClubStaff(user, tournament.clubId)) {
    return null;
  }

  const actions = availableActions(tournament.status);
  const hint = HINTS[tournament.status];

  // Главное действие экрана одно (запрет №2): шаг, который ведёт турнир
  // вперёд, — первый в списке. Остальные рядом, но не спорят с ним.
  const forward = actions.filter((action) => action !== 'cancel');
  const cancelable = actions.includes('cancel');

  return (
    <Paper variant="outlined" component="section" sx={{ mt: 4, p: { xs: 2, sm: 3 } }}>
      <Typography variant="h2">{t('lifecycle.title')}</Typography>

      <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {t('lifecycle.status')}:
        </Typography>
        <StatusBadge status={tournament.status} />
      </Stack>

      {hint !== undefined && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t(hint)}
        </Typography>
      )}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        useFlexGap
        spacing={1.5}
        sx={{ mt: 2, flexWrap: 'wrap', alignItems: { sm: 'center' } }}
      >
        {forward.map((action, index) => (
          <Button
            key={action}
            variant={index === 0 ? 'contained' : 'outlined'}
            disabled={run.isPending}
            onClick={() => {
              run.mutate(action);
            }}
            sx={{ minHeight: 44 }}
          >
            {t(ACTION_LABELS[action])}
          </Button>
        ))}

        {/* Консоль — следующий шаг после старта. Ссылка, а не кнопка: судья
            открывает её на своём устройстве и остаётся в ней весь турнир. */}
        {tournament.status === 'RUNNING' && (
          <Button href={`/console/${tournament.id}`} sx={{ minHeight: 44 }}>
            {t('lifecycle.console')}
          </Button>
        )}

        {/* Отмена спрашивает подтверждение: обратного перехода у неё нет,
            а стоит она рядом с кнопкой, которую нажимают каждый раз. */}
        {cancelable && (
          <Button
            variant="outlined"
            color="error"
            onClick={() => {
              // Прошлый отказ к отмене не относится: в окне его не повторяем.
              run.reset();
              setConfirmingCancel(true);
            }}
            sx={{ minHeight: 44, ml: { sm: 'auto' } }}
          >
            {t('lifecycle.cancel')}
          </Button>
        )}
      </Stack>

      {run.error !== null && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t(errorMessageKey(run.error))}
        </Alert>
      )}

      {collisions !== null && collisions.length > 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <AlertTitle>{t('draw.collisions')}</AlertTitle>
          {t('draw.collisions.why')}
          {/* Список назван: у страницы много списков, и без имени этот
              неотличим для чтеца экрана. */}
          <Box component="ul" aria-label={t('draw.collisions')} sx={{ mt: 1, mb: 0, pl: 2.5 }}>
            {collisions.map((collision) => (
              <li key={`${collision.club}-${collision.group}`}>
                {collision.group}:{' '}
                {collision.participants
                  .map((id) => names.get(id) ?? t('results.match.unknownPlayer'))
                  .join(', ')}
              </li>
            ))}
          </Box>
        </Alert>
      )}

      <Dialog
        open={confirmingCancel}
        onClose={() => {
          setConfirmingCancel(false);
        }}
        aria-labelledby="cancel-tournament-title"
      >
        <DialogTitle id="cancel-tournament-title">{t('lifecycle.cancelConfirm')}</DialogTitle>
        {/* Отказ виден там, где нажимали: панель под окном закрыта им. */}
        {run.error !== null && (
          <DialogContent>
            <Alert severity="error">{t(errorMessageKey(run.error))}</Alert>
          </DialogContent>
        )}
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="text"
            autoFocus
            onClick={() => {
              setConfirmingCancel(false);
            }}
          >
            {t('lifecycle.cancelNo')}
          </Button>
          <Button
            variant="outlined"
            color="error"
            disabled={run.isPending}
            onClick={() => {
              run.mutate('cancel');
            }}
          >
            {t('lifecycle.cancelYes')}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
