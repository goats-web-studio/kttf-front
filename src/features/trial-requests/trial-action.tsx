import { trainingBookingTarget, type TrainingView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button, { type ButtonProps } from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { createLink } from '@tanstack/react-router';
import { ClipboardList } from 'lucide-react';
import { forwardRef, useState, type ReactNode } from 'react';

import { useT } from '@/common/i18n';
import { useSessionStore } from '@/features/auth/session-store';
import { isClubStaff } from '@/features/clubs/roles';
import { useTrainingDialog } from '@/features/coaches/training-dialog-context';

import TrialRequestDialog from './trial-request-dialog';

/** Кнопка-ссылка роутера: адрес возврата после входа уходит параметром. */
const ButtonLink = createLink(
  forwardRef<HTMLAnchorElement, Omit<ButtonProps<'a'>, 'component'>>(
    function ButtonAnchor(props, ref) {
      return <Button {...props} ref={ref} component="a" />;
    },
  ),
);

/**
 * «Оставить заявку на сайте» в блоке «Запись и оплата» — второй путь
 * рядом с мессенджером (ADR-059, T3). Заявку отправляет только вошедший
 * (решение владельца от 22.10.2026): гостю — вход с возвратом к этой же
 * тренировке. Себе заявку не отправить: тренеру на свою тренировку и
 * составу клуба на тренировку клуба кнопки нет — сервер отказал бы.
 */
export default function TrialAction({ training }: { readonly training: TrainingView }): ReactNode {
  const t = useT();
  const user = useSessionStore((state) => state.user);
  const dialog = useTrainingDialog();
  const [open, setOpen] = useState(false);
  const target = trainingBookingTarget(training);

  if (target === null) return null;

  const own =
    target.kind === 'CLUB'
      ? isClubStaff(user, target.club.id)
      : user?.coach?.id === target.coach.id;

  if (own) return null;

  return (
    <Box data-trial-action>
      {user === null ? (
        <ButtonLink
          to="/login"
          search={{ redirect: dialog.hrefFor(training.id) }}
          variant="text"
          startIcon={<ClipboardList size={18} aria-hidden />}
          sx={{ minHeight: 44 }}
        >
          {t('trial.signIn')}
        </ButtonLink>
      ) : (
        <Button
          variant="text"
          startIcon={<ClipboardList size={18} aria-hidden />}
          onClick={() => {
            setOpen(true);
          }}
          sx={{ minHeight: 44 }}
        >
          {t('trial.action')}
        </Button>
      )}
      <Typography variant="body2" color="text.secondary">
        {t('trial.actionHint')}
      </Typography>
      {user !== null && (
        <TrialRequestDialog
          training={training}
          target={target}
          open={open}
          onClose={() => {
            setOpen(false);
          }}
        />
      )}
    </Box>
  );
}
