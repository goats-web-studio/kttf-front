import type { GroupStandingsView, MatchView, StageView } from '@kttf/shared/types';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

import { matchesOf } from './group-matches';

interface StandingsPanelProps {
  readonly groups: readonly GroupStandingsView[];
  readonly stages: readonly StageView[];
  readonly names: ReadonlyMap<string, string>;
  readonly ratings: ReadonlyMap<string, string>;
}

/**
 * Групповые таблицы в консоли — ТЗ 6.6.
 *
 * Своя вёрстка, а не заимствованная у публичных результатов: из консоли
 * нельзя импортировать фичи публичной части, иначе их зависимости уезжают
 * в её чанки (ADR-004). Здесь и содержание другое — матрица «каждый с
 * каждым» и рейтинг рядом с фамилией, которые нужны судье, а не зрителю.
 *
 * Ни одно число не считается: всё приходит от сервера, посчитанное общим
 * движком. Второй расчёт таблицы на клиенте — запрет №2 брифа.
 */
export default function StandingsPanel({
  groups,
  stages,
  names,
  ratings,
}: StandingsPanelProps): ReactNode {
  const t = useT();

  if (groups.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-400 uppercase">
        {t('console.standings.title')}
      </h2>
      {groups.map((group) => (
        <GroupTable
          key={`${group.stageId}:${group.groupId ?? 'single'}`}
          group={group}
          matches={matchesOf(stages, group)}
          names={names}
          ratings={ratings}
        />
      ))}
    </section>
  );
}

/** Счёт личной встречи глазами игрока `a`. `null` — ещё не играли. */
function scoreBetween(matches: readonly MatchView[], a: string, b: string): string | null {
  for (const match of matches) {
    if (match.setsA === null || match.setsB === null) {
      continue;
    }

    if (match.playerAId === a && match.playerBId === b) {
      return `${String(match.setsA)}:${String(match.setsB)}`;
    }

    if (match.playerAId === b && match.playerBId === a) {
      return `${String(match.setsB)}:${String(match.setsA)}`;
    }
  }

  return null;
}

function GroupTable({
  group,
  matches,
  names,
  ratings,
}: {
  readonly group: GroupStandingsView;
  readonly matches: readonly MatchView[];
  readonly names: ReadonlyMap<string, string>;
  readonly ratings: ReadonlyMap<string, string>;
}): ReactNode {
  const t = useT();
  const order = group.rows.map((row) => row.participant);

  return (
    <div className="mt-3 overflow-x-auto rounded border border-slate-700 bg-slate-800 p-3">
      <p className="text-sm font-semibold">{group.label}</p>

      <table className="mt-2 w-full text-xs">
        <thead>
          <tr className="text-left text-slate-400">
            <th scope="col" className="py-1 font-normal">
              {t('console.standings.player')}
            </th>
            {order.map((_participant, index) => (
              <th key={index} scope="col" className="px-1 py-1 text-center font-normal">
                {index + 1}
              </th>
            ))}
            <th scope="col" className="px-1 py-1 text-center font-normal">
              {t('console.standings.points')}
            </th>
            <th scope="col" className="px-1 py-1 text-center font-normal">
              {t('console.standings.sets')}
            </th>
            <th scope="col" className="px-1 py-1 text-center font-normal">
              {t('console.standings.balls')}
            </th>
            <th scope="col" className="px-1 py-1 text-center font-normal">
              {t('console.standings.place')}
            </th>
          </tr>
        </thead>
        <tbody>
          {group.rows.map((row, index) => (
            <tr key={row.participant} className="border-t border-slate-700">
              <th scope="row" className="py-1 text-left font-normal">
                <span className="text-slate-400">{index + 1}.</span>{' '}
                {names.get(row.participant) ?? row.participant}{' '}
                {/* Рейтинг рядом с фамилией — ТЗ 6.6. */}
                <span className="text-slate-500">{ratings.get(row.participant) ?? ''}</span>
              </th>

              {order.map((opponent, column) => (
                <td key={column} className="px-1 py-1 text-center tabular-nums">
                  {column === index ? (
                    <span className="text-slate-600">×</span>
                  ) : (
                    (scoreBetween(matches, row.participant, opponent) ?? (
                      <span className="text-slate-600">—</span>
                    ))
                  )}
                </td>
              ))}

              <td className="px-1 py-1 text-center font-semibold tabular-nums">{row.points}</td>
              <td className="px-1 py-1 text-center tabular-nums text-slate-300">
                {row.setDiff > 0 ? `+${String(row.setDiff)}` : row.setDiff}
              </td>
              <td className="px-1 py-1 text-center tabular-nums text-slate-300">
                {row.ballDiff > 0 ? `+${String(row.ballDiff)}` : row.ballDiff}
              </td>
              <td className="px-1 py-1 text-center font-semibold tabular-nums">
                {/* Пусто, пока равенство не разрешил судья — ADR-008. */}
                {row.place ?? <span className="text-amber-400">?</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
