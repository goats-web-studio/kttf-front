import type { MatchView, StageView } from '@kttf/shared/types';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

import { MATCH_STATUS_KEYS, RESULT_TYPE_KEYS, STAGE_TYPE_KEYS } from './labels';

interface ResultsMatchesProps {
  readonly stages: readonly StageView[];
  readonly names: ReadonlyMap<string, string>;
}

/**
 * Все встречи со счётом — ТЗ 9.4.
 *
 * Порядок встреч внутри этапа задаёт сервер (круг, затем слот). Здесь только
 * разбивка по группам: без неё круговые встречи трёх групп сливаются в один
 * список, в котором не видно, кто с кем в одной группе.
 */
export default function ResultsMatches({ stages, names }: ResultsMatchesProps): ReactNode {
  const t = useT();

  if (stages.length === 0) {
    return null;
  }

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-slate-900">{t('results.matches.title')}</h2>
      {stages.map((stage) => (
        <div key={stage.id} className="mt-6">
          <h3 className="text-sm font-semibold text-slate-900">
            {stage.name} · {t(STAGE_TYPE_KEYS[stage.type])}
          </h3>
          {partition(stage).map((part) => (
            <div key={part.label} className="mt-3">
              {part.label !== '' && <p className="text-xs text-slate-500">{part.label}</p>}
              <ul className="mt-1 divide-y divide-slate-100">
                {part.matches.map((match) => (
                  <Row key={match.id} match={match} names={names} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

interface Partition {
  readonly label: string;
  readonly matches: readonly MatchView[];
}

/**
 * Встречи этапа, разложенные по группам.
 *
 * У этапа без групп остаётся одна часть с пустым заголовком: сетке и круговой
 * схеме делить нечего.
 */
function partition(stage: StageView): readonly Partition[] {
  if (stage.groups.length === 0) {
    return [{ label: '', matches: stage.matches }];
  }

  const parts = stage.groups.map((group) => ({
    label: group.label,
    matches: stage.matches.filter((match) => match.groupId === group.id),
  }));

  // Встречи без группы у этапа с группами существуют: так выглядит стыковой
  // матч, достроенный по итогам групп (ADR-021).
  const loose = stage.matches.filter((match) => match.groupId === null);

  return loose.length === 0 ? parts : [...parts, { label: '', matches: loose }];
}

function Row({
  match,
  names,
}: {
  readonly match: MatchView;
  readonly names: ReadonlyMap<string, string>;
}): ReactNode {
  const t = useT();
  const played = match.setsA !== null && match.setsB !== null;

  const note = [
    match.resultType === null || match.resultType === 'NORMAL'
      ? null
      : t(RESULT_TYPE_KEYS[match.resultType]),
    match.status === 'FINISHED' ? null : t(MATCH_STATUS_KEYS[match.status]),
  ].filter((value) => value !== null);

  return (
    <li className="flex items-baseline justify-between gap-3 py-2 text-sm">
      <span className="text-slate-900">
        <Name id={match.playerAId} names={names} /> — <Name id={match.playerBId} names={names} />
      </span>
      <span className="flex items-baseline gap-3">
        {note.length > 0 && <span className="text-xs text-slate-500">{note.join(' · ')}</span>}
        <span className="tabular-nums text-slate-900">
          {played ? `${String(match.setsA)} : ${String(match.setsB)}` : '—'}
        </span>
      </span>
    </li>
  );
}

function Name({
  id,
  names,
}: {
  readonly id: string | null;
  readonly names: ReadonlyMap<string, string>;
}): ReactNode {
  const t = useT();

  if (id === null) {
    return <span className="text-slate-400">{t('results.match.pending')}</span>;
  }

  return names.get(id) ?? t('results.match.unknownPlayer');
}
