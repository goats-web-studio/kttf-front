import type { TrainingCoachRef } from '@kttf/shared/types';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { useQuery } from '@tanstack/react-query';
import { useDeferredValue, useState, type ReactNode } from 'react';

import { useT } from '@/common/i18n';
import { clubsQuery } from '@/features/clubs/queries';
import { usePlaceName } from '@/features/places/place-name';

import { coachShortName } from '../labels';
import { coachesQuery } from '../queries';

interface ClubOption {
  readonly id: string;
  readonly name: string;
  readonly city: string;
}

/**
 * Клуб KTTF — поиском по `GET /clubs?search=`: для тренировки «в клубе» и
 * для запроса в штаб. Справочник клубов здесь не подходит — в нём только
 * первая сотня.
 */
export function ClubPicker({
  value,
  name,
  error,
  onChange,
}: {
  readonly value: string | null;
  /** Название выбранного — пока поиск не вернул клуб, поле не пустое. */
  readonly name: string;
  readonly error: boolean;
  readonly onChange: (club: { readonly id: string; readonly name: string } | null) => void;
}): ReactNode {
  const t = useT();
  const placeName = usePlaceName();
  const [input, setInput] = useState('');
  const search = useDeferredValue(input.trim());
  const clubs = useQuery(
    clubsQuery({ page: 1, limit: 20, ...(search.length < 2 ? {} : { search }) }),
  );
  const found: ClubOption[] = (clubs.data?.items ?? []).map((club) => ({
    id: club.id,
    name: club.name,
    city: placeName(club.city),
  }));
  const selected =
    value === null
      ? null
      : (found.find((option) => option.id === value) ?? { id: value, name, city: '' });
  const options =
    selected === null || found.some((club) => club.id === selected.id)
      ? found
      : [selected, ...found];

  return (
    <Autocomplete
      size="small"
      options={options}
      value={selected}
      onChange={(_, club) => {
        onChange(club === null ? null : { id: club.id, name: club.name });
      }}
      onInputChange={(_, next) => {
        setInput(next);
      }}
      // Ищет сервер.
      filterOptions={(list) => list}
      getOptionLabel={(option) => option.name}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          {option.city === '' ? option.name : `${option.name} · ${option.city}`}
        </li>
      )}
      isOptionEqualToValue={(option, chosen) => option.id === chosen.id}
      loading={clubs.isPending}
      loadingText={t('common.loading')}
      noOptionsText={t('training.editor.noClub')}
      renderInput={(params) => (
        <TextField {...params} label={t('training.editor.club')} error={error} />
      )}
    />
  );
}

/**
 * Тренер со страницей — поиском по `GET /coaches?search=`. Пусто — тренировка
 * клуба без тренера (ADR-059). Вне тренировки (штаб клуба) подсказка о
 * тренировке не нужна — `noneHint={false}`.
 */
export function CoachPicker({
  value,
  onChange,
  noneHint = true,
}: {
  readonly value: TrainingCoachRef | null;
  readonly onChange: (coach: TrainingCoachRef | null) => void;
  readonly noneHint?: boolean;
}): ReactNode {
  const t = useT();
  const [input, setInput] = useState('');
  const search = useDeferredValue(input.trim());
  const coaches = useQuery(
    coachesQuery({ page: 1, limit: 20, ...(search.length < 2 ? {} : { search }) }),
  );
  const found: TrainingCoachRef[] = (coaches.data?.items ?? []).map((coach) => ({
    id: coach.id,
    slug: coach.slug,
    player: coach.player,
    photoUrl: coach.photoUrl,
    // Контакты в выборе не нужны: строка уходит на сервер одним `coachId`.
    phone: null,
    whatsapp: null,
    telegram: null,
    primaryContact: null,
  }));
  const options =
    value === null || found.some((coach) => coach.id === value.id) ? found : [value, ...found];

  return (
    <Autocomplete
      size="small"
      options={options}
      value={value}
      onChange={(_, coach) => {
        onChange(coach);
      }}
      onInputChange={(_, next) => {
        setInput(next);
      }}
      // Ищет сервер: свой фильтр списка выбросил бы найденных по отчеству.
      filterOptions={(list) => list}
      getOptionLabel={(coach) => coachShortName(coach.player)}
      isOptionEqualToValue={(option, chosen) => option.id === chosen.id}
      loading={coaches.isPending}
      loadingText={t('common.loading')}
      noOptionsText={t('training.editor.noCoach')}
      renderInput={(params) => (
        <TextField
          {...params}
          label={t('training.editor.coach')}
          helperText={noneHint && value === null ? t('training.editor.coachNone') : undefined}
        />
      )}
    />
  );
}
