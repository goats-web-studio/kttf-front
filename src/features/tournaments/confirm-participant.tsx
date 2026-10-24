import type { PlayerListItemView, TournamentView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT } from '@/common/i18n';
import { confirmPlayer } from '@/features/players/api';
import { playerName } from '@/features/players/player-name';
import { playerKeys } from '@/features/players/queries';
import StartRatingField from '@/features/players/start-rating-field';

import { registerForTournament } from './api';
import { tournamentKeys } from './queries';

interface ConfirmParticipantProps {
  readonly tournament: TournamentView;
  readonly player: PlayerListItemView;
  readonly city: string;
}

/**
 * Пришедший с анкетой без рейтинга — ADR-072.
 *
 * Человек завёл анкету на сайте сам и пришёл в зал. Второй профиль ему не
 * заводится: организатор подтверждает анкету, задав рейтинг по уровню игры,
 * и тем же нажатием записывает на турнир. Без оценки на турнир нельзя —
 * сервер откажет: умолчание 250 ломает посев (ADR-062).
 */
export default function ConfirmParticipant({
  tournament,
  player,
  city,
}: ConfirmParticipantProps): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);

  const confirm = useMutation({
    mutationFn: async (startRating: number) => {
      await confirmPlayer(player.id, { clubId: tournament.clubId, startRating });
      await registerForTournament(tournament.id, { playerId: player.id });
    },
    onSuccess: () => {
      setOpen(false);
    },
    // И при отказе записи: подтверждение уже прошло, и строка должна стать
    // обычной «Добавить», а не предлагать подтвердить второй раз.
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tournamentKeys.all }),
        queryClient.invalidateQueries({ queryKey: playerKeys.all }),
      ]);
    },
  });

  return (
    <ListItem
      disableGutters
      divider
      data-unrated
      sx={{ display: 'block' }}
      secondaryAction={
        open ? undefined : (
          <Button
            variant="text"
            size="small"
            onClick={() => {
              setOpen(true);
            }}
            sx={{ minHeight: { xs: 44, sm: 32 } }}
          >
            {t('participants.confirm.open')}
          </Button>
        )
      }
    >
      <ListItemText
        primary={playerName(player)}
        secondary={`${city} · ${t('participants.sheet')}`}
      />

      {open && (
        <Box
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            if (rating !== null) confirm.mutate(rating);
          }}
          sx={{ pb: 2 }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {t('participants.confirm.lead')}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Box sx={{ minWidth: { sm: 280 }, display: 'grid' }}>
              <StartRatingField
                value={rating}
                onChange={setRating}
                label={t('participants.new.rating')}
              />
            </Box>
            <Button
              type="submit"
              disabled={rating === null || confirm.isPending}
              sx={{ minHeight: 44, alignSelf: { sm: 'flex-start' } }}
            >
              {t('participants.confirm.submit')}
            </Button>
            <Button
              variant="text"
              onClick={() => {
                setOpen(false);
              }}
              sx={{ minHeight: 44, alignSelf: { sm: 'flex-start' } }}
            >
              {t('participants.new.cancel')}
            </Button>
          </Stack>
          {confirm.error !== null && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {t(errorMessageKey(confirm.error))}
            </Alert>
          )}
        </Box>
      )}
    </ListItem>
  );
}
