import { DEFAULT_PAGE_SIZE, type ListPlayersQuery } from '@kttf/shared/types';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState, type ReactNode } from 'react';

import { useT } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';
import { clubDirectoryQuery } from '@/features/clubs/queries';
import { playerName } from '@/features/players/player-name';
import { playersQuery } from '@/features/players/queries';

export const Route = createFileRoute('/_public/ratings')({
  component: RatingsPage,
});

interface Filters {
  readonly search: string;
  readonly city: string;
  readonly clubId: string;
}

const EMPTY: Filters = { search: '', city: '', clubId: '' };

/**
 * Рейтинг по стране — ТЗ 9.1.
 *
 * Порядок задаёт сервер: рейтинг приходит строкой, и сортировка строк на
 * клиенте поставила бы «9.50» выше «100.00». Фильтры — те, что даёт контракт
 * ТС 7.2: поиск, город, клуб. Пола и возрастной категории в запросе нет,
 * расхождение с ТЗ записано открытым вопросом.
 *
 * История изменений рейтинга (ТЗ 9.1) ждёт маршрута `players/:id/
 * rating-history`, которого в бэкенде ещё нет.
 */
function RatingsPage(): ReactNode {
  const t = useT();

  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);

  const query = useMemo<ListPlayersQuery>(() => toQuery(applied, page), [applied, page]);
  const players = useQuery(playersQuery(query));
  const clubs = useQuery(clubDirectoryQuery);

  const pages =
    players.data === undefined
      ? 1
      : Math.max(1, Math.ceil(players.data.total / players.data.limit));

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">{t('page.ratings.title')}</h1>

      <form
        className="mt-6 grid gap-3 sm:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          setApplied(draft);
          setPage(1);
        }}
      >
        <label className="block text-sm">
          <span className="text-slate-700">{t('ratings.search')}</span>
          <input
            value={draft.search}
            onChange={(event) => {
              setDraft({ ...draft, search: event.target.value });
            }}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span className="text-slate-700">{t('filter.city')}</span>
          <input
            value={draft.city}
            onChange={(event) => {
              setDraft({ ...draft, city: event.target.value });
            }}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span className="text-slate-700">{t('filter.club')}</span>
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
        </label>

        <div className="flex items-end gap-3 sm:col-span-3">
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
          isPending={players.isPending}
          error={players.error}
          onRetry={() => void players.refetch()}
        >
          {players.data === undefined ? null : players.data.items.length === 0 ? (
            <p className="py-10 text-center text-slate-500">{t('ratings.empty')}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th scope="col" className="py-2 font-normal">
                    {t('ratings.column.rank')}
                  </th>
                  <th scope="col" className="py-2 font-normal">
                    {t('ratings.column.player')}
                  </th>
                  <th scope="col" className="py-2 font-normal">
                    {t('ratings.column.city')}
                  </th>
                  <th scope="col" className="py-2 font-normal">
                    {t('ratings.column.rating')}
                  </th>
                  <th scope="col" className="py-2 font-normal">
                    {t('ratings.column.matches')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {players.data.items.map((player, index) => (
                  <tr key={player.id} className="border-b border-slate-100">
                    <td className="py-2 text-slate-500">
                      {(page - 1) * players.data.limit + index + 1}
                    </td>
                    <td className="py-2 text-slate-900">
                      {playerName(player)}
                      {player.isProvisional && (
                        // Провизорный рейтинг двигается быстрее и означает, что
                        // игрок сыграл меньше 20 рейтинговых встреч (ТЗ 7.1).
                        <span className="ml-2 text-xs text-slate-500">
                          {t('ratings.provisional')}
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-slate-600">{player.city}</td>
                    <td className="py-2 tabular-nums font-medium text-slate-900">
                      {player.rating}
                    </td>
                    <td className="py-2 tabular-nums text-slate-600">{player.ratedMatches}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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

function toQuery(filters: Filters, page: number): ListPlayersQuery {
  return {
    page,
    limit: DEFAULT_PAGE_SIZE,
    ...(filters.search === '' ? {} : { search: filters.search }),
    ...(filters.city === '' ? {} : { city: filters.city }),
    ...(filters.clubId === '' ? {} : { clubId: filters.clubId }),
  };
}
