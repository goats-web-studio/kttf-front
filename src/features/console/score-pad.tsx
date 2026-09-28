import type { MatchResultInput } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import Typography from '@mui/material/Typography';
import { useId, useState, type ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';

import { quickResults } from './score';

interface ScorePadProps {
  readonly setsToWin: number;
  readonly onSubmit: (input: MatchResultInput) => void;
  /** Фамилии сторон: ряд кнопок подписан тем, кто в нём побеждает. */
  readonly nameA?: string | undefined;
  readonly nameB?: string | undefined;
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
export default function ScorePad({ setsToWin, onSubmit, nameA, nameB }: ScorePadProps): ReactNode {
  const t = useT();
  const [detailed, setDetailed] = useState(false);

  const quick = quickResults(setsToWin);
  const wonByA = quick.filter((result) => result.setsA > result.setsB);
  const wonByB = quick.filter((result) => result.setsB > result.setsA);

  return (
    <Box sx={{ mt: 1.5 }}>
      {/* Верхний ряд — победа первого, нижний — второго. Ряды различаются не
          только цветом: над каждым написано, кто в нём побеждает, а заливка
          против обводки читается и при дальтонизме, и на выгоревшем экране
          в зале. Колонок ровно по числу исходов, иначе при встрече до двух
          сетов ряд разъезжается. */}
      <ScoreRow title={nameA === undefined ? null : fill(t('console.score.wins'), { name: nameA })}>
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
          small
          label={t('console.score.walkoverA')}
          onClick={() => {
            onSubmit({ setsA: setsToWin, setsB: 0, resultType: 'WALKOVER' });
          }}
        >
          {t('console.score.walkover')}
        </ScoreButton>
      </ScoreRow>

      <ScoreRow title={nameB === undefined ? null : fill(t('console.score.wins'), { name: nameB })}>
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
          small
          label={t('console.score.walkoverB')}
          onClick={() => {
            onSubmit({ setsA: 0, setsB: setsToWin, resultType: 'WALKOVER' });
          }}
        >
          {t('console.score.walkover')}
        </ScoreButton>
      </ScoreRow>

      <ToggleButton
        value="detailed"
        selected={detailed}
        onChange={() => {
          setDetailed(!detailed);
        }}
        sx={{ mt: 1.5, minHeight: 56, px: 2, textTransform: 'none', color: 'text.secondary' }}
      >
        {t('console.score.bySets')}
      </ToggleButton>

      {detailed && <SetScores setsToWin={setsToWin} onSubmit={onSubmit} />}
    </Box>
  );
}

/** Ряд исходов одной стороны с подписью, кто в нём побеждает. */
function ScoreRow({
  title,
  children,
}: {
  readonly title: string | null;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <Box sx={{ mt: 1, '&:first-of-type': { mt: 0 } }}>
      {title !== null && (
        <Typography
          variant="caption"
          color="text.secondary"
          component="p"
          sx={{ mb: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {title}
        </Typography>
      )}
      <Box
        sx={{
          display: 'grid',
          gap: 1,
          gridTemplateColumns: 'repeat(auto-fit, minmax(64px, 1fr))',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

interface ScoreButtonProps {
  readonly children: ReactNode;
  readonly onClick: () => void;
  readonly filled?: boolean;
  /** Словом, а не счётом: надпись мельче, чтобы влезть в ту же клетку. */
  readonly small?: boolean;
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
 * без неё кнопка размывается о фон, а не выделяется на нём. В ночной теме
 * заливка — `primary.main` (`--night-red`), граница остаётся на случай
 * смены токена.
 */
function ScoreButton({ children, onClick, filled, small, label }: ScoreButtonProps): ReactNode {
  return (
    <Button
      variant={filled === true ? 'contained' : 'outlined'}
      color={filled === true ? 'primary' : 'secondary'}
      size="large"
      {...(label === undefined ? {} : { 'aria-label': label })}
      onClick={onClick}
      sx={{
        minHeight: 64,
        minWidth: 0,
        px: 1,
        fontFamily: "'Oswald', system-ui, sans-serif",
        fontSize: small === true ? 15 : 22,
        lineHeight: small === true ? '20px' : '26px',
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
        textTransform: 'none',
        // Граница у заливки обязательна — см. выше.
        ...(filled === true ? { border: '1px solid', borderColor: 'primary.main' } : {}),
      }}
    >
      {children}
    </Button>
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
  const baseId = useId();
  const [scores, setScores] = useState<readonly [number, number][]>([[0, 0]]);

  const wonA = scores.filter(([a, b]) => a > b).length;
  const wonB = scores.filter(([a, b]) => b > a).length;

  return (
    <Paper variant="outlined" sx={{ mt: 1.5, p: 1.5 }}>
      {scores.map((set, index) => {
        const labelId = `${baseId}-set-${String(index)}`;

        return (
          <Box
            key={index}
            sx={{ mt: index === 0 ? 0 : 1, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Typography id={labelId} variant="body2" color="text.secondary" sx={{ width: 64 }}>
              {t('console.score.set')} {index + 1}
            </Typography>
            {([0, 1] as const).map((side) => (
              <TextField
                key={side}
                type="number"
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
                fullWidth={false}
                slotProps={{
                  htmlInput: { min: 0, inputMode: 'numeric', 'aria-labelledby': labelId },
                }}
                sx={{
                  width: 80,
                  '& .MuiInputBase-root': { minHeight: 56 },
                  '& input': { fontVariantNumeric: 'tabular-nums' },
                }}
              />
            ))}
          </Box>
        );
      })}

      <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        <Button
          variant="text"
          size="large"
          disabled={scores.length >= maximum}
          onClick={() => {
            setScores([...scores, [0, 0]]);
          }}
          sx={{ minHeight: 56, color: 'text.secondary' }}
        >
          {t('console.score.addSet')}
        </Button>
        <Button
          size="large"
          onClick={() => {
            onSubmit({
              setsA: wonA,
              setsB: wonB,
              setScores: scores.map((set) => [...set] as [number, number]),
              resultType: 'NORMAL',
            });
          }}
          sx={{ ml: 'auto', minHeight: 56, fontVariantNumeric: 'tabular-nums' }}
        >
          {t('console.score.submit')} {wonA}:{wonB}
        </Button>
      </Box>
    </Paper>
  );
}
