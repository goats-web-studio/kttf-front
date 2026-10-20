import type { TrainingCoachRef } from '@kttf/shared/types';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { useQuery } from '@tanstack/react-query';
import { useDeferredValue, useState, type ReactNode } from 'react';

import { useT } from '@/common/i18n';
import { clubDirectoryQuery } from '@/features/clubs/queries';
import { usePlaceName } from '@/features/places/place-name';

import { coachShortName } from '../labels';
import { coachesQuery } from '../queries';

interface ClubOption {
  readonly id: string;
  readonly name: string;
  readonly city: string;
}

/**
 * Клуб KTTF для тренировки «в клубе» — поиском по справочнику клубов.
 * Клубов десятки, справочник приходит одним запросом и ищется на месте.
 */
export function ClubPicker({
  value,
  name,
  error,
  onChange,
}: {
  readonly value: string | null;
  /** Название выбранного — пока справочник не пришёл, поле не пустое. */
  readonly name: string;
  readonly error: boolean;
  readonly onChange: (club: { readonly id: string; readonly name: string } | null) => void;
}): ReactNode {
  const t = useT();
  const placeName = usePlaceName();
  const directory = useQuery(clubDirectoryQuery);
  const options: ClubOption[] = [...(directory.data?.values() ?? [])].map((club) => ({
    id: club.id,
    name: club.name,
    city: placeName(club.city),
  }));
  const selected =
    value === null
      ? null
      : (options.find((option) => option.id === value) ?? { id: value, name, city: '' });

  return (
    <Autocomplete
      size="small"
      options={options}
      value={selected}
      onChange={(_, club) => {
        onChange(club === null ? null : { id: club.id, name: club.name });
      }}
      getOptionLabel={(option) => option.name}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          {option.city === '' ? option.name : `${option.name} · ${option.city}`}
        </li>
      )}
      isOptionEqualToValue={(option, chosen) => option.id === chosen.id}
      loading={directory.isPending}
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
 * клуба без тренера (ADR-059).
 */
export function CoachPicker({
  value,
  onChange,
}: {
  readonly value: TrainingCoachRef | null;
  readonly onChange: (coach: TrainingCoachRef | null) => void;
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
          helperText={value === null ? t('training.editor.coachNone') : undefined}
        />
      )}
    />
  );
}
