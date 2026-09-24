import type { BracketSourceView, MatchView, StageView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { useT, type MessageKey } from '@/common/i18n';

import { STAGE_TYPE_KEYS } from './labels';

interface ResultsBracketProps {
  readonly stages: readonly StageView[];
  readonly names: ReadonlyMap<string, string>;
}

type Translate = (key: MessageKey) => string;

/** Этапы, у которых есть сетка. Круговая и группы рисуются таблицами. */
const BRACKET_STAGES: ReadonlySet<StageView['type']> = new Set<StageView['type']>([
  'KNOCKOUT',
  'CONSOLATION',
]);

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
    <Box component="section" sx={{ mt: 6 }}>
      <Typography variant="h2">{t('results.bracket.title')}</Typography>
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

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h3">
        {stage.name} · {t(STAGE_TYPE_KEYS[stage.type])}
      </Typography>

      {/* На телефоне круги листаются свайпом вбок, каждый прилипает к краю
          (раздел 5.2, BracketView): сетка целиком шире экрана. */}
      <Box
        sx={{
          mt: 1.5,
          pb: 1,
          display: 'flex',
          gap: 3,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
        }}
      >
        {rounds(stage.matches).map(([round, matches]) => (
          <Box key={round} sx={{ minWidth: 224, flexShrink: 0, scrollSnapAlign: 'start' }}>
            <Typography variant="caption" color="text.secondary" component="p">
              {t('results.bracket.round')} {round}
            </Typography>
            <Box
              component="ul"
              sx={{ listStyle: 'none', m: 0, mt: 1, p: 0, display: 'grid', gap: 1 }}
            >
              {matches.map((match) => (
                <Paper key={match.id} component="li" variant="outlined" sx={{ py: 0.5 }}>
                  <Side match={match} side="A" names={names} byId={byId} t={t} />
                  <Side match={match} side="B" names={names} byId={byId} t={t} />
                </Paper>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/**
 * Круги сетки по возрастанию, внутри круга — по слоту.
 *
 * Порядок слотов задаёт положение встречи в сетке: перемешанные слоты
 * означают, что полуфинал нарисован раньше своей четвертьфинальной пары.
 */
function rounds(matches: readonly MatchView[]): [number, MatchView[]][] {
  const byRound = new Map<number, MatchView[]>();

  for (const match of matches) {
    if (match.bracketRound === null) {
      continue;
    }

    const bucket = byRound.get(match.bracketRound) ?? [];

    bucket.push(match);
    byRound.set(match.bracketRound, bucket);
  }

  return [...byRound.entries()]
    .sort(([left], [right]) => left - right)
    .map(([round, bucket]): [number, MatchView[]] => [
      round,
      [...bucket].sort((left, right) => (left.bracketSlot ?? 0) - (right.bracketSlot ?? 0)),
    ]);
}

function Side({
  match,
  side,
  names,
  byId,
  t,
}: {
  readonly match: MatchView;
  readonly side: 'A' | 'B';
  readonly names: ReadonlyMap<string, string>;
  readonly byId: ReadonlyMap<string, MatchView>;
  readonly t: Translate;
}): ReactNode {
  const playerId = side === 'A' ? match.playerAId : match.playerBId;
  const source = side === 'A' ? match.sourceA : match.sourceB;
  const own = side === 'A' ? match.setsA : match.setsB;
  const other = side === 'A' ? match.setsB : match.setsA;
  const won = own !== null && other !== null && own > other;

  return (
    // Победитель — насыщенность, цвет счёта и линейка слева сразу: цвет не
    // единственный носитель (раздел 3.4, запрет №6).
    <Box
      component="p"
      sx={{
        m: 0,
        px: 1,
        py: 0.5,
        display: 'flex',
        justifyContent: 'space-between',
        gap: 1,
        typography: 'body2',
        borderLeft: 2,
        borderColor: won ? 'var(--red-500)' : 'transparent',
      }}
    >
      <Box
        component="span"
        sx={won ? { fontWeight: 600, color: 'text.primary' } : { color: 'text.secondary' }}
      >
        {playerId === null
          ? sourceLabel(source, byId, t)
          : (names.get(playerId) ?? t('results.match.unknownPlayer'))}
      </Box>
      <Box
        component="span"
        sx={{
          fontVariantNumeric: 'tabular-nums',
          ...(won ? { fontWeight: 600, color: 'primary.main' } : { color: 'var(--ink-400)' }),
        }}
      >
        {own ?? ''}
      </Box>
    </Box>
  );
}

/** «Победитель встречи №2» вместо пустого места: встреча ждёт именно его. */
function sourceLabel(
  source: BracketSourceView | null,
  byId: ReadonlyMap<string, MatchView>,
  t: Translate,
): string {
  if (source === null) {
    return t('results.match.pending');
  }

  const kind = t(source.kind === 'WINNER' ? 'results.match.winnerOf' : 'results.match.loserOf');
  const slot = byId.get(source.matchId)?.bracketSlot;

  // Слот нумеруется с нуля, а человеку встречи считают с единицы.
  return slot === undefined || slot === null ? kind : `${kind} №${String(slot + 1)}`;
}
