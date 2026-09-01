import type { MatchView } from '@kttf/shared/types';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

interface MatchLineProps {
  readonly match: MatchView;
  readonly names: ReadonlyMap<string, string>;
  /** Рейтинг рядом с фамилией — ТЗ 6.6. */
  readonly ratings?: ReadonlyMap<string, string> | undefined;
}

/** Пара и счёт: то, что судья читает в зале, не приглядываясь. */
export default function MatchLine({ match, names, ratings }: MatchLineProps): ReactNode {
  const t = useT();
  const played = match.setsA !== null && match.setsB !== null;

  return (
    <span className="flex items-baseline justify-between gap-3">
      <span>
        <Side id={match.playerAId} names={names} ratings={ratings} won={won(match, 'A')} />
        <span className="px-2 text-slate-500">—</span>
        <Side id={match.playerBId} names={names} ratings={ratings} won={won(match, 'B')} />
      </span>
      {played && (
        <span className="tabular-nums text-lg font-semibold">
          {match.setsA}:{match.setsB}
        </span>
      )}
      {!played && match.status === 'PLAYING' && (
        <span className="text-xs text-slate-400">{t('console.playing.inProgress')}</span>
      )}
    </span>
  );
}

function won(match: MatchView, side: 'A' | 'B'): boolean {
  if (match.setsA === null || match.setsB === null) {
    return false;
  }

  return side === 'A' ? match.setsA > match.setsB : match.setsB > match.setsA;
}

function Side({
  id,
  names,
  ratings,
  won: isWinner,
}: {
  readonly id: string | null;
  readonly names: ReadonlyMap<string, string>;
  readonly ratings: ReadonlyMap<string, string> | undefined;
  readonly won: boolean;
}): ReactNode {
  const t = useT();

  if (id === null) {
    return <span className="text-slate-500">{t('console.match.pending')}</span>;
  }

  const rating = ratings?.get(id);

  return (
    <span className={isWinner ? 'font-semibold text-white' : 'text-slate-200'}>
      {names.get(id) ?? t('console.match.unknownPlayer')}
      {rating !== undefined && <span className="ml-1 text-xs text-slate-400">{rating}</span>}
    </span>
  );
}
