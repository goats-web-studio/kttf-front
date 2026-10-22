import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { PencilLine } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { fill, useT, type MessageKey } from '@/common/i18n';
import PlayerAvatar from '@/common/ui/player-avatar';
import RatingValue from '@/common/ui/rating-value';
import { coachesQuery } from '@/features/coaches/queries';
import { usePlaceName } from '@/features/places/place-name';

import {
  COACH_SEARCH_LIMIT,
  coachOptions,
  coachSearchText,
  sameCoachOption,
  type CoachOption,
} from './coach-options';
import { playersQuery } from './queries';

/** Пауза после последней буквы, после которой уходит поиск. */
export const COACH_SEARCH_DELAY_MS = 250;

/** Значение, которое перестало меняться на `delay` миллисекунд. */
function useSettled(value: string, delay: number): string {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSettled(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return settled;
}

interface CoachFieldProps {
  readonly value: CoachOption | null;
  readonly onChange: (option: CoachOption | null) => void;
  readonly label: ReactNode;
  /** Ошибка проверки вписанного имени. */
  readonly error?: MessageKey | undefined;
}

/**
 * «Тренер» в анкете — поле с подсказками (ADR-035, ADR-059). Выпадающий
 * список на полсотни имён не открывают: человек начинает печатать, поиск
 * уходит на сервер с паузы в четверть секунды, прежний запрос отменяется.
 * Сверху — тренеры KTTF со страницей, ниже — те, на кого уже ссылались,
 * последним — «Вписать: „…“», если тренера в KTTF нет.
 */
export default function CoachField({ value, onChange, label, error }: CoachFieldProps): ReactNode {
  const t = useT();
  const placeName = usePlaceName();
  const [input, setInput] = useState(value?.name ?? '');
  // Пока имя выбранного не тронуто, подсказка — тренеры без поиска, а
  // не варианты, отфильтрованные по самому выбранному: при открытии анкеты
  // поиск по сохранённому имени ни к чему.
  const typing = input !== value?.name;
  const settled = useSettled(input, COACH_SEARCH_DELAY_MS);
  // Поиск меняется, только когда текст отстоялся и совпал с набранным:
  // только что стёртое имя не уходит поиском с опозданием, а пока человек
  // печатает, видны варианты прежнего поиска.
  const [search, setSearch] = useState<string | undefined>(undefined);
  if (settled === input) {
    const next = settled === value?.name ? undefined : coachSearchText(settled);
    if (next !== search) setSearch(next);
  }
  const coaches = useQuery({
    ...coachesQuery({
      page: 1,
      limit: COACH_SEARCH_LIMIT,
      ...(search === undefined ? {} : { search }),
    }),
    // Пока идёт новый поиск, видны прежние варианты, а не пустой список.
    placeholderData: keepPreviousData,
  });
  const referenced = useQuery(playersQuery({ page: 1, limit: 50, coachesOnly: true }));
  const options = coachOptions(
    typing ? input : '',
    coaches.data?.items ?? [],
    referenced.data?.items ?? [],
  );
  const failed = coaches.isError;

  return (
    <Autocomplete<CoachOption>
      value={value}
      onChange={(_, next) => {
        onChange(next);
      }}
      inputValue={input}
      onInputChange={(_, next) => {
        setInput(next);
      }}
      options={options}
      // Фильтрует сервер и `coachOptions`: свой фильтр MUI выбросил бы
      // «Вписать» и найденных по отчеству.
      filterOptions={(list) => list}
      groupBy={(option) =>
        t(
          option.kind === 'kttf'
            ? 'player.form.coachWithPage'
            : option.kind === 'player'
              ? 'player.form.coachOthers'
              : 'player.form.coachTypedGroup',
        )
      }
      getOptionLabel={(option) => option.name}
      isOptionEqualToValue={sameCoachOption}
      loading={coaches.isFetching}
      loadingText={t('common.loading')}
      noOptionsText={t('player.form.coachNotFound')}
      clearText={t('player.form.coachClear')}
      openText={t('player.form.coachOpen')}
      slotProps={{
        // Список подсказок не шире поля, а поле не шире экрана.
        popper: { sx: { maxWidth: 'calc(100vw - 32px)' } },
        listbox: { sx: { '& .MuiAutocomplete-option': { minHeight: 44 } } },
      }}
      renderOption={(props, option) => {
        const { key, ...rest } = props;

        return (
          <Box component="li" key={key} {...rest} data-coach-option={option.kind}>
            {option.kind === 'typed' ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <PencilLine size={18} aria-hidden />
                {fill(t('player.form.coachTyped'), { name: option.name })}
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                <PlayerAvatar
                  lastName={option.name.split(' ')[0] ?? ''}
                  firstName={option.name.split(' ')[1] ?? ''}
                  photoUrl={option.photoUrl}
                  size="sm"
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: option.kind === 'kttf' ? 600 : 400 }}>
                    {option.name}
                  </Typography>
                  {(option.city !== null || option.rating !== null) && (
                    <Typography variant="body2" color="text.secondary">
                      {option.city === null ? '' : placeName(option.city)}
                      {option.city !== null && option.rating !== null && ' · '}
                      {option.rating !== null && (
                        <RatingValue value={option.rating} animate={false} />
                      )}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={t('player.form.coachPlaceholder')}
          error={error !== undefined}
          helperText={
            error !== undefined ? t(error) : failed ? t('player.form.coachSearchError') : undefined
          }
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps.input,
              endAdornment: (
                <>
                  {coaches.isFetching && (
                    <CircularProgress
                      size={18}
                      aria-label={t('common.loading')}
                      data-coach-loading
                    />
                  )}
                  {params.slotProps.input.endAdornment}
                </>
              ),
            },
            ...(error === undefined && !failed ? {} : { formHelperText: { role: 'alert' } }),
          }}
        />
      )}
    />
  );
}
