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

  const quick = quickResults(setsToWin);
  const wonByA = quick.filter((result) => result.setsA > result.setsB);
  const wonByB = quick.filter((result) => result.setsB > result.setsA);

  return (
    <div className="mt-3">
      {/* Верхний ряд — победа первого, нижний — второго. Ряды различаются не
          только цветом: заливка против обводки читается и при дальтонизме, и
          на выгоревшем экране в зале. Колонок ровно по числу исходов, иначе
          при встрече до двух сетов ряд разъезжается. */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${String(setsToWin + 1)}, minmax(0, 1fr))` }}
      >
        {wonByA.map((result) => (
          <ScoreButton
            key={`${String(result.setsA)}:${String(result.setsB)}`}
            filled
            onClick={() => {
              onSubmit({ ...result, resultType: 'NORMAL' });
            }}
          >
            {result.setsA}:{result.setsB}
          </ScoreButton>
        ))}
        <ScoreButton
          filled
          label={t('console.score.walkoverA')}
          onClick={() => {
            onSubmit({ setsA: setsToWin, setsB: 0, resultType: 'WALKOVER' });
          }}
        >
          W:L
        </ScoreButton>

        {wonByB.map((result) => (
          <ScoreButton
            key={`${String(result.setsA)}:${String(result.setsB)}`}
            onClick={() => {
              onSubmit({ ...result, resultType: 'NORMAL' });
            }}
          >
            {result.setsA}:{result.setsB}
          </ScoreButton>
        ))}
        <ScoreButton
          label={t('console.score.walkoverB')}
          onClick={() => {
            onSubmit({ setsA: 0, setsB: setsToWin, resultType: 'WALKOVER' });
          }}
        >
          L:W
        </ScoreButton>
      </div>

      <button
        type="button"
        onClick={() => {
          setDetailed(!detailed);
        }}
        className="mt-3 text-sm text-night-ink-700 underline"
      >
        {t('console.score.bySets')}
      </button>

      {detailed && <SetScores setsToWin={setsToWin} onSubmit={onSubmit} />}
    </div>
  );
}

interface ScoreButtonProps {
  readonly children: ReactNode;
  readonly onClick: () => void;
  readonly filled?: boolean;
  readonly label?: string;
}

/**
 * Кнопка счёта — самый нажимаемый элемент продукта.
 *
 * Высота 64px из дизайн-системы (раздел 4.2 черновика UX): судья стоит,
 * держит телефон одной рукой и повторяет это действие 50–80 раз за вечер.
 *
 * Заливка `--red-600` лежит на карточке `--night-raised` и даёт к ней 2.93:1
 * — ниже порога 3:1 для нетекстовых элементов. Поэтому граница обязательна:
 * без неё кнопка размывается о фон, а не выделяется на нём.
 */
function ScoreButton({ children, onClick, filled, label }: ScoreButtonProps): ReactNode {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`min-h-16 tabular-nums rounded-sm border font-display text-display-sm ${
        filled
          ? 'border-night-red bg-red-600 text-white active:bg-red-700'
          : 'border-night-line-strong text-night-ink-900 active:bg-night-line'
      }`}
    >
      {children}
    </button>
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
    <div className="mt-3 rounded border border-night-line p-3">
      {scores.map((set, index) => (
        <div key={index} className="mt-2 flex items-center gap-2 first:mt-0">
          <span className="w-16 text-sm text-night-ink-500">
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
              className="w-16 rounded border border-night-line-strong bg-night-raised px-2 py-1 text-white"
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
          className="text-sm text-night-ink-700 underline disabled:text-night-ink-400 disabled:no-underline"
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
          className="ml-auto rounded bg-night-raised px-4 py-2 text-sm text-white"
        >
          {t('console.score.submit')} {wonA}:{wonB}
        </button>
      </div>
    </div>
  );
}
