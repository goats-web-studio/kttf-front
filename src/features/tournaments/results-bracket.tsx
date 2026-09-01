import type { BracketSourceView, MatchView, StageView } from '@kttf/shared/types';
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
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-slate-900">{t('results.bracket.title')}</h2>
      {bracketed.map((stage) => (
        <StageBracket key={stage.id} stage={stage} names={names} />
      ))}
    </section>
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
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-slate-900">
        {stage.name} · {t(STAGE_TYPE_KEYS[stage.type])}
      </h3>

      <div className="mt-3 flex gap-6 overflow-x-auto pb-2">
        {rounds(stage.matches).map(([round, matches]) => (
          <div key={round} className="min-w-56 shrink-0">
            <p className="text-xs text-slate-500">
              {t('results.bracket.round')} {round}
            </p>
            <ul className="mt-2 space-y-2">
              {matches.map((match) => (
                <li key={match.id} className="rounded border border-slate-200 p-2 text-sm">
                  <Side match={match} side="A" names={names} byId={byId} t={t} />
                  <Side match={match} side="B" names={names} byId={byId} t={t} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
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
    <p className="flex justify-between gap-2">
      <span className={won ? 'font-semibold text-slate-900' : 'text-slate-700'}>
        {playerId === null
          ? sourceLabel(source, byId, t)
          : (names.get(playerId) ?? t('results.match.unknownPlayer'))}
      </span>
      <span className="tabular-nums text-slate-600">{own ?? ''}</span>
    </p>
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
