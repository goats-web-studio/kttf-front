import type { StageView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

import Bracket from '@/common/ui/bracket';
import type { BracketSize } from '@/common/ui/bracket-model';

import { size } from './scale';

interface BracketBoardProps {
  readonly stage: StageView;
  readonly names: ReadonlyMap<string, string>;
}

/** Та же сетка, что на сайте, в кегле стены: всё от ширины экрана. */
const TV: BracketSize = {
  column: size(14),
  row: size(1.9),
  gapY: size(0.7),
  gapX: size(2.2),
  font: size(0.95),
  caption: size(0.85),
};

/**
 * Сетка плей-офф на стене — ТЗ 6.5.
 *
 * Общий компонент сетки (`common/ui/bracket`): круги от финала, линии между
 * встречами, матч за 3-е место под финалом. Раньше у стены была своя
 * вёрстка, круг назывался по числу встреч, и финал вместе с матчем за 3-е
 * место выходил «полуфиналом».
 *
 * Встреча, чьи участники ещё не определились, показана прочерками: сетка
 * разворачивается целиком при жеребьёвке (ADR-019), и линии показывают,
 * откуда придут игроки.
 */
export default function BracketBoard({ stage, names }: BracketBoardProps): ReactNode {
  return (
    <Box sx={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <Bracket
        matches={stage.matches}
        size={TV}
        sideLabel={(match, side) => {
          const id = side === 'A' ? match.playerAId : match.playerBId;

          return id === null ? '—' : (names.get(id) ?? '—');
        }}
      />
    </Box>
  );
}
