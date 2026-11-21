import { DEFAULT_PAGE_SIZE, type RegistrationView, type TournamentView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT } from '@/common/i18n';
import { clubDirectoryQuery } from '@/features/clubs/queries';
import { usePlaceName } from '@/features/places/place-name';
import { playerName } from '@/features/players/player-name';
import { playersQuery } from '@/features/players/queries';

import { registerForTournament } from './api';
import { candidateDetails } from './candidate-details';
import ConfirmParticipant from './confirm-participant';
import { eligibilityProblems } from './eligibility-problems';
import NewParticipant from './new-participant';
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
 * Выдача — по мере набора, от двух букв, после паузы: кнопка «Найти» была
 * лишним шагом (замечание владельца, 21.11.2026). Пауза держит список
 * неподвижным, пока человек печатает, — по «Добавить» не промахнуться.
 *
 * В строке — год, клуб, город и рейтинг, имя ведёт на профиль: однофамильцев
 * различают по ним. Уже записанный не прячется, а назван «уже в составе» —
 * иначе «Игроков не найдено» про того, кто стоит в составе, сбивает с толку.
 *
 * Кого в базе нет, организатор заводит здесь же — «Новый игрок» со
 * стартовым рейтингом (ADR-062). Это не вторая анкета: только поля, без
 * которых профиль не заводится, остальное игрок заполнит сам в кабинете.
 */
export default function AddParticipant({
  tournament,
  registrations,
}: AddParticipantProps): ReactNode {
  const t = useT();
  const placeName = usePlaceName();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const clubs = useQuery(clubDirectoryQuery);

  useEffect(() => {
    const text = draft.trim();
    const timer = setTimeout(() => {
      setSearch(text.length >= MIN_SEARCH ? text : '');
    }, SEARCH_PAUSE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [draft]);

  const found = useQuery({
    // С анкетами без рейтинга (ADR-072): пришедшему со своей анкетой
    // организатор задаёт рейтинг, а не заводит второй профиль.
    ...playersQuery({ page: 1, limit: DEFAULT_PAGE_SIZE, search, withUnconfirmed: true }),
    enabled: search !== '',
  });

  const add = useMutation({
    mutationFn: (playerId: string) => registerForTournament(tournament.id, { playerId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
    },
  });

  const registered = new Set(registrations.map((registration) => registration.player.id));
  const candidates = found.data?.items ?? [];
  const details = (player: (typeof candidates)[number]): string =>
    candidateDetails(player, {
      club: player.clubId === null ? null : (clubs.data?.get(player.clubId)?.name ?? null),
      city: placeName(player.city),
      unrated: t('participants.sheet'),
    });

  const problems = eligibilityProblems(add.error);

  // До открытия записи сервер участника не примет (ADR-100): форма здесь
  // обещала бы запись, которой не будет, а «Новый игрок» заводил бы профиль
  // без записи — и на повторе ещё один.
  if (tournament.status === 'DRAFT' || tournament.status === 'PUBLISHED') {
    return (
      <Paper variant="outlined" sx={{ mt: 2, p: 2, bgcolor: 'var(--paper-sunken)' }}>
        <Typography variant="body2" color="text.secondary">
          {t('participants.closed')}
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ mt: 2, p: 2, bgcolor: 'var(--paper-sunken)' }}>
      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          const text = draft.trim();
          setSearch(text.length >= MIN_SEARCH ? text : '');
        }}
      >
        <TextField
          label={t('participants.search')}
          value={draft}
          autoComplete="off"
          onChange={(event) => {
            setDraft(event.target.value);
          }}
          sx={{ width: '100%', maxWidth: { sm: 320 } }}
        />
      </Box>

      {(tournament.status === 'REG_CLOSED' || tournament.status === 'RUNNING') && (
        // Поздняя запись (ADR-062): после жеребьёвки игрок встаёт в группу.
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          {t('participants.late.hint')}
        </Typography>
      )}

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
            candidates.map((player) =>
              registered.has(player.id) ? (
                <ListItem key={player.id} disableGutters divider data-registered>
                  <ListItemText
                    primary={<ProfileLink id={player.id} name={playerName(player, t)} />}
                    secondary={`${details(player)} · ${t('participants.duplicate.registered')}`}
                  />
                </ListItem>
              ) : !player.confirmed ? (
                <ConfirmParticipant
                  key={player.id}
                  tournament={tournament}
                  player={player}
                  registered={registered}
                  details={details(player)}
                />
              ) : (
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
                    primary={<ProfileLink id={player.id} name={playerName(player, t)} />}
                    secondary={details(player)}
                    slotProps={{ secondary: { sx: { fontVariantNumeric: 'tabular-nums' } } }}
                  />
                </ListItem>
              ),
            )
          )}
        </List>
      )}

      <NewParticipant
        key={search}
        tournament={tournament}
        lastName={search}
        registered={registered}
      />
    </Paper>
  );
}

/** Пауза после набора: запрос — когда человек перестал печатать. */
const SEARCH_PAUSE_MS = 300;
/** С одной буквы выдача — полбазы: искать начинаем со второй. */
const MIN_SEARCH = 2;

/**
 * Имя — ссылка на профиль в новой вкладке: сверить человека и вернуться к
 * записи, не потеряв набранное.
 */
function ProfileLink({ id, name }: { readonly id: string; readonly name: string }): ReactNode {
  return (
    <Link component="a" href={`/players/${id}`} target="_blank" rel="noopener" underline="hover">
      {name}
    </Link>
  );
}
