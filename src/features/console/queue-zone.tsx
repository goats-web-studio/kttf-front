import { useState, type ReactNode } from 'react';

import { useT } from '@/common/i18n';

import MatchLine from './match-line';
import type { QueuedMatch, TableState } from './queue';

interface QueueZoneProps {
  readonly queue: readonly QueuedMatch[];
  readonly tables: readonly TableState[];
  readonly suggested: number | null;
  readonly names: ReadonlyMap<string, string>;
  readonly onAssign: (matchId: string, tableNumber: number) => void;
}

/**
 * Зона «В ожидании» — ТЗ 6.1 и 6.2.
 *
 * Порядок задан очередью: первым идёт тот, кто дольше не играл. Назначение —
 * в один тап на предложенный стол; выбор другого стола спрятан рядом, чтобы
 * не превращать обычный случай в два действия.
 */
export default function QueueZone({
  queue,
  tables,
  suggested,
  names,
  onAssign,
}: QueueZoneProps): ReactNode {
  const t = useT();

  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-400 uppercase">{t('console.queue.title')}</h2>

      {queue.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{t('console.queue.empty')}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {queue.map((item, index) => (
            <li
              key={item.match.id}
              className="rounded border border-slate-700 bg-slate-800 p-3 text-sm"
            >
              <p className="text-xs text-slate-400">
                {item.stageName}
                {item.groupLabel === null ? '' : ` · ${item.groupLabel}`}
              </p>
              <MatchLine match={item.match} names={names} />

              <p className="mt-1 flex gap-2 text-xs">
                {/* Подсказки ТЗ 6.3: судья решает, кого звать, по ним. */}
                {index === 0 && <span className="text-sky-400">{t('console.hint.waiting')}</span>}
                {item.lastForBoth && (
                  <span className="text-slate-400">{t('console.hint.lastForBoth')}</span>
                )}
              </p>

              <Assign
                tables={tables}
                suggested={suggested}
                onAssign={(tableNumber) => {
                  onAssign(item.match.id, tableNumber);
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Assign({
  tables,
  suggested,
  onAssign,
}: {
  readonly tables: readonly TableState[];
  readonly suggested: number | null;
  readonly onAssign: (tableNumber: number) => void;
}): ReactNode {
  const t = useT();
  const [choosing, setChoosing] = useState(false);

  if (suggested === null) {
    return <p className="mt-2 text-xs text-slate-500">{t('console.queue.noFreeTable')}</p>;
  }

  return (
    <div className="mt-2 flex items-center gap-3">
      <button
        type="button"
        onClick={() => {
          onAssign(suggested);
        }}
        className="rounded bg-slate-700 px-4 py-2 font-semibold text-white active:bg-slate-600"
      >
        {t('console.queue.assign')} {suggested}
      </button>

      {choosing ? (
        <select
          aria-label={t('console.queue.otherTable')}
          defaultValue=""
          onChange={(event) => {
            setChoosing(false);
            onAssign(Number(event.target.value));
          }}
          className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-white"
        >
          <option value="" disabled>
            {t('console.queue.otherTable')}
          </option>
          {tables.map((table) => (
            <option key={table.number} value={table.number}>
              {table.number}
            </option>
          ))}
        </select>
      ) : (
        <button
          type="button"
          onClick={() => {
            setChoosing(true);
          }}
          className="text-xs text-slate-400 underline"
        >
          {t('console.queue.otherTable')}
        </button>
      )}
    </div>
  );
}
