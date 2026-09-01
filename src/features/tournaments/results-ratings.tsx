import type { ParticipantRatingView } from '@kttf/shared/types';
import type { ReactNode } from 'react';

import { formatDelta, useT } from '@/common/i18n';

interface ResultsRatingsProps {
  readonly ratings: readonly ParticipantRatingView[];
  readonly names: ReadonlyMap<string, string>;
}

/**
 * Изменения рейтинга участников — ТЗ 9.4 и ТЗ 7.3.
 *
 * Ни одно число здесь не считается: `totalDelta` приходит от сервера уже
 * сложенным, а рейтинги — строками. Сложение строк через число с плавающей
 * точкой — ровно тот способ потерять сотую долю, ради которого рейтинг и
 * передаётся строкой (ADR-014).
 *
 * `ratingAtStart` и `ratingAfter` не обязаны отличаться ровно на `totalDelta`:
 * дельта считается против снимка на старте, а применяется к текущей проекции,
 * и между ними мог лечь другой турнир (ADR-022).
 */
export default function ResultsRatings({ ratings, names }: ResultsRatingsProps): ReactNode {
  const t = useT();

  if (ratings.length === 0) {
    return null;
  }

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-slate-900">{t('results.ratings.title')}</h2>

      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500">
            <th scope="col" className="py-2 font-normal">
              {t('results.ratings.player')}
            </th>
            <th scope="col" className="py-2 font-normal">
              {t('results.ratings.before')}
            </th>
            <th scope="col" className="py-2 font-normal">
              {t('results.ratings.delta')}
            </th>
            <th scope="col" className="py-2 font-normal">
              {t('results.ratings.after')}
            </th>
          </tr>
        </thead>
        <tbody>
          {ratings.map((rating) => (
            <tr key={rating.playerId} className="border-b border-slate-100 align-top">
              <td className="py-2 text-slate-900">
                {names.get(rating.playerId) ?? rating.playerId}
                <Events rating={rating} />
              </td>
              <td className="py-2 tabular-nums text-slate-600">{rating.ratingAtStart ?? '—'}</td>
              <td className="py-2 tabular-nums font-medium text-slate-900">
                {formatDelta(rating.totalDelta)}
              </td>
              <td className="py-2 tabular-nums text-slate-600">
                {rating.ratingAfter ?? (
                  <span className="text-slate-400">{t('results.ratings.pending')}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/**
 * Журнал по встречам — ТЗ 7.3.
 *
 * Свёрнут: разобрать спор по нему нужно редко, а развёрнутым он превращает
 * таблицу на двадцать участников в несколько экранов.
 */
function Events({ rating }: { readonly rating: ParticipantRatingView }): ReactNode {
  const t = useT();

  if (rating.events.length === 0) {
    return null;
  }

  return (
    <details className="mt-1">
      <summary className="cursor-pointer text-xs text-slate-500">
        {t('results.ratings.events')}
      </summary>
      <ol className="mt-1 space-y-0.5 text-xs tabular-nums text-slate-500">
        {rating.events.map((event, index) => (
          <li key={event.matchId ?? index}>
            {event.ratingBefore} {formatDelta(event.delta)} = {event.ratingAfter}
          </li>
        ))}
      </ol>
    </details>
  );
}
