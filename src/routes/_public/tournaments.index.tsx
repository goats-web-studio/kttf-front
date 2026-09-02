import {
  DEFAULT_PAGE_SIZE,
  type ListTournamentsQuery,
  type TournamentStatus,
} from '@kttf/shared/types';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo, useState, type ReactNode } from 'react';

import { formatDateTime, useLocale, useT } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';
import { useSessionStore } from '@/features/auth/session-store';
import { clubDirectoryQuery } from '@/features/clubs/queries';
import { managedClubIds } from '@/features/clubs/roles';
import { TOURNAMENT_STATUS_KEYS } from '@/features/tournaments/labels';
import { tournamentsQuery } from '@/features/tournaments/queries';

export const Route = createFileRoute('/_public/tournaments/')({
  component: TournamentsPage,
});

/**
 * Статусы, которыми фильтруют публичный календарь.
 *
 * Черновика здесь нет: организатор видит свои черновики в списке и так, а
 * остальным этот фильтр вернул бы пустую страницу и вопрос, куда делись
 * турниры.
 */
const FILTERABLE: readonly TournamentStatus[] = [
  'PUBLISHED',
  'REG_OPEN',
  'REG_CLOSED',
  'RUNNING',
  'FINISHED',
  'RATED',
  'CANCELLED',
];

interface Filters {
  readonly city: string;
  readonly clubId: string;
  readonly status: string;
  readonly from: string;
  readonly to: string;
}

const EMPTY: Filters = { city: '', clubId: '', status: '', from: '', to: '' };

/**
 * Календарь турниров — ТЗ 9.2.
 *
 * Фильтры ТЗ реализованы теми, что даёт контракт ТС 7.5: город, клуб, даты,
 * состояние. Планки рейтинга и возраста в запросе списка нет — расхождение
 * записано открытым вопросом, самовольно контракт не расширяем (бриф 4.2).
 */
function TournamentsPage(): ReactNode {
  const t = useT();
  const locale = useLocale();

  const [draft, setDraft] = useState<Filters>(EMPTY);
  // Применённые фильтры отделены от вводимых: иначе запрос уходит на каждую
  // букву названия города.
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);

  const query = useMemo<ListTournamentsQuery>(() => toQuery(applied, page), [applied, page]);
  const tournaments = useQuery(tournamentsQuery(query));
  const clubs = useQuery(clubDirectoryQuery);

  // Создание турнира стоит там, где организатор смотрит турниры, а не в
  // отдельном разделе кабинета: разделов ТЗ кабинету не отводит.
  const user = useSessionStore((state) => state.user);
  const canCreate = managedClubIds(user).length > 0;

  const pages =
    tournaments.data === undefined
      ? 1
      : Math.max(1, Math.ceil(tournaments.data.total / tournaments.data.limit));

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-900">{t('page.tournaments.title')}</h1>
        {canCreate && (
          <Link to="/tournaments/new" className="rounded bg-slate-900 px-4 py-2 text-sm text-white">
            {t('tournament.form.create')}
          </Link>
        )}
      </div>

      <form
        className="mt-6 grid gap-3 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          setApplied(draft);
          setPage(1);
        }}
      >
        <Field label={t('filter.city')}>
          <input
            value={draft.city}
            onChange={(event) => {
              setDraft({ ...draft, city: event.target.value });
            }}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </Field>

        <Field label={t('filter.club')}>
          <select
            value={draft.clubId}
            onChange={(event) => {
              setDraft({ ...draft, clubId: event.target.value });
            }}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          >
            <option value="">{t('filter.any')}</option>
            {[...(clubs.data?.values() ?? [])].map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('filter.status')}>
          <select
            value={draft.status}
            onChange={(event) => {
              setDraft({ ...draft, status: event.target.value });
            }}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          >
            <option value="">{t('filter.any')}</option>
            {FILTERABLE.map((status) => (
              <option key={status} value={status}>
                {t(TOURNAMENT_STATUS_KEYS[status])}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('filter.from')}>
            <input
              type="date"
              value={draft.from}
              onChange={(event) => {
                setDraft({ ...draft, from: event.target.value });
              }}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </Field>
          <Field label={t('filter.to')}>
            <input
              type="date"
              value={draft.to}
              onChange={(event) => {
                setDraft({ ...draft, to: event.target.value });
              }}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </Field>
        </div>

        <div className="flex items-end gap-3 sm:col-span-2">
          <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
            {t('filter.apply')}
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(EMPTY);
              setApplied(EMPTY);
              setPage(1);
            }}
            className="text-sm text-slate-600 underline"
          >
            {t('filter.reset')}
          </button>
        </div>
      </form>

      <div className="mt-8">
        <QueryState
          isPending={tournaments.isPending}
          error={tournaments.error}
          onRetry={() => void tournaments.refetch()}
        >
          {tournaments.data === undefined ? null : tournaments.data.items.length === 0 ? (
            <p className="py-10 text-center text-slate-500">{t('tournaments.empty')}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {tournaments.data.items.map((tournament) => (
                <li key={tournament.id} className="py-3">
                  <Link
                    to="/tournaments/$tournamentId"
                    params={{ tournamentId: tournament.id }}
                    className="font-medium text-blue-700 underline"
                  >
                    {tournament.name}
                  </Link>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatDateTime(tournament.startsAt, locale)}
                    {' · '}
                    {t(TOURNAMENT_STATUS_KEYS[tournament.status])}
                    {' · '}
                    {clubs.data?.get(tournament.clubId)?.name ?? ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </QueryState>
      </div>

      {pages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-4 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => {
              setPage(page - 1);
            }}
            className="text-blue-700 underline disabled:text-slate-400 disabled:no-underline"
          >
            {t('common.prev')}
          </button>
          <span className="text-slate-600">
            {t('common.page')} {page} / {pages}
          </span>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => {
              setPage(page + 1);
            }}
            className="text-blue-700 underline disabled:text-slate-400 disabled:no-underline"
          >
            {t('common.next')}
          </button>
        </nav>
      )}
    </section>
  );
}

/**
 * Фильтры формы — в запрос ТС 7.5.
 *
 * Границы дат раздвигаются до краёв суток: человек выбирает день, а контракт
 * принимает момент времени. Без этого турнир, начинающийся в полдень, не
 * попал бы в выборку «по сегодня».
 */
function toQuery(filters: Filters, page: number): ListTournamentsQuery {
  return {
    page,
    limit: DEFAULT_PAGE_SIZE,
    ...(filters.city === '' ? {} : { city: filters.city }),
    ...(filters.clubId === '' ? {} : { clubId: filters.clubId }),
    ...(isStatus(filters.status) ? { status: filters.status } : {}),
    ...(filters.from === '' ? {} : { from: `${filters.from}T00:00:00.000Z` }),
    ...(filters.to === '' ? {} : { to: `${filters.to}T23:59:59.999Z` }),
  };
}

function isStatus(value: string): value is TournamentStatus {
  return FILTERABLE.some((status) => status === value);
}

function Field({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <label className="block text-sm">
      <span className="text-slate-700">{label}</span>
      {children}
    </label>
  );
}
