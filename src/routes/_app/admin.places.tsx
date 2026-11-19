import type { CityView, CountryView, RegionView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT } from '@/common/i18n';
import { BackLink } from '@/common/ui/page-header';
import EmptyState from '@/common/ui/empty-state';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { useSessionStore } from '@/features/auth/session-store';
import { updateCity, updateCountry, updateRegion } from '@/features/places/api';
import CityDialog from '@/features/places/city-dialog';
import CountryDialog from '@/features/places/country-dialog';
import { defaultCountry } from '@/features/places/countries';
import { usePlaceName } from '@/features/places/place-name';
import PlaceTable from '@/features/places/place-table';
import {
  adminCitiesQuery,
  adminCountriesQuery,
  adminRegionsQuery,
  placeKeys,
} from '@/features/places/queries';
import RegionDialog from '@/features/places/region-dialog';

export const Route = createFileRoute('/_app/admin/places')({
  component: PlacesPage,
});

/** Открытый диалог: новая запись (`undefined`) или правка существующей. */
type Editing<T> = { readonly entry: T | undefined } | null;

/**
 * Справочник стран, областей и городов — ADR-046, ADR-096.
 *
 * Ведёт администратор платформы. Страница проверяет признак сама, чтобы не
 * показывать формы, которые сервер всё равно отвергнет; права на запись
 * проверяет сервер (ТС 8.3).
 *
 * Записи не удаляются, а скрываются: на город ссылаются клубы и игроки.
 */
function PlacesPage(): ReactNode {
  const t = useT();
  const user = useSessionStore((state) => state.user);

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <BackLink href="/cabinet" label={t('page.cabinet.title')} />
      <Typography variant="h1" sx={{ mt: 1 }}>
        {t('page.places.title')}
      </Typography>

      {user?.isAdmin === true ? (
        <>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {t('places.lead')}
          </Typography>
          <Places />
        </>
      ) : (
        <Box sx={{ mt: 3 }}>
          <EmptyState
            title={t('places.forbidden.title')}
            text={t('places.forbidden.text')}
            action={<Button href="/cabinet">{t('page.cabinet.title')}</Button>}
          />
        </Box>
      )}
    </Container>
  );
}

function Places(): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const countries = useQuery(adminCountriesQuery);
  const [editing, setEditing] = useState<Editing<CountryView>>(null);
  const [chosen, setChosen] = useState<string | undefined>(undefined);

  const list = countries.data ?? [];
  // Выбранная страна — пока не выбрали другую, Казахстан.
  const country = list.find((item) => item.id === chosen) ?? defaultCountry(list);

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { readonly id: string; readonly isActive: boolean }) =>
      updateCountry(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: placeKeys.all }),
  });

  return (
    <>
      <Box component="section" sx={{ mt: 5 }}>
        <SectionHead
          title={t('places.countries.title')}
          action={t('places.country.add')}
          onAction={() => {
            setEditing({ entry: undefined });
          }}
        />
        <Box sx={{ mt: 2 }}>
          <QueryState
            isPending={countries.isPending}
            error={countries.error}
            onRetry={() => void countries.refetch()}
            loading={<RowsSkeleton rows={2} />}
          >
            {list.length === 0 ? (
              <EmptyState title={t('places.countries.empty')} />
            ) : (
              <PlaceTable
                rows={list}
                label={t('places.countries.title')}
                withCode
                pendingId={toggle.isPending ? toggle.variables.id : undefined}
                onEdit={(entry) => {
                  setEditing({ entry });
                }}
                onToggle={(row, isActive) => {
                  toggle.mutate({ id: row.id, isActive });
                }}
              />
            )}
          </QueryState>
          {toggle.error !== null && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {t(errorMessageKey(toggle.error))}
            </Alert>
          )}
        </Box>
      </Box>

      {country !== undefined && (
        <CountryPlaces
          country={country}
          countries={list}
          onCountry={(id) => {
            setChosen(id);
          }}
        />
      )}

      {editing !== null && (
        <CountryDialog
          country={editing.entry}
          onClose={() => {
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

/** Области и города выбранной страны — со скрытыми. */
function CountryPlaces({
  country,
  countries,
  onCountry,
}: {
  readonly country: CountryView;
  readonly countries: readonly CountryView[];
  readonly onCountry: (id: string) => void;
}): ReactNode {
  const t = useT();
  const placeName = usePlaceName();
  const regions = useQuery(adminRegionsQuery(country.id));

  return (
    <>
      <Box sx={{ mt: 6 }}>
        {/* Страна одна — выбирать нечего, она названа под заголовком. */}
        {countries.length > 1 ? (
          <TextField
            select
            label={t('places.country')}
            value={country.id}
            onChange={(event) => {
              onCountry(event.target.value);
            }}
            sx={{ maxWidth: { sm: 320 } }}
          >
            {countries.map((item) => (
              <MenuItem key={item.id} value={item.id}>
                {placeName(item)}
              </MenuItem>
            ))}
          </TextField>
        ) : (
          <Typography color="text.secondary">{placeName(country)}</Typography>
        )}
      </Box>

      <Regions country={country} regions={regions} />
      <Cities country={country} regions={regions.data ?? []} />
    </>
  );
}

/** Области страны — ADR-096. */
function Regions({
  country,
  regions,
}: {
  readonly country: CountryView;
  readonly regions: UseQueryResult<readonly RegionView[]>;
}): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Editing<RegionView>>(null);

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { readonly id: string; readonly isActive: boolean }) =>
      updateRegion(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: placeKeys.all }),
  });

  return (
    <Box component="section" sx={{ mt: 4 }}>
      <SectionHead
        title={t('places.regions.title')}
        action={t('places.region.add')}
        onAction={() => {
          setEditing({ entry: undefined });
        }}
      />

      <Box sx={{ mt: 2 }}>
        <QueryState
          isPending={regions.isPending}
          error={regions.error}
          onRetry={() => void regions.refetch()}
          loading={<RowsSkeleton rows={3} />}
        >
          {(regions.data ?? []).length === 0 ? (
            <EmptyState title={t('places.regions.empty')} />
          ) : (
            <PlaceTable
              rows={regions.data ?? []}
              label={t('places.regions.title')}
              pendingId={toggle.isPending ? toggle.variables.id : undefined}
              onEdit={(entry) => {
                setEditing({ entry });
              }}
              onToggle={(row, isActive) => {
                toggle.mutate({ id: row.id, isActive });
              }}
            />
          )}
        </QueryState>
        {toggle.error !== null && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {t(errorMessageKey(toggle.error))}
          </Alert>
        )}
      </Box>

      {editing !== null && (
        <RegionDialog
          countryId={country.id}
          region={editing.entry}
          onClose={() => {
            setEditing(null);
          }}
        />
      )}
    </Box>
  );
}

/** Города страны — со скрытыми и с областью. */
function Cities({
  country,
  regions,
}: {
  readonly country: CountryView;
  readonly regions: readonly RegionView[];
}): ReactNode {
  const t = useT();
  const placeName = usePlaceName();
  const queryClient = useQueryClient();
  const cities = useQuery(adminCitiesQuery(country.id));
  const [editing, setEditing] = useState<Editing<CityView>>(null);

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { readonly id: string; readonly isActive: boolean }) =>
      updateCity(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: placeKeys.all }),
  });

  const regionName = (city: CityView): string | null => {
    const region = regions.find((item) => item.id === city.regionId);
    return region === undefined ? null : placeName(region);
  };

  return (
    <Box component="section" sx={{ mt: 6 }}>
      <SectionHead
        title={t('places.cities.title')}
        action={t('places.city.add')}
        onAction={() => {
          setEditing({ entry: undefined });
        }}
      />

      <Box sx={{ mt: 2 }}>
        <QueryState
          isPending={cities.isPending}
          error={cities.error}
          onRetry={() => void cities.refetch()}
          loading={<RowsSkeleton rows={3} />}
        >
          {(cities.data ?? []).length === 0 ? (
            <EmptyState title={t('places.cities.empty')} />
          ) : (
            <PlaceTable
              rows={cities.data ?? []}
              label={t('places.cities.title')}
              extra={{ label: t('places.field.region'), value: regionName }}
              pendingId={toggle.isPending ? toggle.variables.id : undefined}
              onEdit={(entry) => {
                setEditing({ entry });
              }}
              onToggle={(row, isActive) => {
                toggle.mutate({ id: row.id, isActive });
              }}
            />
          )}
        </QueryState>
        {toggle.error !== null && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {t(errorMessageKey(toggle.error))}
          </Alert>
        )}
      </Box>

      {editing !== null && (
        <CityDialog
          countryId={country.id}
          city={editing.entry}
          regions={regions}
          onClose={() => {
            setEditing(null);
          }}
        />
      )}
    </Box>
  );
}

function SectionHead({
  title,
  action,
  onAction,
}: {
  readonly title: string;
  readonly action: string;
  readonly onAction: () => void;
}): ReactNode {
  return (
    <Stack
      direction="row"
      useFlexGap
      spacing={2}
      sx={{ alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}
    >
      <Typography variant="h2">{title}</Typography>
      <Button onClick={onAction} sx={{ minHeight: 44 }}>
        {action}
      </Button>
    </Stack>
  );
}
