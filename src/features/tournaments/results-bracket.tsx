import type { BracketSourceView, MatchView, StageView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { useT, type MessageKey } from '@/common/i18n';

import Surface from '@/common/ui/surface';

import { stageTitle } from './labels';
import { BRACKET_STAGES } from './results-tabs';

interface ResultsBracketProps {
  readonly stages: readonly StageView[];
  readonly names: ReadonlyMap<string, string>;
}

type Translate = (key: MessageKey) => string;

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
  const columns = rounds(stage.matches);

  return (
    <Surface title={stageTitle(stage, t)} component="div" flush>
      {/* На телефоне круги листаются свайпом вбок, каждый прилипает к краю
          (раздел 5.2, BracketView): сетка целиком шире экрана. */}
      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          pb: { xs: 2, sm: 3 },
          display: 'flex',
          gap: { xs: 2, sm: 3 },
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
        }}
      >
        {columns.map(([round, matches], index) => (
          <Box
            key={round}
            sx={{
              minWidth: 232,
              flexShrink: 0,
              scrollSnapAlign: 'start',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Typography
              variant="caption"
              component="p"
              sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}
            >
              {roundTitle(round, columns.length - 1 - index, t)}
            </Typography>
            {/* Встречи круга разнесены по высоте: полуфинал стоит между своими
                четвертьфиналами, и сетка читается как сетка, а не как столбик. */}
            <Box
              component="ul"
              sx={{
                listStyle: 'none',
                m: 0,
                p: 0,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-around',
                gap: 1.5,
              }}
            >
              {matches.map((match) => (
                <Paper
                  key={match.id}
                  component="li"
                  variant="outlined"
                  sx={{
                    py: 0.5,
                    borderRadius: 3,
                    boxShadow: 'none',
                    bgcolor: 'var(--paper-sunken)',
                  }}
                >
                  <Side match={match} side="A" names={names} byId={byId} t={t} />
                  <Side match={match} side="B" names={names} byId={byId} t={t} />
                </Paper>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </Surface>
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
    // Победитель — насыщенность имени и залитый счёт сразу: цвет не
    // единственный носитель (раздел 3.4, запрет №6).
    <Box
      component="p"
      sx={{
        m: 0,
        px: 1.5,
        py: 0.75,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        typography: 'body2',
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
      {own !== null && (
        <Box
          component="span"
          sx={{
            minWidth: 24,
            height: 24,
            px: 0.75,
            borderRadius: 1.5,
            display: 'grid',
            placeItems: 'center',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 700,
            ...(won
              ? { bgcolor: 'var(--red-600)', color: '#ffffff' }
              : { bgcolor: 'var(--paper)', color: 'var(--ink-500)' }),
          }}
        >
          {own}
        </Box>
      )}
    </Box>
  );
}

/**
 * Название круга по расстоянию до финала: «Финал», «Полуфинал», «1/4
 * финала». Дальше — «Круг N»: 1/16 никто так не называет.
 */
function roundTitle(round: number, fromFinal: number, t: Translate): string {
  if (fromFinal === 0) {
    return t('results.bracket.final');
  }
  if (fromFinal === 1) {
    return t('results.bracket.semifinal');
  }
  if (fromFinal === 2) {
    return t('results.bracket.quarterfinal');
  }

  return `${t('results.bracket.round')} ${String(round)}`;
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
