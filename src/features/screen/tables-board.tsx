import type { MatchView } from '@kttf/shared/types';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import type { TableState } from '@/features/console/queue';

interface TablesBoardProps {
  readonly tables: readonly TableState[];
  readonly names: ReadonlyMap<string, string>;
}

/**
 * Столы зала — ТЗ 6.5.
 *
 * Своя вёрстка, а не консольная: на телевизор смотрят с десяти метров, и всё,
 * что здесь есть, — номер стола, две фамилии и счёт. Кнопок нет вовсе: экран
 * ничего не умеет, кроме показа.
 *
 * Состояние стола различается по цвету, а не подписью: слово «Занят» с той же
 * дистанции не читается.
 */
export default function TablesBoard({ tables, names }: TablesBoardProps): ReactNode {
  const t = useT();

  return (
    <section>
      <h2 className="text-xl font-semibold tracking-wide text-slate-400 uppercase">
        {t('screen.tables.title')}
      </h2>
      <ul className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-3">
        {tables.map((table) => (
          <li
            key={table.number}
            className={`rounded-lg border-2 p-4 ${
              table.status === 'PLAYING'
                ? 'border-emerald-500 bg-emerald-950'
                : table.status === 'AWAITING'
                  ? 'border-amber-600 bg-amber-950'
                  : 'border-slate-700 bg-slate-900'
            }`}
          >
            <p className="text-3xl font-bold text-slate-300 tabular-nums">{table.number}</p>

            {table.match === null ? (
              <p className="mt-2 text-xl text-slate-500">{t('screen.table.free')}</p>
            ) : (
              <TableMatch match={table.match} names={names} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function TableMatch({
  match,
  names,
}: {
  readonly match: MatchView;
  readonly names: ReadonlyMap<string, string>;
}): ReactNode {
  const t = useT();
  const played = match.setsA !== null && match.setsB !== null;

  return (
    <div className="mt-2 space-y-1">
      <Side
        id={match.playerAId}
        names={names}
        sets={match.setsA}
        won={played && (match.setsA ?? 0) > (match.setsB ?? 0)}
      />
      <Side
        id={match.playerBId}
        names={names}
        sets={match.setsB}
        won={played && (match.setsB ?? 0) > (match.setsA ?? 0)}
      />
      {!played && <p className="text-lg text-emerald-300">{t('screen.match.playing')}</p>}
    </div>
  );
}

function Side({
  id,
  names,
  sets,
  won,
}: {
  readonly id: string | null;
  readonly names: ReadonlyMap<string, string>;
  readonly sets: number | null;
  readonly won: boolean;
}): ReactNode {
  const t = useT();

  return (
    <p className="flex items-baseline justify-between gap-4 text-2xl">
      <span className={won ? 'font-bold text-white' : 'text-slate-200'}>
        {id === null ? t('screen.match.pending') : (names.get(id) ?? t('screen.match.pending'))}
      </span>
      {sets !== null && <span className="font-bold tabular-nums">{sets}</span>}
    </p>
  );
}
