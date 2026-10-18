import type { StageView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

import Bracket from '@/common/ui/bracket';
import { BRACKET_STAGES, finalRound, sourceLabel } from '@/common/ui/bracket-model';
import Surface from '@/common/ui/surface';

import { stageTitle } from './labels';

interface ResultsBracketProps {
  readonly stages: readonly StageView[];
  readonly names: ReadonlyMap<string, string>;
}

/**
 * Сетки — ТЗ 9.4.
 *
 * Сетка разворачивается целиком при жеребьёвке, поэтому встречи существуют
 * до того, как определились их участники (ADR-019). Такая встреча показывается
 * не пустой строкой, а тем, кого она ждёт: «победитель встречи №2».
 */
export default function ResultsBracket({ stages, names }: ResultsBracketProps): ReactNode {
  const t = useT();
  const bracketed = stages.filter((stage) => BRACKET_STAGES.has(stage.type));

  if (bracketed.length === 0) {
    return null;
  }

  return (
    <Box component="section" sx={{ mt: 6, display: 'grid', gap: 2 }}>
      <Typography variant="h2" sx={{ mb: 1 }}>
        {t('results.bracket.title')}
      </Typography>
      {bracketed.map((stage) => (
        <StageBracket key={stage.id} stage={stage} names={names} />
      ))}
    </Box>
  );
}

function StageBracket({
  stage,
  names,
}: {
  readonly stage: StageView;
  readonly names: ReadonlyMap<string, string>;
}): ReactNode {
  const t = useT();
  const byId = new Map(stage.matches.map((match) => [match.id, match]));
  const final = finalRound(stage.matches);

  return (
    <Surface title={stageTitle(stage, t)} component="div" flush>
      {/* Сетка шире телефона — листается вбок внутри карточки. */}
      <Box sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 } }}>
        <Bracket
          matches={stage.matches}
          sideLabel={(match, side) => {
            const playerId = side === 'A' ? match.playerAId : match.playerBId;
            const source = side === 'A' ? match.sourceA : match.sourceB;

            return playerId === null
              ? sourceLabel(source, byId, final, t)
              : (names.get(playerId) ?? t('results.match.unknownPlayer'));
          }}
        />
      </Box>
    </Surface>
  );
}
