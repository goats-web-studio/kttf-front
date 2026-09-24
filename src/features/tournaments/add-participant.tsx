import { DEFAULT_PAGE_SIZE, type RegistrationView, type TournamentView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT } from '@/common/i18n';
import { playerName } from '@/features/players/player-name';
import { playersQuery } from '@/features/players/queries';

import { registerForTournament } from './api';
import { eligibilityProblems } from './eligibility-problems';
import { tournamentKeys } from './queries';

interface AddParticipantProps {
  readonly tournament: TournamentView;
  readonly registrations: readonly RegistrationView[];
}

/**
 * Ручное добавление участника организатором — ТЗ 4.3.
 *
 * Поиск по фамилии в базе платформы: у половины игроков клуба аккаунта нет
 * вовсе, их заводит организатор, и записывать их на турнир тоже ему.
 *
 * Поиск по кнопке «Найти», а не на каждую букву: выдача — список с кнопкой у
 * каждой строки, и перестраивать его под пальцем, пока человек печатает,
 * значит промахиваться мимо «Добавить».
 *
 * Заведение нового игрока прямо отсюда (ТЗ 4.3) не сделано: форма профиля
 * живёт в кабинете, и второй её экземпляр здесь означал бы два места, где
 * список полей обязан совпадать. Организатор заводит игрока в кабинете и
 * находит его тем же поиском.
 */
export default function AddParticipant({
  tournament,
  registrations,
}: AddParticipantProps): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');

  const found = useQuery({
    ...playersQuery({ page: 1, limit: DEFAULT_PAGE_SIZE, search }),
    enabled: search !== '',
  });

  const add = useMutation({
    mutationFn: (playerId: string) => registerForTournament(tournament.id, { playerId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
    },
  });

  // Уже записанных в выдаче не показываем: записать дважды сервер не даст,
  // а строка с кнопкой, которая всегда откажет, — ложное обещание.
  const registered = new Set(registrations.map((registration) => registration.player.id));
  const candidates = (found.data?.items ?? []).filter((player) => !registered.has(player.id));

  const problems = eligibilityProblems(add.error);

  return (
    <Paper variant="outlined" sx={{ mt: 2, p: 2, bgcolor: 'var(--paper-sunken)' }}>
      <Stack
        component="form"
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ alignItems: { sm: 'flex-start' } }}
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(draft.trim());
        }}
      >
        <TextField
          label={t('participants.search')}
          value={draft}
          autoComplete="off"
          onChange={(event) => {
            setDraft(event.target.value);
          }}
          sx={{ maxWidth: { sm: 320 } }}
        />
        <Button type="submit" sx={{ minHeight: { xs: 44, sm: 40 } }}>
          {t('participants.find')}
        </Button>
      </Stack>

      {add.error !== null && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {problems.length === 0 ? (
            t(errorMessageKey(add.error))
          ) : (
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {problems.map((problem) => (
                <li key={problem}>{t(problem)}</li>
              ))}
            </Box>
          )}
        </Alert>
      )}

      {search !== '' && found.data !== undefined && (
        <List dense disablePadding sx={{ mt: 1 }}>
          {candidates.length === 0 ? (
            <ListItem disableGutters>
              <Typography variant="body2" color="text.secondary">
                {t('ratings.empty')}
              </Typography>
            </ListItem>
          ) : (
            candidates.map((player) => (
              <ListItem
                key={player.id}
                disableGutters
                divider
                secondaryAction={
                  <Button
                    variant="text"
                    size="small"
                    disabled={add.isPending}
                    onClick={() => {
                      add.mutate(player.id);
                    }}
                    sx={{ minHeight: { xs: 44, sm: 32 } }}
                  >
                    {t('participants.add')}
                  </Button>
                }
              >
                <ListItemText
                  primary={playerName(player)}
                  secondary={
                    <>
                      {player.city}{' '}
                      <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {player.rating}
                      </Box>
                    </>
                  }
                />
              </ListItem>
            ))
          )}
        </List>
      )}
    </Paper>
  );
}
