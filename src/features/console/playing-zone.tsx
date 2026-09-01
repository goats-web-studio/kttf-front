import type { MatchResultInput, MatchView } from '@kttf/shared/types';
import { useState, type ReactNode } from 'react';

import { useT } from '@/common/i18n';

import MatchLine from './match-line';
import ScorePad from './score-pad';

interface PlayingZoneProps {
  readonly matches: readonly MatchView[];
  readonly names: ReadonlyMap<string, string>;
  readonly setsToWinOf: (match: MatchView) => number;
  readonly onResult: (matchId: string, input: MatchResultInput) => void;
  readonly onCancel: (matchId: string) => void;
}

/**
 * Зона «Играется» — ТЗ 6.1, ввод счёта — ТЗ 6.3.
 *
 * Два действия на закрытие встречи: касание карточки раскрывает кнопки,
 * касание кнопки закрывает встречу. Ничего больше между ними нет — ни
 * подтверждения, ни выбора победителя отдельным шагом.
 */
export default function PlayingZone({
  matches,
  names,
  setsToWinOf,
  onResult,
  onCancel,
}: PlayingZoneProps): ReactNode {
  const t = useT();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-400 uppercase">
        {t('console.playing.title')}
      </h2>

      {matches.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{t('console.playing.empty')}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {matches.map((match) => (
            <li key={match.id} className="rounded border border-slate-700 bg-slate-800 p-3">
              <button
                type="button"
                onClick={() => {
                  setOpenId(openId === match.id ? null : match.id);
                }}
                className="w-full text-left"
              >
                <span className="text-xs text-slate-400">
                  {t('console.table.number')} {match.tableNumber}
                </span>
                <MatchLine match={match} names={names} />
              </button>

              {openId === match.id && (
                <>
                  <ScorePad
                    setsToWin={setsToWinOf(match)}
                    onSubmit={(input) => {
                      setOpenId(null);
                      onResult(match.id, input);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setOpenId(null);
                      onCancel(match.id);
                    }}
                    className="mt-3 text-sm text-slate-400 underline"
                  >
                    {t('console.match.returnToQueue')}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
