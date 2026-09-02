import type { PlayerMatchView } from '@kttf/shared/types';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { formatDate, formatDelta, useLocale, useT } from '@/common/i18n';
import { RESULT_TYPE_KEYS } from '@/features/tournaments/labels';

import { playerName } from './player-name';

interface MatchesTableProps {
  readonly matches: readonly PlayerMatchView[];
  /**
   * Выбор соперника открывает личный счёт с ним.
   *
   * Не задан там, где соперник уже выбран: в самом личном счёте кнопка вела
   * бы на страницу, которая и так открыта.
   */
  readonly onSelectOpponent?: ((opponentId: string) => void) | undefined;
}

/**
 * Встречи глазами игрока — ТЗ 9.3.
 *
 * Счёт развёрнут на «свои» и «чужие» сеты сервером: игрок не обязан помнить,
 * с какой стороны сетки он стоял, и переворачивать `setsA`/`setsB` на клиенте
 * не приходится.
 *
 * Исход назван словом, а не цветом строки: цвет не читается вслух и не
 * различается частью людей.
 */
export default function MatchesTable({ matches, onSelectOpponent }: MatchesTableProps): ReactNode {
  const t = useT();

  return (
    <table className="mt-3 w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-left text-slate-500">
          <th scope="col" className="py-2 font-normal">
            {t('player.matches.date')}
          </th>
          <th scope="col" className="py-2 font-normal">
            {t('player.matches.tournament')}
          </th>
          <th scope="col" className="py-2 font-normal">
            {t('player.matches.opponent')}
          </th>
          <th scope="col" className="py-2 font-normal">
            {t('player.matches.score')}
          </th>
          <th scope="col" className="py-2 font-normal">
            {t('player.matches.outcome')}
          </th>
          <th scope="col" className="py-2 font-normal">
            {t('player.matches.delta')}
          </th>
        </tr>
      </thead>
      <tbody>
        {matches.map((match) => (
          <Row key={match.matchId} match={match} onSelectOpponent={onSelectOpponent} />
        ))}
      </tbody>
    </table>
  );
}

function Row({
  match,
  onSelectOpponent,
}: {
  readonly match: PlayerMatchView;
  readonly onSelectOpponent?: ((opponentId: string) => void) | undefined;
}): ReactNode {
  const t = useT();
  const locale = useLocale();

  return (
    <tr className="border-b border-slate-100 align-top">
      <td className="py-2 whitespace-nowrap text-slate-600">
        {match.playedAt === null ? '—' : formatDate(match.playedAt, locale)}
      </td>
      <td className="py-2">
        <Link
          to="/tournaments/$tournamentId"
          params={{ tournamentId: match.tournamentId }}
          className="text-blue-700 underline"
        >
          {match.tournamentName}
        </Link>
        <span className="block text-xs text-slate-500">{match.stageName}</span>
      </td>
      <td className="py-2 text-slate-900">
        <Opponent match={match} onSelectOpponent={onSelectOpponent} />
      </td>
      <td className="py-2 tabular-nums whitespace-nowrap text-slate-900">
        {match.setsFor} : {match.setsAgainst}
        {match.resultType !== 'NORMAL' && (
          <span className="ml-2 text-xs text-slate-500">
            {t(RESULT_TYPE_KEYS[match.resultType])}
          </span>
        )}
      </td>
      <td className="py-2 whitespace-nowrap text-slate-600">
        {match.won ? t('player.matches.won') : t('player.matches.lost')}
      </td>
      <td className="py-2 tabular-nums whitespace-nowrap font-medium text-slate-900">
        {match.delta === null ? (
          <span className="font-normal text-slate-400">{t('player.matches.notRated')}</span>
        ) : (
          formatDelta(match.delta)
        )}
      </td>
    </tr>
  );
}

/**
 * Соперник по встрече.
 *
 * Пустой соперник — не пропуск в данных: игрок снялся до встречи, и
 * техническую победу засчитали без него.
 */
function Opponent({
  match,
  onSelectOpponent,
}: {
  readonly match: PlayerMatchView;
  readonly onSelectOpponent?: ((opponentId: string) => void) | undefined;
}): ReactNode {
  const t = useT();

  if (match.opponent === null) {
    return <span className="text-slate-400">{t('player.matches.noOpponent')}</span>;
  }

  const name = playerName(match.opponent);

  if (onSelectOpponent === undefined) {
    return name;
  }

  const opponentId = match.opponent.id;

  return (
    <button
      type="button"
      onClick={() => {
        onSelectOpponent(opponentId);
      }}
      className="text-left text-blue-700 underline"
    >
      {name}
    </button>
  );
}
