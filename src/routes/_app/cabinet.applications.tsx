import { COACH_STATUSES, type ClubApplicationView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { z } from 'zod';

import { errorMessageKey } from '@/common/api';
import { fill, useLocale, useT } from '@/common/i18n';
import { formatDateTime } from '@/common/i18n/format';
import EmptyState from '@/common/ui/empty-state';
import { BackLink } from '@/common/ui/page-header';
import Pagination from '@/common/ui/pagination';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { useSessionStore } from '@/features/auth/session-store';
import { updateClubApplication } from '@/features/club-applications/api';
import {
  clubApplicationKeys,
  clubApplicationsQuery,
  newClubApplicationsCountQuery,
} from '@/features/club-applications/queries';
import CoachApplications from '@/features/coaches/admin/coach-applications';
import { pendingCoachesCountQuery } from '@/features/coaches/queries';

/**
 * Вкладка и страница — в адресе: ссылку на «все, вторая страница» можно
 * открыть заново. `tab` — клубы или тренеры (ADR-059), `status` — фильтр
 * заявок тренеров, по умолчанию ждущие проверки.
 */
const searchSchema = z.object({
  tab: z.coerce
    .string()
    .pipe(z.enum(['clubs', 'coaches']))
    .catch('clubs'),
  view: z.enum(['new', 'all']).catch('new'),
  status: z.coerce.string().pipe(z.enum(COACH_STATUSES)).catch('PENDING'),
  page: z.coerce.number().int().positive().catch(1),
});

export const Route = createFileRoute('/_app/cabinet/applications')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: ApplicationsPage,
});

/**
 * Заявки клубов — ADR-047.
 *
 * Сюда приходит форма «Напишите нам» с сайта. Администратор связывается
 * с клубом сам и отмечает заявку обработанной. Страница проверяет признак
 * администратора, чтобы не показывать чужое; права проверяет сервер (ТС 8.3).
 */
function ApplicationsPage(): ReactNode {
  const t = useT();
  const user = useSessionStore((state) => state.user);

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <BackLink href="/cabinet" label={t('page.cabinet.title')} />
      <Typography variant="h1" sx={{ mt: 1 }}>
        {t('applications.title')}
      </Typography>

      {user?.isAdmin === true ? (
        <>
          <Sections />
        </>
      ) : (
        <Box sx={{ mt: 3 }}>
          <EmptyState
            title={t('applications.forbidden.title')}
            text={t('places.forbidden.text')}
            action={<Button href="/cabinet">{t('page.cabinet.title')}</Button>}
          />
        </Box>
      )}
    </Container>
  );
}

/**
 * Заявки клубов и тренеров — вкладками одного раздела (`docs/11` 3.1).
 * Число ждущих — на вкладке, как на кнопке в кабинете.
 */
function Sections(): ReactNode {
  const t = useT();
  const navigate = useNavigate({ from: Route.fullPath });
  const { tab, status, page } = Route.useSearch();
  const clubs = useQuery(newClubApplicationsCountQuery).data ?? 0;
  const coaches = useQuery(pendingCoachesCountQuery).data ?? 0;
  const counted = (label: string, count: number): string =>
    count > 0 ? `${label} (${String(count)})` : label;

  return (
    <>
      <Tabs
        value={tab}
        onChange={(_, next: 'clubs' | 'coaches') => {
          void navigate({ search: { tab: next, view: 'new', status: 'PENDING', page: 1 } });
        }}
        aria-label={t('page.applications.title')}
        sx={{ mt: 3 }}
      >
        <Tab value="clubs" label={counted(t('applications.tab.clubs'), clubs)} />
        <Tab value="coaches" label={counted(t('applications.tab.coaches'), coaches)} />
      </Tabs>
      {tab === 'clubs' ? (
        <>
          <Typography color="text.secondary" sx={{ mt: 3 }}>
            {t('applications.lead')}
          </Typography>
          <Applications />
        </>
      ) : (
        <Box sx={{ mt: 3 }}>
          <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 680 }}>
            {t('applications.coaches.lead')}
          </Typography>
          <CoachApplications
            status={status}
            page={page}
            onStatus={(next) => {
              void navigate({ search: (previous) => ({ ...previous, status: next, page: 1 }) });
            }}
            onPage={(next) => {
              void navigate({ search: (previous) => ({ ...previous, page: next }) });
            }}
          />
        </Box>
      )}
    </>
  );
}

function Applications(): ReactNode {
  const t = useT();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const { view, page } = Route.useSearch();
  const list = useQuery(clubApplicationsQuery(view === 'new' ? 'NEW' : undefined, page));

  const mark = useMutation({
    mutationFn: ({ id, done }: { readonly id: string; readonly done: boolean }) =>
      updateClubApplication(id, { status: done ? 'DONE' : 'NEW' }),
    // Заявка уходит из «Новых», и число на карточке кабинета меняется.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clubApplicationKeys.all }),
  });

  const pages =
    list.data === undefined ? 1 : Math.max(1, Math.ceil(list.data.total / list.data.limit));

  return (
    <Box sx={{ mt: 4 }}>
      <Tabs
        value={view}
        onChange={(_, next: 'new' | 'all') => {
          void navigate({ search: (previous) => ({ ...previous, view: next, page: 1 }) });
        }}
        aria-label={t('page.applications.title')}
      >
        <Tab value="new" label={t('applications.view.new')} />
        <Tab value="all" label={t('applications.view.all')} />
      </Tabs>

      <Box key={view} className="tab-panel-in" sx={{ mt: 3 }}>
        <QueryState
          isPending={list.isPending}
          error={list.error}
          onRetry={() => void list.refetch()}
          loading={<RowsSkeleton rows={3} />}
        >
          {list.data?.items.length === 0 ? (
            <EmptyState
              title={t(view === 'new' ? 'applications.empty.new' : 'applications.empty.all')}
            />
          ) : (
            <Stack component="ol" spacing={2} sx={{ m: 0, p: 0, listStyle: 'none' }}>
              {list.data?.items.map((item) => (
                <ApplicationCard
                  key={item.id}
                  item={item}
                  pending={mark.isPending && mark.variables.id === item.id}
                  onMark={(done) => {
                    mark.mutate({ id: item.id, done });
                  }}
                />
              ))}
            </Stack>
          )}
        </QueryState>

        {mark.error !== null && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {t(errorMessageKey(mark.error))}
          </Alert>
        )}

        {pages > 1 && (
          <Box sx={{ mt: 3 }}>
            <Pagination
              page={page}
              pages={pages}
              onPage={(next) => {
                void navigate({ search: (previous) => ({ ...previous, page: next }) });
              }}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}

/**
 * Заявка карточкой: клуб и город — заголовком, ниже кто и как связаться,
 * потом то, что клуб написал о себе. Новая — с меткой и главной кнопкой
 * «Обработано»; обработанную можно вернуть, если отметили по ошибке.
 */
function ApplicationCard({
  item,
  pending,
  onMark,
}: {
  readonly item: ClubApplicationView;
  readonly pending: boolean;
  readonly onMark: (done: boolean) => void;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const fresh = item.status === 'NEW';

  return (
    <Paper
      component="li"
      variant="outlined"
      sx={{
        p: { xs: 2, sm: 3 },
        // Новая заявка — красная черта слева, как идущая встреча в консоли:
        // одна яркая деталь, статус при этом написан словом.
        borderLeft: fresh ? '4px solid var(--red-600)' : undefined,
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'baseline' } }}
      >
        <Typography variant="h3" component="h2">
          {item.clubName} · {item.city}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {t(fresh ? 'applications.status.new' : 'applications.status.done')} ·{' '}
          {formatDateTime(item.createdAt, locale)}
        </Typography>
      </Stack>

      <Box
        component="dl"
        sx={{
          mt: 2,
          mb: 0,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'max-content 1fr' },
          columnGap: 3,
          rowGap: { xs: 0.25, sm: 1 },
          '& dt': { color: 'text.secondary', typography: 'body2', mt: { xs: 1, sm: 0 } },
          '& dd': { m: 0, typography: 'body1', overflowWrap: 'anywhere', whiteSpace: 'pre-line' },
        }}
      >
        <Field label={t('apply.field.name')} value={item.name} />
        <Field label={t('apply.field.contact')} value={<Contact value={item.contact} />} />
        <Field label={t('apply.field.address')} value={item.address} />
        <Field
          label={t('apply.field.tableCount')}
          value={item.tableCount === null ? null : String(item.tableCount)}
        />
        <Field label={t('apply.field.tournaments')} value={item.tournaments} />
        <Field label={t('apply.field.message')} value={item.message} />
      </Box>

      {item.userId !== null && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {t('applications.fromAccount')}
        </Typography>
      )}

      <Box sx={{ mt: 2.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
        {/* Клуб заводится отсюда, с полями заявки (ADR-049). Обе кнопки —
            обводкой: заявок на экране несколько, а главная кнопка одна. */}
        {fresh && (
          <Button href={newClubHref(item)} sx={{ minHeight: 44 }}>
            {t('applications.createClub')}
          </Button>
        )}
        <Button
          variant={fresh ? 'outlined' : 'text'}
          disabled={pending}
          onClick={() => {
            onMark(fresh);
          }}
          sx={{ minHeight: 44 }}
        >
          {t(fresh ? 'applications.markDone' : 'applications.reopen')}
        </Button>
        {item.handledAt !== null && (
          <Typography variant="body2" color="text.secondary">
            {fill(t('applications.handledAt'), { when: formatDateTime(item.handledAt, locale) })}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

/** Строка «подпись — значение»; пустое необязательное поле не показывается. */
function Field({ label, value }: { readonly label: string; readonly value: ReactNode }): ReactNode {
  if (value === null || value === '') {
    return null;
  }

  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

/**
 * Контакт ссылкой, когда понятно, что это: почта — `mailto:`, телефон —
 * `tel:`. Написано как-то иначе — просто текстом.
 */
function Contact({ value }: { readonly value: string }): ReactNode {
  const digits = value.replace(/[^\d+]/g, '');
  const href = value.includes('@')
    ? `mailto:${value}`
    : digits.replace('+', '').length >= 10
      ? `tel:${digits}`
      : null;

  return href === null ? value : <a href={href}>{value}</a>;
}

/** Форма нового клуба, заполненная заявкой: название, адрес, столы, описание. */
function newClubHref(item: ClubApplicationView): string {
  const search = new URLSearchParams({ application: item.id, name: item.clubName });

  if (item.address !== null) search.set('address', item.address);
  if (item.tableCount !== null) search.set('tables', String(item.tableCount));
  if (item.message !== null) search.set('about', item.message);

  return `/cabinet/clubs/new?${search.toString()}`;
}
