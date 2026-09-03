import type { RatingHistoryView, RatingPointView } from '@kttf/shared/types';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { formatDate, formatDelta, useLocale, useT } from '@/common/i18n';

import RatingChart from './rating-chart';
import { buildRatingScale } from './rating-scale';

interface PlayerRatingProps {
  readonly history: RatingHistoryView;
}

/**
 * Кривая рейтинга и история турниров — ТЗ 9.3.
 *
 * Одна секция на две строки требования: точка кривой и есть турнир, и
 * разносить их по разным разделам значило бы показать одни и те же события
 * дважды.
 *
 * **Мест здесь нет намеренно.** Место считает движок по таблицам и сетке
 * турнира целиком (ADR-023); повторять этот расчёт для каждой строки истории
 * означало бы читать пол-базы ради одной колонки. Место показывает страница
 * результатов, куда ведёт ссылка из строки.
 */
export default function PlayerRating({ history }: PlayerRatingProps): ReactNode {
  const t = useT();
  const scale = buildRatingScale(history.points);

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-ink-900">{t('player.history.title')}</h2>

      {scale === null ? (
        <p className="mt-3 text-ink-500">{t('player.history.empty')}</p>
      ) : (
        <>
          <RatingChart scale={scale} />

          <table className="mt-6 w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-500">
                <th scope="col" className="py-2 font-normal">
                  {t('player.history.date')}
                </th>
                <th scope="col" className="py-2 font-normal">
                  {t('player.history.tournament')}
                </th>
                <th scope="col" className="py-2 text-right font-normal">
                  {t('player.history.matches')}
                </th>
                <th scope="col" className="py-2 text-right font-normal">
                  {t('player.history.delta')}
                </th>
                <th scope="col" className="py-2 text-right font-normal">
                  {t('player.history.after')}
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Кривая идёт слева направо, список — от свежего к старому:
                  человек открывает историю ради последнего турнира. */}
              {[...history.points].reverse().map((point, index) => (
                <Row key={point.tournamentId ?? `adjustment-${String(index)}`} point={point} />
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

function Row({ point }: { readonly point: RatingPointView }): ReactNode {
  const t = useT();
  const locale = useLocale();

  return (
    <tr className="border-b border-line">
      <td className="py-2 whitespace-nowrap text-ink-700">{formatDate(point.playedAt, locale)}</td>
      <td className="py-2 text-ink-900">
        {point.tournamentId === null ? (
          // Ручная корректировка рейтинга (ТЗ 12) не привязана к турниру, но
          // из кривой её не выкинуть: рейтинг после неё другой.
          <span className="text-ink-700">{t('player.history.adjustment')}</span>
        ) : (
          <Link
            to="/tournaments/$tournamentId"
            params={{ tournamentId: point.tournamentId }}
            className="text-red-600 underline"
          >
            {point.tournamentName ?? t('player.history.tournament')}
          </Link>
        )}
      </td>
      <td className="py-2 text-right tabular-nums text-ink-700">{point.matches}</td>
      <td className="py-2 text-right font-medium tabular-nums text-ink-900">
        {formatDelta(point.delta)}
      </td>
      <td className="py-2 text-right tabular-nums text-ink-700">{point.ratingAfter}</td>
    </tr>
  );
}
