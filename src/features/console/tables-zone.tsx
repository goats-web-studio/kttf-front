import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

import MatchLine from './match-line';
import type { TableState } from './queue';

interface TablesZoneProps {
  readonly tables: readonly TableState[];
  readonly names: ReadonlyMap<string, string>;
}

/**
 * Зона столов — ТЗ 6.1.
 *
 * Три состояния, а не два: свободен, занят, встреча закрыта и ждёт, когда
 * за стол сядут следующие. Третье существует потому, что счёт вводится
 * раньше, чем игроки уходят от стола.
 */
export default function TablesZone({ tables, names }: TablesZoneProps): ReactNode {
  const t = useT();

  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-400 uppercase">
        {t('console.tables.title')}
      </h2>
      <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tables.map((table) => (
          <li
            key={table.number}
            className={`rounded border p-2 text-sm ${
              table.status === 'PLAYING'
                ? 'border-emerald-700 bg-emerald-950'
                : table.status === 'AWAITING'
                  ? 'border-amber-700 bg-amber-950'
                  : 'border-slate-700 bg-slate-800'
            }`}
          >
            <p className="flex items-baseline justify-between">
              <span className="font-semibold">{table.number}</span>
              <span className="text-xs text-slate-400">
                {table.status === 'PLAYING'
                  ? t('console.table.busy')
                  : table.status === 'AWAITING'
                    ? t('console.table.awaiting')
                    : t('console.table.free')}
              </span>
            </p>
            {table.match !== null && (
              <p className="mt-1 text-xs">
                <MatchLine match={table.match} names={names} />
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
