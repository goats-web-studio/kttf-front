import type { GroupStandingsView, TieDecisionInput } from '@kttf/shared/types';
import { useState, type ReactNode } from 'react';

import { useT } from '@/common/i18n';

interface TiePanelProps {
  readonly groups: readonly GroupStandingsView[];
  readonly names: ReadonlyMap<string, string>;
  readonly onDecide: (input: TieDecisionInput) => void;
  readonly isPending: boolean;
}

/**
 * Равенство очков разрешает судья — ТЗ 6.6, ADR-008.
 *
 * Правила 1–5 система применяет сама; когда их не хватило, порядок остаётся
 * неопределённым, и турнир не переходит в «Завершён». Здесь судья ставит
 * участников в том порядке, который выбрал, — жребий бросает человек,
 * а не система.
 *
 * Панель показывается только при неразрешённом равенстве: в обычном турнире
 * судья её не видит.
 */
export default function TiePanel({ groups, names, onDecide, isPending }: TiePanelProps): ReactNode {
  const t = useT();
  const pending = groups.filter((group) => group.unresolved.length > 0);

  if (pending.length === 0) {
    return null;
  }

  return (
    <section className="rounded border border-amber-700 bg-amber-950 p-3">
      <h2 className="text-sm font-semibold text-amber-300 uppercase">{t('console.tie.title')}</h2>
      <p className="mt-1 text-xs text-amber-200">{t('console.tie.lead')}</p>

      {pending.map((group) =>
        group.unresolved.map((tie) => (
          <TieOrder
            key={`${group.groupId ?? group.stageId}:${tie.participants.join(',')}`}
            groupId={group.groupId}
            label={group.label}
            participants={tie.participants}
            names={names}
            onDecide={onDecide}
            isPending={isPending}
          />
        )),
      )}
    </section>
  );
}

function TieOrder({
  groupId,
  label,
  participants,
  names,
  onDecide,
  isPending,
}: {
  readonly groupId: string | null;
  readonly label: string;
  readonly participants: readonly string[];
  readonly names: ReadonlyMap<string, string>;
  readonly onDecide: (input: TieDecisionInput) => void;
  readonly isPending: boolean;
}): ReactNode {
  const t = useT();
  const [order, setOrder] = useState<readonly string[]>(participants);

  function move(index: number, delta: number): void {
    const target = index + delta;

    if (target < 0 || target >= order.length) {
      return;
    }

    const next = [...order];
    const moved = next[index];
    const displaced = next[target];

    if (moved === undefined || displaced === undefined) {
      return;
    }

    next[index] = displaced;
    next[target] = moved;
    setOrder(next);
  }

  return (
    <div className="mt-3 rounded bg-slate-900 p-2">
      <p className="text-xs text-slate-400">{label}</p>
      <ol className="mt-1 space-y-1">
        {order.map((participant, index) => (
          <li key={participant} className="flex items-center gap-2 text-sm">
            <span className="w-5 text-slate-400">{index + 1}.</span>
            <span className="grow">{names.get(participant) ?? participant}</span>
            <button
              type="button"
              aria-label={t('console.tie.up')}
              onClick={() => {
                move(index, -1);
              }}
              className="rounded bg-slate-700 px-2 py-1"
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={t('console.tie.down')}
              onClick={() => {
                move(index, 1);
              }}
              className="rounded bg-slate-700 px-2 py-1"
            >
              ↓
            </button>
          </li>
        ))}
      </ol>

      <button
        type="button"
        disabled={isPending || groupId === null}
        onClick={() => {
          if (groupId !== null) {
            onDecide({ groupId, orderedIds: [...order] });
          }
        }}
        className="mt-2 rounded bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {t('console.tie.confirm')}
      </button>
    </div>
  );
}
