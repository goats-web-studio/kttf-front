import type { CreatePlayerInput, TournamentView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT } from '@/common/i18n';
import IntegerField from '@/common/ui/integer-field';
import CityPicker from '@/features/places/city-picker';
import { createPlayer } from '@/features/players/api';
import { playerKeys } from '@/features/players/queries';
import StartRatingField from '@/features/players/start-rating-field';

import { registerForTournament } from './api';
import NamesakeOffer from './namesake-offer';
import { duplicatesOf } from './namesakes';
import { newParticipantInput, type NewParticipantForm } from './new-participant-input';
import { tournamentKeys } from './queries';

interface NewParticipantProps {
  readonly tournament: TournamentView;
  /** Фамилия из поиска, по которой никого не нашли: её и заводят. */
  readonly lastName: string;
  /** Кто уже в составе — для подсказки «такой игрок уже есть». */
  readonly registered: ReadonlySet<string>;
}

/**
 * Новый игрок прямо из состава турнира — ТЗ 4.3, ADR-062.
 *
 * В клуб каждую неделю приходят новые люди, и уйти в кабинет заводить
 * профиль посреди записи организатор не станет. Здесь только то, без чего
 * профиль не заводится, и **стартовый рейтинг**: без оценки новичок входит
 * с 250 и ломает посев. Остальную анкету игрок заполнит сам.
 *
 * Профиль заводится в клубе турнира и сразу записывается на турнир.
 */
export default function NewParticipant({
  tournament,
  lastName,
  registered,
}: NewParticipantProps): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewParticipantForm>({
    lastName,
    firstName: '',
    gender: 'MALE',
    birthYear: null,
    cityId: '',
    startRating: null,
  });
  // Профиль заведён, а запись отказала (ADR-100): повтор только записывает
  // его же. Иначе каждое нажатие заводило бы ещё одного такого же игрока.
  const [createdId, setCreatedId] = useState<string | null>(null);
  const input = newParticipantInput(form, tournament.clubId);

  const done = async (): Promise<void> => {
    setOpen(false);
    setCreatedId(null);
    await queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
  };

  const create = useMutation({
    mutationFn: async (profile: CreatePlayerInput) => {
      let playerId = createdId;

      if (playerId === null) {
        playerId = (await createPlayer(profile)).id;
        setCreatedId(playerId);
        // Новый профиль должен находиться поиском сразу, даже если запись
        // ниже откажет.
        void queryClient.invalidateQueries({ queryKey: playerKeys.all });
      }

      await registerForTournament(tournament.id, { playerId });
    },
    onSuccess: done,
  });

  const namesakes = duplicatesOf(create.error);

  if (!open) {
    return (
      <Button
        variant="text"
        onClick={() => {
          setForm({ ...form, lastName });
          setOpen(true);
        }}
        sx={{ mt: 1, minHeight: 44 }}
      >
        {t('participants.new.open')}
      </Button>
    );
  }

  return (
    <Box
      component="form"
      onSubmit={(event) => {
        event.preventDefault();
        if (input !== null) create.mutate(input);
      }}
      sx={{ mt: 2 }}
    >
      <Typography variant="subtitle2" component="h3">
        {t('participants.new.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('participants.new.lead')}
      </Typography>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        <TextField
          label={t('player.form.lastName')}
          value={form.lastName}
          required
          onChange={(event) => {
            setForm({ ...form, lastName: event.target.value });
          }}
        />
        <TextField
          label={t('player.form.firstName')}
          value={form.firstName}
          required
          onChange={(event) => {
            setForm({ ...form, firstName: event.target.value });
          }}
        />
        <TextField
          select
          label={t('player.form.gender')}
          value={form.gender}
          onChange={(event) => {
            setForm({ ...form, gender: event.target.value === 'FEMALE' ? 'FEMALE' : 'MALE' });
          }}
        >
          <MenuItem value="MALE">{t('player.gender.MALE')}</MenuItem>
          <MenuItem value="FEMALE">{t('player.gender.FEMALE')}</MenuItem>
        </TextField>
        <IntegerField
          label={t('player.form.birthYear')}
          value={form.birthYear}
          required
          onChange={(birthYear) => {
            setForm({ ...form, birthYear });
          }}
        />
        <CityPicker
          value={form.cityId}
          onChange={(cityId) => {
            setForm({ ...form, cityId });
          }}
          label={t('player.form.city')}
        />
        <StartRatingField
          value={form.startRating}
          label={t('participants.new.rating')}
          withHint
          onChange={(startRating) => {
            setForm({ ...form, startRating });
          }}
        />
      </Box>

      {namesakes.length > 0 ? (
        <NamesakeOffer
          tournament={tournament}
          namesakes={namesakes}
          registered={registered}
          startRating={form.startRating}
          title="participants.duplicate.title"
          lead="participants.duplicate.lead"
          anywayLabel="participants.duplicate.anyway"
          anywayDisabled={input === null || create.isPending}
          onAnyway={() => {
            if (input !== null) create.mutate({ ...input, allowDuplicate: true });
          }}
          onDone={() => void done()}
        />
      ) : (
        create.error !== null && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {t(errorMessageKey(create.error))}
          </Alert>
        )
      )}

      <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <Button type="submit" disabled={input === null || create.isPending} sx={{ minHeight: 44 }}>
          {t('participants.new.submit')}
        </Button>
        <Button
          variant="text"
          onClick={() => {
            setOpen(false);
          }}
          sx={{ minHeight: 44 }}
        >
          {t('participants.new.cancel')}
        </Button>
      </Box>
    </Box>
  );
}
