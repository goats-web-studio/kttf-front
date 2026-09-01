import type { RegistrationStatus, ResultParticipantView, TieGroupView } from '@kttf/shared/types';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import { playerName } from '@/features/players/player-name';

import { PLACEMENT_REASON_KEYS, REGISTRATION_STATUS_KEYS } from './labels';
import ResultsTies from './results-ties';

interface ResultsPlacementsProps {
  readonly participants: readonly ResultParticipantView[];
  readonly shared: readonly TieGroupView[];
  readonly unresolved: readonly TieGroupView[];
  readonly names: ReadonlyMap<string, string>;
}

/**
 * Статусы, о которых зритель обязан узнать.
 *
 * Про остальные говорить нечего: «зарегистрирован» и «играет» ничего не
 * добавляют к строке с местом, а колонка, заполненная у всех, перестаёт
 * привлекать внимание там, где это нужно.
 */
const NOTABLE: ReadonlySet<RegistrationStatus> = new Set<RegistrationStatus>([
  'WITHDRAWN',
  'NO_SHOW',
  'WAITLIST',
]);

/**
 * Итоговые места — ТЗ 9.4.
 *
 * Порядок строк задаёт сервер: занявшие места по возрастанию, затем прочие.
 * Пересортировка здесь означала бы второе понимание того, кто выше, — при
 * делёжке мест оно разойдётся с серверным (ADR-023).
 */
export default function ResultsPlacements({
  participants,
  shared,
  unresolved,
  names,
}: ResultsPlacementsProps): ReactNode {
  const t = useT();

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-slate-900">{t('results.places.title')}</h2>

      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500">
            <th scope="col" className="py-2 font-normal">
              {t('results.places.place')}
            </th>
            <th scope="col" className="py-2 font-normal">
              {t('results.places.player')}
            </th>
            <th scope="col" className="py-2 font-normal">
              {t('results.places.seed')}
            </th>
            <th scope="col" className="py-2 font-normal">
              {t('results.places.note')}
            </th>
          </tr>
        </thead>
        <tbody>
          {participants.map((participant) => (
            <tr key={participant.player.id} className="border-b border-slate-100">
              <td className="py-2 font-medium text-slate-900">
                {participant.place ?? <span className="text-slate-400">—</span>}
              </td>
              <td className="py-2 text-slate-900">{playerName(participant.player)}</td>
              <td className="py-2 text-slate-500">{participant.seed ?? ''}</td>
              <td className="py-2 text-slate-500">
                <Notes participant={participant} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ResultsTies title={t('results.shared.title')} ties={shared} names={names} />
      <ResultsTies title={t('results.unresolved.title')} ties={unresolved} names={names} />
    </section>
  );
}

function Notes({ participant }: { readonly participant: ResultParticipantView }): ReactNode {
  const t = useT();

  const notes = [
    participant.place === null ? t(PLACEMENT_REASON_KEYS[participant.reason]) : null,
    NOTABLE.has(participant.status) ? t(REGISTRATION_STATUS_KEYS[participant.status]) : null,
    participant.isRated ? null : t('results.notRated'),
  ].filter((note) => note !== null);

  return notes.join(' · ');
}
