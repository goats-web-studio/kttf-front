import type { MatchView, StageView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import Bracket from '@/common/ui/bracket';
import { BRACKET_STAGES, finalRound, sourceLabel } from '@/common/ui/bracket-model';
import Surface from '@/common/ui/surface';

interface BracketZoneProps {
  readonly stages: readonly StageView[];
  readonly names: ReadonlyMap<string, string>;
  /** Без обработчика сетка только показывает: турнир завершён, править нечего. */
  readonly onOpen?: ((matchId: string) => void) | undefined;
}

/**
 * Сетка плей-офф в консоли — та же, что на сайте и на стене.
 *
 * Судья в плей-офф думает кругами: кто вышел в полуфинал, кого ждёт финал.
 * Очередь отвечает «кого звать», сетка — «где мы сейчас». Касание встречи
 * открывает её окно, как касание стола или строки очереди.
 */
export default function BracketZone({ stages, names, onOpen }: BracketZoneProps): ReactNode {
  const t = useT();
  const bracketed = stages.filter((stage) => BRACKET_STAGES.has(stage.type));

  return bracketed.map((stage) => {
    const byId = new Map(stage.matches.map((match) => [match.id, match]));
    const final = finalRound(stage.matches);

    return (
      // Название этапа — только когда сеток несколько: одна сетка под
      // вкладкой «Сетка» в подписи не нуждается.
      <Surface key={stage.id} title={bracketed.length > 1 ? stage.name : undefined} flush>
        <Box sx={{ p: { xs: 2, sm: 3 }, pt: bracketed.length > 1 ? 0 : undefined }}>
          <Bracket
            matches={stage.matches}
            sideLabel={(match: MatchView, side) => {
              const id = side === 'A' ? match.playerAId : match.playerBId;

              return id === null
                ? sourceLabel(side === 'A' ? match.sourceA : match.sourceB, byId, final, t)
                : (names.get(id) ?? t('console.match.unknownPlayer'));
            }}
            {...(onOpen === undefined
              ? {}
              : {
                  onMatchClick: (match: MatchView) => {
                    onOpen(match.id);
                  },
                })}
          />
        </Box>
      </Surface>
    );
  });
}
