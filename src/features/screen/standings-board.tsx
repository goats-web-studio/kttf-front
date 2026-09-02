import type { GroupStandingsView } from '@kttf/shared/types';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

interface StandingsBoardProps {
  readonly groups: readonly GroupStandingsView[];
  readonly names: ReadonlyMap<string, string>;
  readonly ratings: ReadonlyMap<string, string>;
}

/**
 * Групповые таблицы на стене — ТЗ 6.5 и 6.6.
 *
 * Без матрицы «каждый с каждым», в отличие от консоли: судье она нужна, чтобы
 * понимать, кто с кем ещё не играл, а зрителю с десяти метров важны место,
 * очки и разницы. Рейтинг рядом с фамилией остаётся — ТЗ 6.6 требует его.
 *
 * Ни одно число не считается здесь: всё пришло от сервера, посчитанное общим
 * движком. Второй расчёт таблицы на клиенте — запрет №2 брифа.
 */
export default function StandingsBoard({ groups, names, ratings }: StandingsBoardProps): ReactNode {
  const t = useT();

  if (groups.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-xl font-semibold tracking-wide text-slate-400 uppercase">
        {t('screen.standings.title')}
      </h2>

      <div className="mt-3 grid gap-4 xl:grid-cols-2">
        {groups.map((group) => (
          <table
            key={`${group.stageId}:${group.groupId ?? 'single'}`}
            className="w-full text-xl tabular-nums"
          >
            <caption className="pb-1 text-left text-lg text-slate-400">{group.label}</caption>
            <thead className="text-sm text-slate-500 uppercase">
              <tr>
                <th scope="col" className="text-left">
                  {t('screen.standings.place')}
                </th>
                <th scope="col" className="text-left">
                  {t('screen.standings.player')}
                </th>
                <th scope="col" className="text-right">
                  {t('screen.standings.points')}
                </th>
                <th scope="col" className="text-right">
                  {t('screen.standings.sets')}
                </th>
                <th scope="col" className="text-right">
                  {t('screen.standings.balls')}
                </th>
              </tr>
            </thead>
            <tbody>
              {group.rows.map((row) => (
                <tr key={row.participant} className="border-t border-slate-800">
                  {/* Пустое место — равенство, которого судья ещё не развёл (ADR-008). */}
                  <td className="py-1 text-slate-300">{row.place ?? '—'}</td>
                  <td className="py-1 text-slate-100">
                    {names.get(row.participant) ?? t('screen.match.pending')}
                    <span className="ml-2 text-sm text-slate-500">
                      {ratings.get(row.participant) ?? ''}
                    </span>
                  </td>
                  <td className="py-1 text-right font-semibold">{row.points}</td>
                  <td className="py-1 text-right text-slate-300">
                    {row.setsWon}:{row.setsLost}
                  </td>
                  <td className="py-1 text-right text-slate-300">
                    {row.ballsWon}:{row.ballsLost}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
    </section>
  );
}
