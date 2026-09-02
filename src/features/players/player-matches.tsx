import { DEFAULT_PAGE_SIZE } from '@kttf/shared/types';
import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { useT } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';

import MatchesTable from './matches-table';
import { playerMatchesQuery } from './queries';

interface PlayerMatchesProps {
  readonly playerId: string;
  readonly onSelectOpponent: (opponentId: string) => void;
}

/**
 * История встреч — ТЗ 9.3.
 *
 * Фильтров, которых требует ТЗ, здесь нет: `playerMatchesQuerySchema` — это
 * ровно постраничность, других полей в контракте ТС 7.2 не заведено.
 * Отфильтровать загруженную страницу на клиенте нельзя по той же причине,
 * по которой личный счёт считает сервер: фильтр по одной странице показал бы
 * не историю, а её случайный срез. Расхождение записано открытым вопросом
 * ОВ-19, самовольно контракт не расширялся (бриф 4.2).
 */
export default function PlayerMatches({
  playerId,
  onSelectOpponent,
}: PlayerMatchesProps): ReactNode {
  const t = useT();
  const [page, setPage] = useState(1);

  const matches = useQuery(playerMatchesQuery(playerId, { page, limit: DEFAULT_PAGE_SIZE }));

  const pages =
    matches.data === undefined
      ? 1
      : Math.max(1, Math.ceil(matches.data.total / matches.data.limit));

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-slate-900">{t('player.matches.title')}</h2>

      <QueryState
        isPending={matches.isPending}
        error={matches.error}
        onRetry={() => void matches.refetch()}
      >
        {matches.data === undefined ? null : matches.data.items.length === 0 ? (
          <p className="mt-3 text-slate-500">{t('player.matches.empty')}</p>
        ) : (
          <MatchesTable matches={matches.data.items} onSelectOpponent={onSelectOpponent} />
        )}
      </QueryState>

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
