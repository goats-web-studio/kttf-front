import type { TournamentView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { formatRating, useT, type MessageKey } from '@/common/i18n';
import { confirmPlayer } from '@/features/players/api';
import { playerName } from '@/features/players/player-name';
import { playerKeys } from '@/features/players/queries';

import { registerForTournament } from './api';
import type { Namesake } from './namesakes';
import { tournamentKeys } from './queries';

interface NamesakeOfferProps {
  readonly tournament: TournamentView;
  readonly namesakes: readonly Namesake[];
  /** Кто уже в составе: им кнопка не нужна, второй записи сервер не даст. */
  readonly registered: ReadonlySet<string>;
  /** Рейтинг из формы — для анкеты без рейтинга: её подтверждают им же. */
  readonly startRating: number | null;
  readonly title: MessageKey;
  readonly lead: MessageKey;
  readonly anywayLabel: MessageKey;
  readonly anywayDisabled: boolean;
  readonly onAnyway: () => void;
  readonly onDone: () => void;
}

/**
 * «Такой игрок уже есть» — ADR-100.
 *
 * Организатор пытался завести или подтвердить того, кто в базе уже есть.
 * Каждому найденному — действие, которое пройдёт: игровой профиль
 * записывается, анкета подтверждается рейтингом из формы и записывается,
 * уже записанный просто назван. «Это другой человек» — явный выход для
 * настоящих тёзок.
 */
export default function NamesakeOffer({
  tournament,
  namesakes,
  registered,
  startRating,
  title,
  lead,
  anywayLabel,
  anywayDisabled,
  onAnyway,
  onDone,
}: NamesakeOfferProps): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();

  const take = useMutation({
    mutationFn: async (player: Namesake) => {
      if (!player.confirmed) {
        if (startRating === null) return;
        await confirmPlayer(player.id, { clubId: tournament.clubId, startRating });
      }

      await registerForTournament(tournament.id, { playerId: player.id });
    },
    onSuccess: onDone,
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tournamentKeys.all }),
        queryClient.invalidateQueries({ queryKey: playerKeys.all }),
      ]);
    },
  });

  return (
    <Alert severity="warning" sx={{ mt: 2 }}>
      <Typography variant="subtitle2" component="p">
        {t(title)}
      </Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        {t(lead)}
      </Typography>
      <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
        {namesakes.map((player) => (
          <Box
            component="li"
            key={player.id}
            sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, minHeight: 44 }}
          >
            <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {playerName(player, t)}, {player.birthYear} ·{' '}
              {player.confirmed ? formatRating(String(player.rating)) : t('participants.sheet')}
            </Typography>
            {registered.has(player.id) ? (
              <Typography variant="body2" color="text.secondary">
                {t('participants.duplicate.registered')}
              </Typography>
            ) : (
              <Button
                variant="text"
                size="small"
                disabled={take.isPending || (!player.confirmed && startRating === null)}
                onClick={() => {
                  take.mutate(player);
                }}
                sx={{ minHeight: 44 }}
              >
                {t(
                  player.confirmed
                    ? 'participants.duplicate.register'
                    : 'participants.confirm.submit',
                )}
              </Button>
            )}
          </Box>
        ))}
      </Box>
      <Button
        variant="text"
        size="small"
        disabled={anywayDisabled}
        onClick={onAnyway}
        sx={{ mt: 1, minHeight: 44 }}
      >
        {t(anywayLabel)}
      </Button>
      {take.error !== null && (
        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
          {t(errorMessageKey(take.error))}
        </Typography>
      )}
    </Alert>
  );
}
