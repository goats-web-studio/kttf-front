import type { ClubView, TournamentView } from '@kttf/shared/types';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { formatDateParts, formatMoney, useLocale, useT } from '@/common/i18n';

import { TOURNAMENT_LEVEL_KEYS } from './labels';
import StatusBadge from './status-badge';

interface TournamentCardProps {
  readonly tournament: TournamentView;
  /** Из справочника клубов; до его ответа строка клуба просто пуста. */
  readonly club: ClubView | undefined;
}

/**
 * Турнир в календаре — docs/07-design-system.md, 5.2, `TournamentCard`.
 *
 * Слева дата плашкой: календарь пробегают глазами по дням, и число набрано
 * дисплейным шрифтом — это якорь строки. Справа то, что решает «идти или
 * нет»: название, клуб с городом, состояние, уровень и взнос.
 *
 * Ссылка — название, а не вся карточка: карточка-ссылка зачитывается
 * скринридером целиком одной строкой. Площадь нажатия расширена на карточку
 * псевдоэлементом — на телефоне попасть пальцем в название не нужно.
 */
export default function TournamentCard({ tournament, club }: TournamentCardProps): ReactNode {
  const t = useT();
  const locale = useLocale();
  const date = formatDateParts(tournament.startsAt, locale);

  return (
    <article className="relative flex gap-4 py-4 transition-colors duration-(--dur-fast) hover:bg-paper-hover sm:gap-6 sm:px-3">
      <time
        dateTime={tournament.startsAt}
        className="flex w-14 shrink-0 flex-col items-center border-r border-line pr-4 sm:w-16"
      >
        <span className="font-display text-display-sm font-semibold tabular-nums text-ink-900">
          {date.day}
        </span>
        <span className="text-xs text-ink-500">{date.month}</span>
        {date.year !== undefined && (
          <span className="text-xs tabular-nums text-ink-500">{date.year}</span>
        )}
        <span className="mt-1 text-xs tabular-nums text-ink-500">{date.time}</span>
      </time>

      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold text-ink-900">
          <Link
            to="/tournaments/$tournamentId"
            params={{ tournamentId: tournament.id }}
            className="after:absolute after:inset-0 hover:text-red-600"
          >
            {tournament.name}
          </Link>
        </h2>
        {club !== undefined && (
          <p className="mt-0.5 truncate text-sm text-ink-700">
            {club.name} · {club.city}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-500">
          <StatusBadge status={tournament.status} />
          <span>{t(TOURNAMENT_LEVEL_KEYS[tournament.level])}</span>
          <span className="tabular-nums">
            {tournament.entryFee === 0
              ? t('tournament.entryFee.free')
              : formatMoney(tournament.entryFee, locale)}
          </span>
        </div>
      </div>
    </article>
  );
}
