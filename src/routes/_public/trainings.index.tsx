import {
  COACH_LANGUAGES,
  TRAINING_AUDIENCES,
  TRAINING_KINDS,
  TRAINING_PLACES,
  MAX_PAGE_SIZE,
  TIMES_OF_DAY,
  type CoachLanguage,
  type TimeOfDay,
  type TrainingGroupView,
} from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { SlidersHorizontal } from 'lucide-react';
import { Fragment, useCallback, useId, useState, type ReactNode } from 'react';

import { fill, formatMoney, useLocale, useT, type Locale, type MessageKey } from '@/common/i18n';
import { orUndefined } from '@/common/search';
import AdSlot from '@/common/ui/ad-slot';
import EmptyState from '@/common/ui/empty-state';
import FilterSummary, { type ActiveFilter } from '@/common/ui/filter-summary';
import Pagination from '@/common/ui/pagination';
import PillTabs from '@/common/ui/pill-tabs';
import QueryState from '@/common/ui/query-state';
import SearchInput from '@/common/ui/search-input';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { CoachCard } from '@/features/coaches/coach-cards';
import {
  COACH_LANGUAGE_KEYS,
  TRAINING_AUDIENCE_KEYS,
  TRAINING_KIND_KEYS,
  TRAINING_PLACE_KEYS,
} from '@/features/coaches/labels';
import { coachesQuery, trainingsQuery } from '@/features/coaches/queries';
import { weekdayShort } from '@/features/coaches/schedule';
import TrainingDialogHost from '@/features/coaches/training-dialog-host';
import { TrainingGroupBlock } from '@/features/coaches/training-list';
import { clubsQuery } from '@/features/clubs/queries';
import {
  audiencesOf,
  daysOf,
  hasFilters,
  hiddenFilterCount,
  joinList,
  kindsOf,
  listOf,
  placesOf,
  timesOf,
  toCoachesQuery,
  toTrainingsQuery,
  toggleIn,
  trainingsSearchSchema,
  type TrainingsSearch,
  type TrainingsView,
} from '@/features/coaches/trainings-search';
import CitiesFilter from '@/features/places/cities-filter';
import { useCityLabel } from '@/features/places/city-label';

export const Route = createFileRoute('/_public/trainings/')({
  validateSearch: (search: Record<string, unknown>) => trainingsSearchSchema.parse(search),
  component: TrainingsPage,
});

/** После какой карточки тренера стоит рекламный слот (`docs/11` 5.2). */
const AD_AFTER = 6;

/** У тренировок — после второго блока места: блок длиннее карточки. */
const AD_AFTER_GROUP = 2;

const VIEW_OPTIONS = [
  ['trainings', 'trainings.view.trainings'],
  ['coaches', 'trainings.view.coaches'],
] as const satisfies readonly (readonly [TrainingsView, MessageKey])[];

/** Дни недели в фильтре — значениями адреса: «1» — понедельник. */
const DAY_VALUES = ['1', '2', '3', '4', '5', '6', '7'] as const;

/** Время суток: утро — до 12:00, день — до 17:00, вечер — с 17:00. */
const TIME_OF_DAY_KEYS: Readonly<Record<TimeOfDay, MessageKey>> = {
  MORNING: 'trainings.filter.time.MORNING',
  DAY: 'trainings.filter.time.DAY',
  EVENING: 'trainings.filter.time.EVENING',
};

/** Возраст ребёнка в фильтре: от трёх до семнадцати, как в контракте. */
const AGES = Array.from({ length: 15 }, (_, index) => index + 3);

/**
 * «Тренировки» — пятый раздел, ADR-059, `docs/11` 5.2.
 *
 * Каталог тренировок, а не визиток: человек ищет «детская группа в Алматы
 * до 20 000 ₸» и видит тренировки, у каждой тренер, место и цена.
 * Переключатель ведёт на тренеров списком. Фильтры применяются сразу и
 * живут в адресе (07, 6.2); на телефоне они раскрываются кнопкой
 * «Фильтры (N)», иначе занимают весь первый экран.
 */
function TrainingsPage(): ReactNode {
  const t = useT();
  const locale = useLocale();
  const id = useId();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const cityLabel = useCityLabel();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const view: TrainingsView = search.view ?? 'trainings';
  const page = search.page ?? 1;
  const kinds = kindsOf(search);
  const audiences = audiencesOf(search);
  const places = placesOf(search);
  const cities = listOf(search.city);
  const days = daysOf(search);
  const times = timesOf(search);

  // Смена фильтра возвращает на первую страницу.
  const filter = useCallback(
    (patch: Partial<TrainingsSearch>, replace = false) => {
      void navigate({
        search: (previous) => ({ ...previous, ...patch, page: undefined }),
        replace,
      });
    },
    [navigate],
  );
  const commitQ = useCallback(
    (value: string) => {
      filter({ q: orUndefined(value) }, true);
    },
    [filter],
  );
  const commitPrice = useCallback(
    (value: string) => {
      const digits = value.replace(/\D/g, '');
      filter({ priceTo: digits === '' ? undefined : Number(digits) }, true);
    },
    [filter],
  );

  // Вид меняет и набор фильтров: у тренеров нет вида тренировки и цены.
  // Общие — город и язык — остаются, остальное сбрасывается.
  const switchView = (next: TrainingsView): void => {
    void navigate({
      search: {
        ...(next === 'coaches' ? { view: 'coaches' as const } : {}),
        ...(search.city === undefined ? {} : { city: search.city }),
        ...(search.language === undefined ? {} : { language: search.language }),
      },
    });
  };
  // Окно тренировки — в адресе: «Назад» закрывает его, ссылку можно переслать.
  const openTraining = useCallback(
    (trainingId: string) => {
      void navigate({
        search: (previous) => ({ ...previous, training: trainingId }),
        resetScroll: false,
      });
    },
    [navigate],
  );
  const closeTraining = useCallback(() => {
    void navigate({
      search: (previous) => ({ ...previous, training: undefined }),
      replace: true,
      resetScroll: false,
    });
  }, [navigate]);

  const reset = (): void => {
    void navigate({ search: view === 'coaches' ? { view: 'coaches' } : {} });
  };

  // Клубы для «где» — города из фильтра, если он задан: в Алматы не нужен
  // выбор клуба из Астаны.
  const clubs = useQuery({
    ...clubsQuery({
      page: 1,
      limit: MAX_PAGE_SIZE,
      ...(cities.length === 0 ? {} : { cityId: cities }),
    }),
    enabled: view === 'trainings',
  });
  const clubName = (clubId: string): string =>
    clubs.data?.items.find((club) => club.id === clubId)?.name ?? t('trainings.filter.club');
  const active = activeFilters(search, view, {
    t,
    locale,
    cityLabel,
    clubName,
    money: (amount) => formatMoney(amount, locale),
    filter,
  });
  const hidden = hiddenFilterCount(search, view);
  const filtered = hasFilters(search, view);

  const chipGroup = <T extends string>(
    label: MessageKey,
    values: readonly T[],
    selected: readonly T[],
    labelOf: (value: T) => string,
    onChange: (next: T[]) => void,
  ): ReactNode => (
    <Box role="group" aria-label={t(label)}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75, fontWeight: 500 }}>
        {t(label)}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {values.map((value) => {
          const on = selected.includes(value);

          return (
            <Chip
              key={value}
              label={labelOf(value)}
              clickable
              variant={on ? 'filled' : 'outlined'}
              aria-pressed={on}
              onClick={() => {
                onChange(toggleIn(selected, value));
              }}
              sx={{ height: { xs: 44, sm: 40 } }}
            />
          );
        })}
      </Box>
    </Box>
  );

  const language = (
    <TextField
      select
      label={t('trainings.filter.language')}
      value={search.language ?? ''}
      onChange={(event) => {
        const value = event.target.value;
        filter({ language: value === '' ? undefined : (value as CoachLanguage) });
      }}
    >
      <MenuItem value="">{t('filter.any')}</MenuItem>
      {COACH_LANGUAGES.map((value) => (
        <MenuItem key={value} value={value}>
          {t(COACH_LANGUAGE_KEYS[value])}
        </MenuItem>
      ))}
    </TextField>
  );
  const cityFilter = (
    <CitiesFilter
      label={t('filter.city')}
      value={cities}
      onChange={(next) => {
        filter({ city: joinList(next) });
      }}
    />
  );

  const clubFilter = (
    <TextField
      select
      label={t('trainings.filter.club')}
      value={search.clubId ?? ''}
      onChange={(event) => {
        const value = event.target.value;
        filter({ clubId: value === '' ? undefined : value });
      }}
    >
      <MenuItem value="">{t('filter.any')}</MenuItem>
      {/* Выбранный клуб не теряется, пока список другого города грузится. */}
      {search.clubId !== undefined &&
        clubs.data?.items.every((club) => club.id !== search.clubId) !== false && (
          <MenuItem value={search.clubId}>{clubName(search.clubId)}</MenuItem>
        )}
      {(clubs.data?.items ?? []).map((club) => (
        <MenuItem key={club.id} value={club.id}>
          {club.name}
        </MenuItem>
      ))}
    </TextField>
  );

  const panel =
    view === 'trainings' ? (
      <Box sx={{ display: 'grid', gap: 2 }}>
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '2fr 1fr 1fr 1fr' },
          }}
        >
          {cityFilter}
          <TextField
            select
            label={t('trainings.filter.age')}
            value={search.age === undefined ? '' : String(search.age)}
            onChange={(event) => {
              const value = event.target.value;
              filter({ age: value === '' ? undefined : Number(value) });
            }}
          >
            <MenuItem value="">{t('filter.any')}</MenuItem>
            {AGES.map((age) => (
              <MenuItem key={age} value={String(age)}>
                {fill(t('trainings.filter.ageValue'), { age: String(age) })}
              </MenuItem>
            ))}
          </TextField>
          <SearchInput
            type="text"
            label={t('trainings.filter.priceTo')}
            value={search.priceTo === undefined ? undefined : String(search.priceTo)}
            onCommit={commitPrice}
            slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 9 } }}
          />
          {language}
        </Box>
        {chipGroup(
          'trainings.filter.kind',
          TRAINING_KINDS,
          kinds,
          (kind) => t(TRAINING_KIND_KEYS[kind]),
          (next) => {
            filter({ kind: joinList(next) });
          },
        )}
        {/* Дни, время и набор — расписание по дням (T3, `docs/11` 3.3.1). */}
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 3fr) minmax(0, 2fr)' },
          }}
        >
          {chipGroup(
            'trainings.filter.days',
            DAY_VALUES,
            days.map(String),
            (day) => weekdayShort(Number(day), locale),
            (next) => {
              filter({ day: joinList([...next].sort()) });
            },
          )}
          <Box sx={{ display: 'grid', gap: 1.5, alignContent: 'start' }}>
            {chipGroup(
              'trainings.filter.time',
              TIMES_OF_DAY,
              times,
              (time) => t(TIME_OF_DAY_KEYS[time]),
              (next) => {
                filter({ time: joinList(next) });
              },
            )}
            <Box>
              <Chip
                label={t('trainings.filter.open')}
                clickable
                variant={search.open === true ? 'filled' : 'outlined'}
                aria-pressed={search.open === true}
                onClick={() => {
                  filter({ open: search.open === true ? undefined : true });
                }}
                sx={{ height: { xs: 44, sm: 40 } }}
              />
            </Box>
          </Box>
        </Box>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 3fr) minmax(0, 2fr)' },
          }}
        >
          {chipGroup(
            'trainings.filter.audience',
            TRAINING_AUDIENCES,
            audiences,
            (audience) => t(TRAINING_AUDIENCE_KEYS[audience]),
            (next) => {
              filter({ audience: joinList(next) });
            },
          )}
          <Box sx={{ display: 'grid', gap: 1.5, alignContent: 'start' }}>
            {chipGroup(
              'trainings.filter.place',
              TRAINING_PLACES,
              places,
              (place) => t(TRAINING_PLACE_KEYS[place]),
              (next) => {
                filter({ place: joinList(next) });
              },
            )}
            {clubFilter}
          </Box>
        </Box>
      </Box>
    ) : (
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' } }}>
        {cityFilter}
        {language}
      </Box>
    );

  return (
    <TrainingDialogHost trainingId={search.training} onOpen={openTraining} onClose={closeTraining}>
      <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
        <Typography variant="h1">{t('page.trainings.title')}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 680 }}>
          {t('trainings.lead')}
        </Typography>

        <Box sx={{ mt: 3 }}>
          <PillTabs
            value={view}
            options={VIEW_OPTIONS}
            label={t('trainings.view.label')}
            onChange={switchView}
          />
        </Box>

        <Box role="search" sx={{ mt: 3, display: 'grid', gap: 1.5 }}>
          {view === 'coaches' && (
            <SearchInput label={t('trainings.filter.name')} value={search.q} onCommit={commitQ} />
          )}
          <Button
            variant="outlined"
            startIcon={<SlidersHorizontal size={16} aria-hidden />}
            aria-expanded={filtersOpen}
            aria-controls={`${id}-filters`}
            onClick={() => {
              setFiltersOpen((open) => !open);
            }}
            sx={{ display: { xs: 'inline-flex', sm: 'none' }, minHeight: 44, justifySelf: 'start' }}
          >
            {hidden === 0
              ? t('clubs.filter.open')
              : fill(t('clubs.filter.openCount'), { count: String(hidden) })}
          </Button>
          <Box
            id={`${id}-filters`}
            sx={{ display: { xs: filtersOpen ? 'block' : 'none', sm: 'block' } }}
          >
            {panel}
          </Box>
        </Box>

        {view === 'trainings' ? (
          <TrainingsList
            search={search}
            page={page}
            filtered={filtered}
            active={active}
            onReset={reset}
          />
        ) : (
          <CoachesList
            search={search}
            page={page}
            filtered={filtered}
            active={active}
            onReset={reset}
          />
        )}
      </Container>
    </TrainingDialogHost>
  );
}

/** Ключ блока: клуб, зал или «выезд и онлайн». */
function groupKey(group: TrainingGroupView): string {
  if (group.club !== null) return `club-${group.club.id}`;
  if (group.venue !== null) return `venue-${group.venue.name}-${group.venue.address}`;

  return 'anywhere';
}

interface ListProps {
  readonly search: TrainingsSearch;
  readonly page: number;
  readonly filtered: boolean;
  readonly active: readonly ActiveFilter[];
  readonly onReset: () => void;
}

/** Сетка карточек: одна колонка на телефоне, три на десктопе. */
const GRID = {
  m: 0,
  p: 0,
  listStyle: 'none',
  display: 'grid',
  gap: 2,
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, minmax(0, 1fr))' },
} as const;

function TrainingsList({ search, page, filtered, active, onReset }: ListProps): ReactNode {
  const t = useT();
  const navigate = Route.useNavigate();
  const trainings = useQuery(trainingsQuery(toTrainingsQuery(search, page)));
  const data = trainings.data;
  const pages = data === undefined ? 1 : Math.max(1, Math.ceil(data.total / data.limit));

  return (
    <>
      {/* Страница считает места, а не тренировки: «найдено» — мест. */}
      <FilterSummary total={null} filters={active} onReset={onReset} />
      {data !== undefined && data.total > 0 && (
        <Typography variant="body2" color="text.secondary" aria-live="polite" sx={{ mt: 2 }}>
          {fill(t('trainings.found'), { count: String(data.total) })}
        </Typography>
      )}
      <Box sx={{ mt: 2 }}>
        <QueryState
          isPending={trainings.isPending}
          error={trainings.error}
          onRetry={() => void trainings.refetch()}
          loading={<RowsSkeleton />}
        >
          {data === undefined ? null : data.items.length > 0 ? (
            <Box data-trainings-list sx={{ display: 'grid', gap: { xs: 2, sm: 3 } }}>
              {data.items.map((group, index) => (
                <Fragment key={groupKey(group)}>
                  <TrainingGroupBlock group={group} />
                  {index === AD_AFTER_GROUP - 1 && <AdSlot placement="trainings-inline" />}
                </Fragment>
              ))}
            </Box>
          ) : filtered ? (
            <EmptyState
              title={t('trainings.notFound.title')}
              text={t('trainings.notFound.text')}
              action={<Button onClick={onReset}>{t('filter.resetAll')}</Button>}
            />
          ) : (
            <EmptyState
              title={t('trainings.empty.title')}
              text={t('trainings.empty.text')}
              action={<Button href="/cabinet">{t('trainings.empty.action')}</Button>}
            />
          )}
        </QueryState>
      </Box>
      <Pagination
        page={page}
        pages={pages}
        onPage={(next) => {
          void navigate({
            search: (previous) => ({ ...previous, page: next === 1 ? undefined : next }),
          });
        }}
      />
    </>
  );
}

function CoachesList({ search, page, filtered, active, onReset }: ListProps): ReactNode {
  const t = useT();
  const navigate = Route.useNavigate();
  const coaches = useQuery(coachesQuery(toCoachesQuery(search, page)));
  const data = coaches.data;
  const pages = data === undefined ? 1 : Math.max(1, Math.ceil(data.total / data.limit));

  return (
    <>
      <FilterSummary
        total={coaches.isError ? null : data?.total}
        filters={active}
        onReset={onReset}
      />
      <Box sx={{ mt: 2 }}>
        <QueryState
          isPending={coaches.isPending}
          error={coaches.error}
          onRetry={() => void coaches.refetch()}
          loading={<RowsSkeleton />}
        >
          {data === undefined ? null : data.items.length > 0 ? (
            <Box component="ul" data-coaches-list sx={GRID}>
              {data.items.map((coach, index) => (
                <Fragment key={coach.id}>
                  <Box component="li" sx={{ minWidth: 0 }}>
                    <CoachCard coach={coach} />
                  </Box>
                  {index === AD_AFTER - 1 && <AdSlot placement="trainings-inline" />}
                </Fragment>
              ))}
            </Box>
          ) : filtered ? (
            <EmptyState
              title={t('trainings.notFound.title')}
              text={t('trainings.notFound.coaches')}
              action={<Button onClick={onReset}>{t('filter.resetAll')}</Button>}
            />
          ) : (
            <EmptyState
              title={t('trainings.empty.coachesTitle')}
              text={t('trainings.empty.text')}
              action={<Button href="/cabinet">{t('trainings.empty.action')}</Button>}
            />
          )}
        </QueryState>
      </Box>
      <Pagination
        page={page}
        pages={pages}
        onPage={(next) => {
          void navigate({
            search: (previous) => ({ ...previous, page: next === 1 ? undefined : next }),
          });
        }}
      />
    </>
  );
}

/** Чипы применённых фильтров под панелью: каждый снимает одно условие. */
function activeFilters(
  search: TrainingsSearch,
  view: TrainingsView,
  helpers: {
    readonly t: (key: MessageKey) => string;
    readonly locale: Locale;
    readonly cityLabel: (id: string) => string;
    readonly clubName: (id: string) => string;
    readonly money: (amount: number) => string;
    readonly filter: (patch: Partial<TrainingsSearch>) => void;
  },
): ActiveFilter[] {
  const { t, locale, cityLabel, clubName, money, filter } = helpers;
  const chip = (label: MessageKey, value: string): string =>
    fill(t('filter.chip'), { label: t(label), value });
  const active: ActiveFilter[] = [];
  const cities = listOf(search.city);

  if (view === 'coaches' && search.q !== undefined) {
    const q = search.q;
    active.push({
      key: 'q',
      label: chip('trainings.filter.name', q),
      onRemove: () => {
        filter({ q: undefined });
      },
    });
  }
  for (const city of cities) {
    active.push({
      key: `city-${city}`,
      label: chip('filter.city', cityLabel(city)),
      onRemove: () => {
        filter({ city: joinList(cities.filter((item) => item !== city)) });
      },
    });
  }
  if (search.language !== undefined) {
    active.push({
      key: 'language',
      label: chip('trainings.filter.language', t(COACH_LANGUAGE_KEYS[search.language])),
      onRemove: () => {
        filter({ language: undefined });
      },
    });
  }

  if (view === 'coaches') return active;

  const kinds = kindsOf(search);
  const audiences = audiencesOf(search);
  const places = placesOf(search);

  for (const kind of kinds) {
    active.push({
      key: `kind-${kind}`,
      label: t(TRAINING_KIND_KEYS[kind]),
      onRemove: () => {
        filter({ kind: joinList(toggleIn(kinds, kind)) });
      },
    });
  }
  for (const audience of audiences) {
    active.push({
      key: `audience-${audience}`,
      label: t(TRAINING_AUDIENCE_KEYS[audience]),
      onRemove: () => {
        filter({ audience: joinList(toggleIn(audiences, audience)) });
      },
    });
  }
  if (search.age !== undefined) {
    active.push({
      key: 'age',
      label: chip(
        'trainings.filter.age',
        fill(t('trainings.filter.ageValue'), { age: String(search.age) }),
      ),
      onRemove: () => {
        filter({ age: undefined });
      },
    });
  }
  for (const place of places) {
    active.push({
      key: `place-${place}`,
      label: t(TRAINING_PLACE_KEYS[place]),
      onRemove: () => {
        filter({ place: joinList(toggleIn(places, place)) });
      },
    });
  }
  if (search.clubId !== undefined) {
    active.push({
      key: 'clubId',
      label: chip('trainings.filter.club', clubName(search.clubId)),
      onRemove: () => {
        filter({ clubId: undefined });
      },
    });
  }
  if (search.priceTo !== undefined) {
    active.push({
      key: 'priceTo',
      label: chip('trainings.filter.priceTo', money(search.priceTo)),
      onRemove: () => {
        filter({ priceTo: undefined });
      },
    });
  }
  const days = daysOf(search);
  const times = timesOf(search);

  for (const day of days) {
    active.push({
      key: `day-${String(day)}`,
      label: weekdayShort(day, locale),
      onRemove: () => {
        filter({ day: joinList(days.filter((item) => item !== day).map(String)) });
      },
    });
  }
  for (const time of times) {
    active.push({
      key: `time-${time}`,
      label: t(TIME_OF_DAY_KEYS[time]),
      onRemove: () => {
        filter({ time: joinList(toggleIn(times, time)) });
      },
    });
  }
  if (search.open === true) {
    active.push({
      key: 'open',
      label: t('trainings.filter.open'),
      onRemove: () => {
        filter({ open: undefined });
      },
    });
  }

  return active;
}
