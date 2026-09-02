import { checkEligibility, type EligibilityProblem } from '@kttf/shared/eligibility';
import type { RegistrationView, TournamentView } from '@kttf/shared/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { formatDateTime, useLocale, useT } from '@/common/i18n';
import { useSessionStore } from '@/features/auth/session-store';
import { playerQuery } from '@/features/players/queries';

import { registerForTournament, removeRegistration } from './api';
import { eligibilityProblems, problemKeys } from './eligibility-problems';
import { tournamentKeys } from './queries';

interface RegistrationPanelProps {
  readonly tournament: TournamentView;
  readonly registrations: readonly RegistrationView[];
}

/**
 * Запись игрока на турнир — ТЗ 4.3.
 *
 * Порядок шагов требования: человек видит условия и свой рейтинг, потом
 * подтверждает участие. Условия поэтому показываются всегда, а не всплывают
 * отказом после нажатия.
 *
 * Право на запись проверяет сервер (ТС 8.3). Интерфейс не пускает туда, где
 * отказ предрешён — закрытая регистрация, прошедший дедлайн, отсутствие
 * профиля, — но правилом это не подменяет.
 */
export default function RegistrationPanel({
  tournament,
  registrations,
}: RegistrationPanelProps): ReactNode {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const user = useSessionStore((state) => state.user);

  // Время открытия страницы, а не текущее на каждый перерисовке: часы во
  // время отрисовки делают её неидемпотентной, а дедлайн, прошедший за время
  // чтения страницы, всё равно отловит сервер.
  const [openedAt] = useState(() => Date.now());

  // Правило сервера: состав меняется только при открытой регистрации.
  const isOpen = tournament.status === 'REG_OPEN';
  const deadline = tournament.registrationEndsAt ?? tournament.startsAt;
  const isExpired = Date.parse(deadline) <= openedAt;

  const mine =
    user?.playerId == null
      ? undefined
      : registrations.find((registration) => registration.player.id === user.playerId);

  // Свой профиль читается ради допуска: в сессии лежит только идентификатор
  // игрока (ТС 7.1), а правилу нужны рейтинг, год рождения и пол. Запрос идёт
  // только у вошедшего с профилем — гостю проверять нечего.
  const playerId = user?.playerId ?? null;
  const profile = useQuery({
    ...playerQuery(playerId ?? ''),
    enabled: playerId !== null,
  });

  // Правило одно на сервер и на экран — @kttf/shared/eligibility (ADR-029).
  // Пока профиль не пришёл, причин нет: показать «нельзя» до того, как стало
  // известно почему, хуже, чем подождать.
  const problems: readonly EligibilityProblem[] =
    profile.data === undefined
      ? []
      : checkEligibility(
          {
            // Рейтинг в правило идёт числом: с планкой его только сравнивают,
            // и от последней сотой результат сравнения не зависит. На экране
            // он остаётся строкой, как пришёл (ADR-014, ADR-029).
            rating: Number(profile.data.rating),
            birthYear: profile.data.birthYear,
            gender: profile.data.gender,
          },
          {
            ratingCapMax: numberOrNull(tournament.ratingCapMax),
            ratingCapMin: numberOrNull(tournament.ratingCapMin),
            birthYearFrom: tournament.birthYearFrom,
            birthYearTo: tournament.birthYearTo,
            genderLimit: tournament.genderLimit,
          },
        );

  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
  };

  const join = useMutation({
    mutationFn: () => registerForTournament(tournament.id, {}),
    onSuccess: refresh,
  });

  const leave = useMutation({
    mutationFn: (registrationId: string) => removeRegistration(tournament.id, registrationId),
    onSuccess: refresh,
  });

  if (!isOpen && mine === undefined) {
    // Ни записаться, ни отменить нечего: показывать пустую рамку незачем.
    return null;
  }

  return (
    <section className="mt-8 rounded border border-slate-200 p-4">
      <h2 className="text-lg font-semibold text-slate-900">{t('registration.title')}</h2>

      <Conditions tournament={tournament} registrations={registrations} />

      <p className="mt-3 text-sm text-slate-600">
        {t('registration.deadline')} {formatDateTime(deadline, locale)}
      </p>

      <div className="mt-4">
        {mine !== undefined ? (
          <>
            <p className="text-slate-900">
              {mine.status === 'WAITLIST' ? t('registration.waitlisted') : t('registration.joined')}
            </p>
            {isExpired ? (
              // Отмена только до дедлайна — ТЗ 4.3. После него снять участника
              // может организатор, и просить об этом придётся его.
              <p className="mt-2 text-sm text-slate-500">{t('registration.cancelClosed')}</p>
            ) : (
              <button
                type="button"
                disabled={leave.isPending}
                onClick={() => {
                  leave.mutate(mine.id);
                }}
                className="mt-2 text-sm text-blue-700 underline disabled:text-slate-400"
              >
                {t('registration.cancel')}
              </button>
            )}
            <Refusal error={leave.error} />
          </>
        ) : (
          <Join
            isExpired={isExpired}
            hasProfile={playerId !== null}
            isSignedIn={user !== null}
            isPending={join.isPending}
            isChecking={playerId !== null && profile.data === undefined}
            problems={problems}
            error={join.error}
            tournamentId={tournament.id}
            onJoin={() => {
              join.mutate();
            }}
          />
        )}
      </div>
    </section>
  );
}

/**
 * Условия допуска — ТЗ 4.3, шаг 1.
 *
 * Показываются все заданные ограничения турнира. Незаданное не строкой
 * «без ограничения», а отсутствием строки: список из четырёх «нет» читается
 * хуже, чем его отсутствие.
 */
function Conditions({
  tournament,
  registrations,
}: {
  readonly tournament: TournamentView;
  readonly registrations: readonly RegistrationView[];
}): ReactNode {
  const t = useT();

  const taken = registrations.filter(
    (registration) => registration.status !== 'WAITLIST' && registration.status !== 'WITHDRAWN',
  ).length;

  const rows: { readonly label: string; readonly value: string }[] = [];

  if (tournament.ratingCapMin !== null) {
    rows.push({ label: t('registration.ratingFrom'), value: tournament.ratingCapMin });
  }

  if (tournament.ratingCapMax !== null) {
    rows.push({ label: t('registration.ratingTo'), value: tournament.ratingCapMax });
  }

  if (tournament.birthYearFrom !== null) {
    rows.push({
      label: t('registration.birthYearFrom'),
      value: String(tournament.birthYearFrom),
    });
  }

  if (tournament.birthYearTo !== null) {
    rows.push({ label: t('registration.birthYearTo'), value: String(tournament.birthYearTo) });
  }

  if (tournament.genderLimit !== null) {
    rows.push({
      label: t('registration.gender'),
      value: t(tournament.genderLimit === 'FEMALE' ? 'player.gender.FEMALE' : 'player.gender.MALE'),
    });
  }

  if (tournament.maxParticipants !== null) {
    rows.push({
      label: t('registration.places'),
      value: `${String(taken)} / ${String(tournament.maxParticipants)}`,
    });
  }

  if (rows.length === 0) {
    return <p className="mt-2 text-sm text-slate-600">{t('registration.noLimits')}</p>;
  }

  return (
    <dl className="mt-3 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[max-content_1fr]">
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <dt className="text-slate-500">{row.label}</dt>
          <dd className="tabular-nums text-slate-900">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Кнопка записи и то, что мешает её нажать. */
function Join({
  isExpired,
  hasProfile,
  isSignedIn,
  isPending,
  isChecking,
  problems,
  error,
  tournamentId,
  onJoin,
}: {
  readonly isExpired: boolean;
  readonly hasProfile: boolean;
  readonly isSignedIn: boolean;
  readonly isPending: boolean;
  readonly isChecking: boolean;
  readonly problems: readonly EligibilityProblem[];
  readonly error: unknown;
  readonly tournamentId: string;
  readonly onJoin: () => void;
}): ReactNode {
  const t = useT();

  if (isExpired) {
    return <p className="text-slate-600">{t('registration.expired')}</p>;
  }

  if (!isSignedIn) {
    return (
      <Link
        to="/login"
        search={{ redirect: `/tournaments/${tournamentId}` }}
        className="text-blue-700 underline"
      >
        {t('registration.signInToJoin')}
      </Link>
    );
  }

  if (!hasProfile) {
    // Записывается игрок, а не аккаунт: без профиля сервер откажет (ТЗ 2.2).
    return (
      <p className="text-slate-600">
        {t('registration.profileRequired')}{' '}
        <Link to="/cabinet" className="text-blue-700 underline">
          {t('page.cabinet.title')}
        </Link>
      </p>
    );
  }

  const blocked = problems.length > 0;

  return (
    <>
      <button
        type="button"
        disabled={isPending || isChecking || blocked}
        onClick={onJoin}
        className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
      >
        {isPending || isChecking ? t('common.loading') : t('registration.join')}
      </button>

      {/*
        Причина названа до нажатия, а не после отказа сервера (ADR-029):
        кнопка, которая гарантированно откажет, — ложное обещание. Правилом
        это не подменяет — записывает по-прежнему сервер, и его отказ ниже.

        Пока свой профиль не прочитан, кнопка занята, а не погашена молча:
        неизвестно ещё не значит «нельзя».
      */}
      {blocked ? (
        <ul role="alert" className="mt-2 text-sm text-red-700">
          {problemKeys(problems).map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      ) : null}

      <Refusal error={error} />
    </>
  );
}

/**
 * Планка рейтинга из строки контракта — в число для правила допуска.
 *
 * `Number(null)` — это ноль, то есть планка «не ниже нуля» вместо её
 * отсутствия: пустое значение обязано остаться пустым.
 */
function numberOrNull(value: string | null): number | null {
  return value === null ? null : Number(value);
}

/**
 * Отказ сервера человеческими словами.
 *
 * Недопуск приходит списком причин в `details.problems`: все сразу, а не
 * первая попавшаяся — узнавать о следующей после устранения предыдущей
 * человек не должен.
 */
function Refusal({ error }: { readonly error: unknown }): ReactNode {
  const t = useT();

  if (error === null || error === undefined) {
    return null;
  }

  const problems = eligibilityProblems(error);

  return (
    <div role="alert" className="mt-2 text-sm text-red-700">
      {problems.length === 0 ? (
        t(errorMessageKey(error))
      ) : (
        <ul>
          {problems.map((problem) => (
            <li key={problem}>{t(problem)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
