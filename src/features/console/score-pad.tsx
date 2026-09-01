import type { MatchResultInput } from '@kttf/shared/types';
import { useState, type ReactNode } from 'react';

import { useT } from '@/common/i18n';

import { quickResults } from './score';

interface ScorePadProps {
  readonly setsToWin: number;
  readonly onSubmit: (input: MatchResultInput) => void;
}

/**
 * Ввод счёта — ТЗ 6.3.
 *
 * Закрытие встречи не более чем в два действия: открыть карточку и нажать
 * счёт. Поэтому быстрые кнопки покрывают все исходы, а ввод по сетам
 * спрятан за переключателем — он опция, а не обязанность.
 *
 * Ни одна кнопка не ждёт ответа сервера: обработчик применяет результат
 * к снимку сразу, запрос уходит следом (запрет №1).
 */
export default function ScorePad({ setsToWin, onSubmit }: ScorePadProps): ReactNode {
  const t = useT();
  const [detailed, setDetailed] = useState(false);

  return (
    <div className="mt-3">
      <div className="grid grid-cols-4 gap-2">
        {quickResults(setsToWin).map((quick) => (
          <button
            key={`${String(quick.setsA)}:${String(quick.setsB)}`}
            type="button"
            onClick={() => {
              onSubmit({ ...quick, resultType: 'NORMAL' });
            }}
            className="rounded bg-slate-700 py-3 text-lg font-semibold text-white active:bg-slate-600"
          >
            {quick.setsA}:{quick.setsB}
          </button>
        ))}

        <button
          type="button"
          aria-label={t('console.score.walkoverA')}
          onClick={() => {
            onSubmit({ setsA: setsToWin, setsB: 0, resultType: 'WALKOVER' });
          }}
          className="rounded bg-amber-700 py-3 text-lg font-semibold text-white active:bg-amber-600"
        >
          W:L
        </button>
        <button
          type="button"
          aria-label={t('console.score.walkoverB')}
          onClick={() => {
            onSubmit({ setsA: 0, setsB: setsToWin, resultType: 'WALKOVER' });
          }}
          className="rounded bg-amber-700 py-3 text-lg font-semibold text-white active:bg-amber-600"
        >
          L:W
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          setDetailed(!detailed);
        }}
        className="mt-3 text-sm text-slate-300 underline"
      >
        {t('console.score.bySets')}
      </button>

      {detailed && <SetScores setsToWin={setsToWin} onSubmit={onSubmit} />}
    </div>
  );
}

/**
 * Счёт по сетам — ТЗ 6.3, опция.
 *
 * Сеты складываются в `setsA`/`setsB` здесь, а не на сервере: контракт ТС 7.6
 * принимает и то, и другое, а проверку соответствия всё равно делает сервер и
 * отвергает кодом `INVALID_SCORE`.
 */
function SetScores({ setsToWin, onSubmit }: ScorePadProps): ReactNode {
  const t = useT();
  const maximum = setsToWin * 2 - 1;
  const [scores, setScores] = useState<readonly [number, number][]>([[0, 0]]);

  const wonA = scores.filter(([a, b]) => a > b).length;
  const wonB = scores.filter(([a, b]) => b > a).length;

  return (
    <div className="mt-3 rounded border border-slate-700 p-3">
      {scores.map((set, index) => (
        <div key={index} className="mt-2 flex items-center gap-2 first:mt-0">
          <span className="w-16 text-sm text-slate-400">
            {t('console.score.set')} {index + 1}
          </span>
          {([0, 1] as const).map((side) => (
            <input
              key={side}
              type="number"
              inputMode="numeric"
              min={0}
              value={set[side]}
              onChange={(event) => {
                const value = Number(event.target.value);

                setScores(
                  scores.map((current, position): [number, number] =>
                    position === index
                      ? side === 0
                        ? [value, current[1]]
                        : [current[0], value]
                      : current,
                  ),
                );
              }}
              className="w-16 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-white"
            />
          ))}
        </div>
      ))}

      <div className="mt-3 flex gap-3">
        <button
          type="button"
          disabled={scores.length >= maximum}
          onClick={() => {
            setScores([...scores, [0, 0]]);
          }}
          className="text-sm text-slate-300 underline disabled:text-slate-600 disabled:no-underline"
        >
          {t('console.score.addSet')}
        </button>
        <button
          type="button"
          onClick={() => {
            onSubmit({
              setsA: wonA,
              setsB: wonB,
              setScores: scores.map((set) => [...set] as [number, number]),
              resultType: 'NORMAL',
            });
          }}
          className="ml-auto rounded bg-slate-700 px-4 py-2 text-sm text-white"
        >
          {t('console.score.submit')} {wonA}:{wonB}
        </button>
      </div>
    </div>
  );
}
