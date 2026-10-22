import { DEFAULT_PAGE_SIZE, type RegistrationView, type TournamentView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { fill, formatRating, useT } from '@/common/i18n';
import { playerName } from '@/features/players/player-name';
import { playersQuery } from '@/features/players/queries';

import { replaceRegistration } from './api';
import { tournamentKeys } from './queries';

interface ReplaceParticipantProps {
  readonly tournament: TournamentView;
  readonly registration: RegistrationView;
  readonly onClose: () => void;
}

/**
 * Замена участника — ADR-062.
 *
 * Пришёл резерв вместо неявившегося: новый встаёт на его место в расстановке,
 * все его встречи переходят к новому. Сервер откажет, если заменяемый уже
 * сыграл: его результаты не переносятся на другого человека.
 */
export default function ReplaceParticipant({
  tournament,
  registration,
  onClose,
}: ReplaceParticipantProps): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');

  const found = useQuery({
    ...playersQuery({ page: 1, limit: DEFAULT_PAGE_SIZE, search }),
    enabled: search !== '',
  });

  const replace = useMutation({
    mutationFn: (playerId: string) =>
      replaceRegistration(tournament.id, registration.id, { playerId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
      onClose();
    },
  });

  const candidates = (found.data?.items ?? []).filter(
    (player) => player.id !== registration.player.id,
  );

  return (
    <Box sx={{ mt: 1, width: '100%' }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {fill(t('participants.replace.lead'), { name: playerName(registration.player) })}
      </Typography>
      <Stack
        component="form"
        direction="row"
        spacing={1}
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(draft.trim());
        }}
      >
        <TextField
          size="small"
          label={t('participants.search')}
          value={draft}
          autoComplete="off"
          onChange={(event) => {
            setDraft(event.target.value);
          }}
        />
        <Button type="submit" size="small" sx={{ minHeight: { xs: 44, sm: 40 } }}>
          {t('participants.find')}
        </Button>
        <Button
          variant="text"
          size="small"
          onClick={onClose}
          sx={{ minHeight: { xs: 44, sm: 40 } }}
        >
          {t('participants.new.cancel')}
        </Button>
      </Stack>

      {replace.error !== null && (
        <Typography role="alert" variant="body2" color="error" sx={{ mt: 1 }}>
          {t(errorMessageKey(replace.error))}
        </Typography>
      )}

      {search !== '' &&
        candidates.map((player) => (
          <Box
            key={player.id}
            sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}
          >
            <Typography sx={{ flex: '1 1 160px' }}>
              {playerName(player)}{' '}
              <Box
                component="span"
                sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
              >
                {formatRating(player.rating)}
              </Box>
            </Typography>
            <Button
              size="small"
              disabled={replace.isPending}
              onClick={() => {
                replace.mutate(player.id);
              }}
              sx={{ minHeight: { xs: 44, sm: 32 } }}
            >
              {t('participants.replace.pick')}
            </Button>
          </Box>
        ))}
    </Box>
  );
}
