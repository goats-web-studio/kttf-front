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
      <h2 className="text-sm font-semibold text-night-ink-500">{t('console.tables.title')}</h2>
      <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tables.map((table) => (
          <li
            key={table.number}
            // Идущий матч маркируется красным — принцип 1.3 дизайн-системы.
            // Состояние при этом всегда написано словом рядом: цвет здесь
            // второй носитель смысла, а не единственный (запрет №6).
            className={`rounded-sm border p-2 text-sm ${
              table.status === 'PLAYING'
                ? 'border-night-red bg-night-raised'
                : table.status === 'AWAITING'
                  ? 'border-night-warn bg-night-raised'
                  : 'border-night-line bg-night-raised'
            }`}
          >
            <p className="flex items-baseline justify-between">
              <span className="font-semibold">{table.number}</span>
              <span className="text-xs text-night-ink-500">
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
