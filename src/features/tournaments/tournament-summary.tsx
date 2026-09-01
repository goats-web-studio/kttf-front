import type { TournamentView } from '@kttf/shared/types';
import type { ReactNode } from 'react';

import { formatDateTime, formatMoney, useLocale, useT } from '@/common/i18n';

import { TOURNAMENT_LEVEL_KEYS, TOURNAMENT_STATUS_KEYS } from './labels';

interface TournamentSummaryProps {
  readonly tournament: TournamentView;
  /** `null` — справочник клубов ещё не пришёл либо клуб из него удалён. */
  readonly clubName: string | null;
}

/** Шапка страницы турнира: то, что человек ищет глазами первым (ТЗ 4.2). */
export default function TournamentSummary({
  tournament,
  clubName,
}: TournamentSummaryProps): ReactNode {
  const t = useT();
  const locale = useLocale();

  return (
    <header>
      <h1 className="text-2xl font-semibold text-slate-900">{tournament.name}</h1>

      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <Field label={t('tournament.status')}>{t(TOURNAMENT_STATUS_KEYS[tournament.status])}</Field>
        <Field label={t('tournament.startsAt')}>
          {formatDateTime(tournament.startsAt, locale)}
        </Field>
        <Field label={t('tournament.level')}>{t(TOURNAMENT_LEVEL_KEYS[tournament.level])}</Field>
        {clubName !== null && <Field label={t('tournament.club')}>{clubName}</Field>}
        <Field label={t('tournament.participants')}>{tournament.participantCount}</Field>
        <Field label={t('tournament.entryFee')}>
          {tournament.entryFee === 0
            ? t('tournament.entryFee.free')
            : formatMoney(tournament.entryFee, locale)}
        </Field>
      </dl>
    </header>
  );
}

function Field({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-900">{children}</dd>
    </div>
  );
}
