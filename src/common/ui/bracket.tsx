import type { MatchView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

import { BRACKET_PAGE, isPlacement, roundName, type BracketSize } from './bracket-model';

interface BracketProps {
  readonly matches: readonly MatchView[];
  /** Что написано на стороне встречи: имя или кого встреча ждёт. */
  readonly sideLabel: (match: MatchView, side: 'A' | 'B') => string;
  readonly size?: BracketSize;
  /**
   * Касание встречи — в консоли открывает окно встречи. Без него сетка
   * только показывает: на сайте и на стене нажимать нечего.
   */
  readonly onMatchClick?: (match: MatchView) => void;
}

/**
 * Олимпийская сетка — одна на сайт: страница турнира, предпросмотр
 * жеребьёвки, экран зала.
 *
 * Геометрия по слотам, а не по порядку в списке: круг r стоит из 2^(R−r)
 * клеток одной высоты, встреча — в своей клетке по `bracketSlot`. Поэтому
 * встреча следующего круга всегда ровно посередине двух своих, и линии
 * между ними сходятся. Пустой слот (пропуск в первом круге) остаётся
 * пустой клеткой — сетка не съезжает.
 *
 * Круги называются от финала: «Финал», «Полуфинал», «1/4 финала»… Встреча
 * за 3-е место — не круг: она стоит под финалом своей подписью. Раньше круг
 * называли по числу встреч, и финал с матчем за 3-е место стал «полуфиналом».
 */
export default function Bracket({
  matches,
  sideLabel,
  size = BRACKET_PAGE,
  onMatchClick,
}: BracketProps): ReactNode {
  const t = useT();
  const main = matches.filter((match) => !isPlacement(match));
  const placement = matches.filter(isPlacement);

  const rounds = [...new Set(main.map((match) => match.bracketRound ?? 1))].sort((a, b) => a - b);
  const last = rounds.length;
  const first = rounds[0] ?? 1;
  const box = `calc(${size.row} * 2 + 1px)`;
  const cell = `calc(${box} + ${size.gapY})`;
  const height = `calc(${cell} * ${String(2 ** Math.max(0, last - 1))})`;

  return (
    <Box sx={{ overflowX: 'auto', pb: 1 }}>
      <Box sx={{ display: 'flex', gap: size.gapX, width: 'max-content' }}>
        {rounds.map((round, index) => {
          const number = round - first + 1;
          const slots = 2 ** (last - number);
          const bySlot = new Map(
            main
              .filter((match) => (match.bracketRound ?? 1) === round)
              .map((match) => [match.bracketSlot ?? 0, match] as const),
          );
          const isFinal = index === last - 1;

          return (
            <Box key={round} sx={{ width: size.column, flexShrink: 0 }}>
              <Box
                sx={{
                  fontSize: size.caption,
                  fontWeight: 700,
                  color: isFinal ? 'primary.main' : 'text.secondary',
                  mb: 1,
                }}
              >
                {roundName(last - 1 - index, t)}
              </Box>

              <Box sx={{ height, display: 'flex', flexDirection: 'column' }}>
                {Array.from({ length: slots }, (_unused, slot) => {
                  const match = bySlot.get(slot);
                  // Линии рисуются там, где есть следующий круг, и только у
                  // настоящей встречи: пустой слот ни с чем не соединён.
                  const out = match !== undefined && !isFinal;
                  const into = match !== undefined && index > 0;

                  return (
                    <Box
                      key={slot}
                      sx={{
                        flex: 1,
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {match !== undefined && (
                        <MatchBox
                          match={match}
                          sideLabel={sideLabel}
                          size={size}
                          onClick={onMatchClick}
                        />
                      )}
                      {into && <Line size={size} kind="in" />}
                      {out && <Line size={size} kind="out" />}
                      {out && <Line size={size} kind={slot % 2 === 0 ? 'down' : 'up'} />}
                    </Box>
                  );
                })}
              </Box>

              {isFinal && placement.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  {placement.map((match) => (
                    <Box key={match.id} sx={{ mt: 1.5 }}>
                      <Box
                        sx={{
                          fontSize: size.caption,
                          fontWeight: 700,
                          color: 'text.secondary',
                          mb: 1,
                        }}
                      >
                        {placement.length === 1
                          ? t('results.bracket.thirdPlace')
                          : t('results.bracket.placement')}
                      </Box>
                      <MatchBox
                        match={match}
                        sideLabel={sideLabel}
                        size={size}
                        onClick={onMatchClick}
                      />
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

/**
 * Отрезок линии сетки в клетке встречи.
 *
 * `out` — от встречи вправо до середины зазора; `down`/`up` — вертикаль от
 * встречи к середине пары: верхняя клетка пары тянет вниз, нижняя вверх, и
 * вместе они дают одну черту между двумя встречами; `in` — от середины зазора
 * к встрече следующего круга.
 */
function Line({
  size,
  kind,
}: {
  readonly size: BracketSize;
  readonly kind: 'in' | 'out' | 'down' | 'up';
}): ReactNode {
  const half = `calc(${size.gapX} / 2)`;
  const color = 'var(--line-strong)';

  const place =
    kind === 'in'
      ? { right: '100%', top: '50%', width: half, borderTop: `1.5px solid ${color}` }
      : kind === 'out'
        ? { left: '100%', top: '50%', width: half, borderTop: `1.5px solid ${color}` }
        : kind === 'down'
          ? {
              left: `calc(100% + ${half})`,
              top: '50%',
              height: '50%',
              borderLeft: `1.5px solid ${color}`,
            }
          : {
              left: `calc(100% + ${half})`,
              top: 0,
              height: '50%',
              borderLeft: `1.5px solid ${color}`,
            };

  return <Box aria-hidden sx={{ position: 'absolute', ...place }} />;
}

function MatchBox({
  match,
  sideLabel,
  size,
  onClick,
}: {
  readonly match: MatchView;
  readonly sideLabel: (match: MatchView, side: 'A' | 'B') => string;
  readonly size: BracketSize;
  readonly onClick: ((match: MatchView) => void) | undefined;
}): ReactNode {
  const live = match.status === 'PLAYING';
  // Нажимается только встреча, где известны оба: с «победителем встречи»
  // вместо соперника судье в окне делать нечего.
  const clickable =
    onClick !== undefined &&
    match.playerAId !== null &&
    match.playerBId !== null &&
    match.status !== 'CANCELLED';

  return (
    <Box
      {...(clickable
        ? {
            component: ButtonBase,
            onClick: () => {
              onClick(match);
            },
          }
        : {})}
      sx={{
        display: 'block',
        textAlign: 'left',
        font: 'inherit',
        color: 'inherit',
        width: '100%',
        position: 'relative',
        zIndex: 1,
        borderRadius: '10px',
        border: '1px solid',
        // Идущая встреча — красная рамка: единственный цвет в сетке, кроме
        // счёта победителя.
        borderColor: live ? 'var(--red-600)' : 'divider',
        bgcolor: 'background.paper',
        overflow: 'hidden',
        ...(clickable && {
          transition: 'border-color var(--dur-fast) var(--ease)',
          '@media (hover: hover)': {
            '&:hover': { borderColor: live ? 'var(--red-600)' : 'var(--line-strong)' },
          },
          '&.Mui-focusVisible': { outline: '2px solid var(--red-600)', outlineOffset: '2px' },
        }),
      }}
    >
      <Side match={match} side="A" sideLabel={sideLabel} size={size} />
      <Box component="span" sx={{ display: 'block', height: '1px', bgcolor: 'divider' }} />
      <Side match={match} side="B" sideLabel={sideLabel} size={size} />
    </Box>
  );
}

function Side({
  match,
  side,
  sideLabel,
  size,
}: {
  readonly match: MatchView;
  readonly side: 'A' | 'B';
  readonly sideLabel: (match: MatchView, side: 'A' | 'B') => string;
  readonly size: BracketSize;
}): ReactNode {
  const id = side === 'A' ? match.playerAId : match.playerBId;
  const own = side === 'A' ? match.setsA : match.setsB;
  const other = side === 'A' ? match.setsB : match.setsA;
  const played = own !== null && other !== null;
  const won = played && own > other;

  // Победитель — полужирное имя и залитый счёт, проигравший приглушён
  // (раздел 3.4): цвет не единственный носитель.
  // Строка — span, а не p: в нажимаемой встрече она лежит внутри кнопки,
  // а там допустимо только строчное содержимое.
  return (
    <Box
      component="span"
      sx={{
        m: 0,
        height: size.row,
        px: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        fontSize: size.font,
      }}
    >
      <Box
        component="span"
        sx={{
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          ...(id === null
            ? { color: 'text.disabled' }
            : won
              ? { fontWeight: 700 }
              : played
                ? { color: 'text.secondary' }
                : {}),
        }}
      >
        {sideLabel(match, side)}
      </Box>
      {own !== null && (
        <Box
          component="span"
          sx={{
            flexShrink: 0,
            minWidth: '1.6em',
            height: '1.6em',
            display: 'grid',
            placeItems: 'center',
            borderRadius: '6px',
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            ...(won
              ? { bgcolor: 'var(--red-600)', color: '#ffffff' }
              : { bgcolor: 'var(--paper-sunken)', color: 'text.secondary' }),
          }}
        >
          {own}
        </Box>
      )}
    </Box>
  );
}
