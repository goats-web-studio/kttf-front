import type { TieGroupView } from '@kttf/shared/types';
import type { ReactNode } from 'react';

interface ResultsTiesProps {
  readonly title: string;
  readonly ties: readonly TieGroupView[];
  readonly names: ReadonlyMap<string, string>;
}

/**
 * Участники, делящие места, — и в итоговых местах, и в групповой таблице.
 *
 * Секция не показывается пустой: у олимпийки с матчем за третье место делить
 * нечего, и пустой заголовок «Делят места» заставил бы искать, чего не хватает.
 * По ADR-008 неразрешённое равенство разводит судья, поэтому список читается
 * ещё и как перечень того, что осталось сделать.
 */
export default function ResultsTies({ title, ties, names }: ResultsTiesProps): ReactNode {
  if (ties.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <ul className="mt-2 space-y-1 text-sm text-slate-600">
        {ties.map((tie) => (
          <li key={tie.participants.join(',')}>
            <span className="font-medium text-slate-900">{placesLabel(tie.places)}</span>{' '}
            {tie.participants.map((id) => names.get(id) ?? id).join(', ')}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Диапазон мест: `[2, 3, 4]` показывается как «2–4», одиночное — числом. */
function placesLabel(places: readonly number[]): string {
  const first = places[0];
  const last = places.at(-1);

  if (first === undefined || last === undefined) {
    return '';
  }

  return first === last ? String(first) : `${String(first)}–${String(last)}`;
}
