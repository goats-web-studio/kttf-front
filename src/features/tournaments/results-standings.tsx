import type { GroupStandingsView, TournamentStandingsView } from '@kttf/shared/types';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

import ResultsTies from './results-ties';

interface ResultsStandingsProps {
  readonly standings: TournamentStandingsView;
  readonly names: ReadonlyMap<string, string>;
}

/**
 * Групповые таблицы — ТЗ 9.4 и ТЗ 6.6.
 *
 * Ничего не считается: и очки, и разницы, и места приходят от сервера ровно
 * такими, какими их посчитал общий движок. Сложить их здесь ещё раз означало
 * бы второе понимание таблицы на клиенте — запрет №2 брифа.
 *
 * У олимпийки таблиц нет вовсе, и это ответ, а не пропуск: секция просто
 * не показывается.
 */
export default function ResultsStandings({ standings, names }: ResultsStandingsProps): ReactNode {
  const t = useT();

  if (standings.groups.length === 0) {
    return null;
  }

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-slate-900">{t('results.standings.title')}</h2>
      {standings.groups.map((group) => (
        <GroupTable
          key={`${group.stageId}:${group.groupId ?? 'single'}`}
          group={group}
          names={names}
        />
      ))}
    </section>
  );
}

function GroupTable({
  group,
  names,
}: {
  readonly group: GroupStandingsView;
  readonly names: ReadonlyMap<string, string>;
}): ReactNode {
  const t = useT();

  return (
    <div className="mt-6 overflow-x-auto">
      <h3 className="text-sm font-semibold text-slate-900">{group.label}</h3>
      <table className="mt-2 w-full min-w-lg text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500">
            <th scope="col" className="py-2 font-normal">
              {t('standings.place')}
            </th>
            <th scope="col" className="py-2 font-normal">
              {t('standings.player')}
            </th>
            <th scope="col" className="py-2 font-normal">
              {t('standings.played')}
            </th>
            <th scope="col" className="py-2 font-normal">
              {t('standings.wins')}
            </th>
            <th scope="col" className="py-2 font-normal">
              {t('standings.losses')}
            </th>
            <th scope="col" className="py-2 font-normal">
              {t('standings.points')}
            </th>
            <th scope="col" className="py-2 font-normal">
              {t('standings.sets')}
            </th>
            <th scope="col" className="py-2 font-normal">
              {t('standings.balls')}
            </th>
          </tr>
        </thead>
        <tbody>
          {group.rows.map((row) => (
            <tr key={row.participant} className="border-b border-slate-100">
              <td className="py-2 font-medium text-slate-900">
                {/* Пусто, пока равенство не разрешил судья — ADR-008. */}
                {row.place ?? <span className="text-slate-400">—</span>}
              </td>
              <td className="py-2 text-slate-900">
                {names.get(row.participant) ?? row.participant}
              </td>
              <td className="py-2 text-slate-600">{row.played}</td>
              <td className="py-2 text-slate-600">{row.wins}</td>
              <td className="py-2 text-slate-600">{row.losses}</td>
              <td className="py-2 font-medium text-slate-900">{row.points}</td>
              <td className="py-2 text-slate-600">
                {row.setsWon} : {row.setsLost} <Diff value={row.setDiff} />
              </td>
              <td className="py-2 text-slate-600">
                {row.ballsWon} : {row.ballsLost} <Diff value={row.ballDiff} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ResultsTies title={t('results.unresolved.title')} ties={group.unresolved} names={names} />
    </div>
  );
}

/** Разница со знаком: по ней читается порядок, когда очки равны (ТЗ 6.6). */
function Diff({ value }: { readonly value: number }): ReactNode {
  return <span className="text-slate-400">{value > 0 ? `+${String(value)}` : String(value)}</span>;
}
