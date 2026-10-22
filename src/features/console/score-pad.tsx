import type { MatchResultInput } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import ToggleButton from '@mui/material/ToggleButton';
import Typography from '@mui/material/Typography';
import { useState, type ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';

import { quickResults, retiredResult } from './score';

interface ScorePadProps {
  readonly setsToWin: number;
  readonly onSubmit: (input: MatchResultInput) => void;
  /** Фамилии сторон: ряд кнопок подписан тем, кто в нём побеждает. */
  readonly nameA?: string | undefined;
  readonly nameB?: string | undefined;
  /**
   * Отказ по ходу встречи (ADR-061). Если задан, у счёта появляется третий
   * путь: кто отказался и сколько сетов успел взять. `withdraw` — снять
   * отказавшегося и с остальных встреч турнира.
   */
  readonly onRetire?: (input: MatchResultInput, retiree: 'A' | 'B', withdraw: boolean) => void;
}

/**
 * Ввод счёта — ТЗ 6.3.
 *
 * Закрытие встречи не более чем в два действия: открыть карточку и нажать
 * счёт. Поэтому быстрые кнопки покрывают все исходы. Счёт по партиям клубы
 * не ведут, и его ввода нет: в системе только то, что в зале записывают.
 *
 * Ни одна кнопка не ждёт ответа сервера: обработчик применяет результат
 * к снимку сразу, запрос уходит следом (запрет №1).
 */
export default function ScorePad({
  setsToWin,
  onSubmit,
  nameA,
  nameB,
  onRetire,
}: ScorePadProps): ReactNode {
  const t = useT();
  const [mode, setMode] = useState<'quick' | 'retired'>('quick');

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

      <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {onRetire !== undefined && (
          <ToggleButton
            value="retired"
            selected={mode === 'retired'}
            onChange={() => {
              setMode(mode === 'retired' ? 'quick' : 'retired');
            }}
            sx={{ minHeight: 56, px: 2, textTransform: 'none', color: 'text.secondary' }}
          >
            {t('console.retired.toggle')}
          </ToggleButton>
        )}
      </Box>

      {mode === 'retired' && onRetire !== undefined && (
        <Retirement setsToWin={setsToWin} nameA={nameA} nameB={nameB} onRetire={onRetire} />
      )}
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
        fontFamily: 'var(--font-mono)',
        // «Техпобеда» в клетке на 390px шириной впритык: подпись мельче счёта.
        fontSize: small === true ? 13 : 22,
        lineHeight: small === true ? '16px' : '26px',
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
 * Отказ по ходу встречи — ADR-061.
 *
 * Три вопроса подряд, без клавиатуры: кто отказался, сколько сетов успел
 * взять, снимать ли его с остального турнира. Оставшиеся сеты получает
 * соперник (`retiredResult`), и встреча закрывается при любом счёте на
 * момент отказа.
 */
function Retirement({
  setsToWin,
  nameA,
  nameB,
  onRetire,
}: {
  readonly setsToWin: number;
  readonly nameA: string | undefined;
  readonly nameB: string | undefined;
  readonly onRetire: NonNullable<ScorePadProps['onRetire']>;
}): ReactNode {
  const t = useT();
  const [retiree, setRetiree] = useState<'A' | 'B' | null>(null);
  const [won, setWon] = useState(0);
  const [withdraw, setWithdraw] = useState(false);
  const result = retiree === null ? null : retiredResult(setsToWin, retiree, won);

  return (
    <Paper variant="outlined" sx={{ mt: 1.5, p: 1.5 }}>
      <Typography variant="body2" color="text.secondary" component="p" sx={{ mb: 1 }}>
        {t('console.retired.who')}
      </Typography>
      <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: '1fr 1fr' }}>
        {(['A', 'B'] as const).map((side) => (
          <ToggleButton
            key={side}
            value={side}
            selected={retiree === side}
            onChange={() => {
              setRetiree(side);
            }}
            sx={{ minHeight: 56, textTransform: 'none', overflowWrap: 'anywhere' }}
          >
            {(side === 'A' ? nameA : nameB) ?? side}
          </ToggleButton>
        ))}
      </Box>

      <Typography variant="body2" color="text.secondary" component="p" sx={{ mt: 1.5, mb: 1 }}>
        {t('console.retired.sets')}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 1,
          gridTemplateColumns: `repeat(${String(setsToWin)}, minmax(56px, 1fr))`,
        }}
      >
        {Array.from({ length: setsToWin }, (_unused, count) => (
          <ToggleButton
            key={count}
            value={count}
            selected={won === count}
            onChange={() => {
              setWon(count);
            }}
            sx={{ minHeight: 56, fontVariantNumeric: 'tabular-nums' }}
          >
            {count}
          </ToggleButton>
        ))}
      </Box>

      <FormControlLabel
        sx={{ mt: 1, minHeight: 44 }}
        control={
          <Checkbox
            checked={withdraw}
            onChange={(event) => {
              setWithdraw(event.target.checked);
            }}
          />
        }
        label={t('console.retired.withdraw')}
      />

      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          size="large"
          disabled={result === null || retiree === null}
          onClick={() => {
            if (result !== null && retiree !== null) onRetire(result, retiree, withdraw);
          }}
          sx={{ minHeight: 56, fontVariantNumeric: 'tabular-nums' }}
        >
          {result === null
            ? t('console.retired.submit')
            : `${t('console.retired.submit')} ${String(result.setsA)}:${String(result.setsB)}`}
        </Button>
      </Box>
    </Paper>
  );
}
