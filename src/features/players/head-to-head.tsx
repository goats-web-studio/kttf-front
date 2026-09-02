import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';

import MatchesTable from './matches-table';
import { playerName } from './player-name';
import { headToHeadQuery } from './queries';

interface HeadToHeadProps {
  readonly playerId: string;
  readonly opponentId: string;
  readonly onClose: () => void;
}

/**
 * Личный счёт против соперника — ТЗ 9.3.
 *
 * Все числа приходят посчитанными: победы, поражения и сеты считает сервер по
 * всем очным встречам сразу. Сложить их по видимой странице истории значило бы
 * показать счёт, который меняется от перелистывания.
 *
 * Соперник выбирается в истории встреч, а не отдельным поиском: спрашивают
 * про того, с кем играли, и список уже перед глазами.
 */
export default function HeadToHead({ playerId, opponentId, onClose }: HeadToHeadProps): ReactNode {
  const t = useT();
  const headToHead = useQuery(headToHeadQuery(playerId, opponentId));

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">{t('player.headToHead.title')}</h2>
        <button type="button" onClick={onClose} className="text-sm text-slate-600 underline">
          {t('player.headToHead.close')}
        </button>
      </div>

      <QueryState
        isPending={headToHead.isPending}
        error={headToHead.error}
        onRetry={() => void headToHead.refetch()}
      >
        {headToHead.data === undefined ? null : (
          <>
            <p className="mt-3 text-slate-900">
              {playerName(headToHead.data.opponent)}
              {' · '}
              <span className="tabular-nums">
                {headToHead.data.wins} : {headToHead.data.losses}
              </span>{' '}
              <span className="text-sm text-slate-500">{t('player.headToHead.matches')}</span>
              {' · '}
              <span className="tabular-nums">
                {headToHead.data.setsWon} : {headToHead.data.setsLost}
              </span>{' '}
              <span className="text-sm text-slate-500">{t('player.headToHead.sets')}</span>
            </p>

            {headToHead.data.matches.length === 0 ? (
              <p className="mt-3 text-slate-500">{t('player.headToHead.empty')}</p>
            ) : (
              // Соперник уже выбран: кнопка на его же фамилии вела бы туда,
              // где человек и находится.
              <MatchesTable matches={headToHead.data.matches} />
            )}
          </>
        )}
      </QueryState>
    </section>
  );
}
