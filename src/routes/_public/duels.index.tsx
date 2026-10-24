import { duelKindSchema, type DuelKind, type ListDuelsQuery } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Swords } from 'lucide-react';
import { useCallback, useState, type ReactNode } from 'react';
import { z } from 'zod';

import { fill, useT, type MessageKey } from '@/common/i18n';
import { orUndefined, searchId, searchPage } from '@/common/search';
import EmptyState from '@/common/ui/empty-state';
import FilterSummary, { type ActiveFilter } from '@/common/ui/filter-summary';
import PageHeader from '@/common/ui/page-header';
import Pagination from '@/common/ui/pagination';
import PillTabs from '@/common/ui/pill-tabs';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { useSessionStore } from '@/features/auth/session-store';
import { clubDirectoryQuery } from '@/features/clubs/queries';
import DuelCard from '@/features/duels/duel-card';
import { KIND_KEYS, MY_DUELS_HREF, newDuelHref } from '@/features/duels/labels';
import { duelsBoardQuery } from '@/features/duels/queries';
import CityFilter from '@/features/places/city-filter';
import { useCityLabel } from '@/features/places/city-label';

const PAGE_SIZE = 20;

const searchSchema = z.object({
  /** Вкладка: открытые по умолчанию, `recent` — сыгранные. */
  scope: z.enum(['recent']).optional().catch(undefined),
  city: searchId,
  club: searchId,
  kind: duelKindSchema.optional().catch(undefined),
  /** Только на рейтинг (`true`) или только без (`false`); нет — любые. */
  rated: z.boolean().optional().catch(undefined),
  page: searchPage,
});

type Search = z.infer<typeof searchSchema>;

export const Route = createFileRoute('/_public/duels/')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: DuelsBoardPage,
});

const SCOPES: readonly (readonly ['open' | 'recent', MessageKey])[] = [
  ['open', 'duel.board.open'],
  ['recent', 'duel.board.recent'],
];

const KINDS: readonly DuelKind[] = ['DUEL', 'SPARRING'];

/**
 * Доска «Дуэли и спарринги» — ADR-065, `docs/13` 5.1.
 *
 * Открытые предложения ближайшими первыми; «Сыгранные» — недавние
 * рейтинговые со счётом. Фильтры город, клуб, вид, «на рейтинг» живут в
 * адресе и применяются сразу (07, 6.2): ссылку «ищут соперника в Алматы»
 * пересылают в чат клуба.
 */
function DuelsBoardPage(): ReactNode {
  const t = useT();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const user = useSessionStore((state) => state.user);
  const clubs = useQuery(clubDirectoryQuery);
  const cityLabel = useCityLabel();
  const recent = search.scope === 'recent';
  const page = search.page ?? 1;

  const query: Partial<ListDuelsQuery> = {
    scope: recent ? 'recent' : 'open',
    page,
    limit: PAGE_SIZE,
    ...(search.city === undefined ? {} : { cityId: search.city }),
    ...(search.club === undefined ? {} : { clubId: search.club }),
    ...(search.kind === undefined ? {} : { kind: search.kind }),
    // Сыгранные на доске — только рейтинговые: фильтр там ничего не меняет.
    ...(recent || search.rated === undefined ? {} : { rated: search.rated }),
  };
  const duels = useQuery({ ...duelsBoardQuery(query), placeholderData: keepPreviousData });

  // Новое условие — с первой страницы: на пятой по другому фильтру может
  // ничего не оказаться.
  const filter = useCallback(
    (patch: Partial<Search>) => {
      void navigate({ search: (previous) => ({ ...previous, ...patch, page: undefined }) });
    },
    [navigate],
  );

  const active: ActiveFilter[] = [];
  if (search.city !== undefined) {
    active.push({
      key: 'city',
      label: fill(t('filter.chip'), { label: t('filter.city'), value: cityLabel(search.city) }),
      onRemove: () => {
        filter({ city: undefined });
      },
    });
  }
  if (search.club !== undefined) {
    active.push({
      key: 'club',
      label: fill(t('filter.chip'), {
        label: t('filter.club'),
        value: clubs.data?.get(search.club)?.name ?? t('common.loading'),
      }),
      onRemove: () => {
        filter({ club: undefined });
      },
    });
  }
  if (search.kind !== undefined) {
    active.push({
      key: 'kind',
      label: t(KIND_KEYS[search.kind]),
      onRemove: () => {
        filter({ kind: undefined });
      },
    });
  }
  if (!recent && search.rated !== undefined) {
    active.push({
      key: 'rated',
      label: t(search.rated ? 'duel.filter.rated.yes' : 'duel.filter.rated.no'),
      onRemove: () => {
        filter({ rated: undefined });
      },
    });
  }

  // На телефоне четыре поля подряд закрывают экран до карточек: первым рядом
  // город и вид, клуб и «на рейтинг» раскрываются (07, 6.2). Поле с заданным
  // значением не прячется — иначе фильтр действует, а его не видно.
  const [more, setMore] = useState(false);
  const extraSet = search.club !== undefined || (!recent && search.rated !== undefined);
  const extra = more || extraSet ? {} : { display: { xs: 'none', sm: 'flex' } };

  const pages =
    duels.data === undefined ? 1 : Math.max(1, Math.ceil(duels.data.total / duels.data.limit));
  const offer = (
    <Button
      href={newDuelHref()}
      variant="contained"
      startIcon={<Swords size={18} aria-hidden />}
      sx={{ minHeight: 44 }}
    >
      {t('duel.offer')}
    </Button>
  );

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <PageHeader
        title={t('page.duels.title')}
        subtitle={t('duel.board.lead')}
        // Гость тоже видит кнопку: охрана кабинета отправит его на вход и
        // вернёт к форме.
        actions={
          <>
            {user?.playerId != null && (
              <Button href={MY_DUELS_HREF} variant="text" sx={{ minHeight: 44 }}>
                {t('duel.mine.title')}
              </Button>
            )}
            {offer}
          </>
        }
      />

      <PillTabs
        label={t('duel.board.scope')}
        value={recent ? 'recent' : 'open'}
        options={SCOPES}
        onChange={(next) => {
          filter({ scope: next === 'recent' ? 'recent' : undefined });
        }}
      />

      <Box
        role="search"
        sx={{
          mt: 2,
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, 1fr)' },
        }}
      >
        <CityFilter
          value={search.city}
          onChange={(city) => {
            filter({ city });
          }}
        />
        <TextField
          select
          label={t('filter.club')}
          sx={extra}
          value={search.club ?? ''}
          onChange={(event) => {
            filter({ club: orUndefined(event.target.value) });
          }}
        >
          <MenuItem value="">{t('filter.any')}</MenuItem>
          {[...(clubs.data?.values() ?? [])].map((club) => (
            <MenuItem key={club.id} value={club.id}>
              {club.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label={t('duel.filter.kind')}
          value={search.kind ?? ''}
          onChange={(event) => {
            filter({ kind: KINDS.find((kind) => kind === event.target.value) });
          }}
          slotProps={{ htmlInput: { 'data-duel-filter': 'kind' } }}
        >
          <MenuItem value="">{t('filter.any')}</MenuItem>
          {KINDS.map((kind) => (
            <MenuItem key={kind} value={kind}>
              {t(KIND_KEYS[kind])}
            </MenuItem>
          ))}
        </TextField>
        {!recent && (
          <TextField
            select
            label={t('duel.filter.rated')}
            sx={extra}
            value={search.rated === undefined ? '' : String(search.rated)}
            onChange={(event) => {
              const value = event.target.value;
              filter({ rated: value === '' ? undefined : value === 'true' });
            }}
          >
            <MenuItem value="">{t('filter.any')}</MenuItem>
            <MenuItem value="true">{t('duel.filter.rated.yes')}</MenuItem>
            <MenuItem value="false">{t('duel.filter.rated.no')}</MenuItem>
          </TextField>
        )}
        {!extraSet && (
          <Button
            variant="text"
            aria-expanded={more}
            onClick={() => {
              setMore(!more);
            }}
            sx={{ justifySelf: 'start', minHeight: 44, display: { sm: 'none' } }}
          >
            {more ? t('filter.less') : t('filter.more')}
          </Button>
        )}
      </Box>

      <FilterSummary
        total={duels.isError ? null : duels.data?.total}
        filters={active}
        onReset={() => {
          void navigate({ search: { scope: search.scope } });
        }}
      />

      <Box sx={{ mt: 2 }}>
        <QueryState
          isPending={duels.isPending}
          error={duels.error}
          onRetry={() => void duels.refetch()}
          loading={<RowsSkeleton />}
        >
          {duels.data?.items.length === 0 ? (
            <EmptyState
              title={t(recent ? 'duel.board.emptyRecent' : 'duel.board.empty')}
              {...(recent ? {} : { text: t('duel.board.emptyText'), action: offer })}
            />
          ) : (
            <Box
              data-duel-board
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                opacity: duels.isPlaceholderData ? 0.6 : 1,
              }}
            >
              {duels.data?.items.map((duel) => (
                <DuelCard key={duel.id} duel={duel} />
              ))}
            </Box>
          )}
        </QueryState>
      </Box>

      <Pagination
        page={page}
        pages={pages}
        onPage={(next) => {
          void navigate({
            search: (previous) => ({ ...previous, page: next > 1 ? next : undefined }),
          });
        }}
      />
    </Container>
  );
}
