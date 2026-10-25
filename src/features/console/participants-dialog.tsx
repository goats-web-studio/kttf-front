import type { TournamentView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useQuery } from '@tanstack/react-query';
import { useId, type ReactNode } from 'react';

import { useT } from '@/common/i18n';
import ParticipantsPanel from '@/features/tournaments/participants-panel';
import { registrationsQuery } from '@/features/tournaments/queries';

interface ParticipantsDialogProps {
  readonly tournament: TournamentView;
  /** Состав меняется только при сети: это прямые запросы, не очередь консоли. */
  readonly online: boolean;
  readonly onClose: () => void;
}

/**
 * «Участники» в консоли — ADR-076, как у турнир-менеджера RTTF: прямо в
 * зале добавить опоздавшего (в группу, с рейтингом по уровню), заменить
 * неявившегося, снять участника, отметить оплату. Тот же состав, что на
 * странице турнира, — организатору не надо уходить из консоли.
 *
 * Состав читается заново, а не из снимка консоли: правки уходят на сервер
 * сразу, и снимок отстал бы до синхронизации. После закрытия консоль
 * перечитывает свой снимок.
 */
export default function ParticipantsDialog({
  tournament,
  online,
  onClose,
}: ParticipantsDialogProps): ReactNode {
  const t = useT();
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  const titleId = useId();
  const registrations = useQuery({ ...registrationsQuery(tournament.id), enabled: online });

  return (
    <Dialog
      open
      onClose={onClose}
      fullScreen={phone}
      fullWidth
      maxWidth="md"
      aria-labelledby={titleId}
      data-console-participants
    >
      <Box
        component="header"
        sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 3, pt: 2.5, pb: 1 }}
      >
        <Typography id={titleId} variant="h2" sx={{ flexGrow: 1 }}>
          {t('console.participants.title')}
        </Typography>
        <Button variant="text" onClick={onClose} sx={{ minHeight: 44 }}>
          {t('console.participants.close')}
        </Button>
      </Box>
      <DialogContent sx={{ pt: 0 }}>
        {online ? (
          <ParticipantsPanel tournament={tournament} registrations={registrations.data ?? []} />
        ) : (
          <Alert severity="warning" variant="outlined">
            {t('console.participants.offline')}
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
}
