import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo, type ReactNode } from 'react';

import { isMissingResource } from '@/common/api';
import { useT } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';
import { useSessionStore } from '@/features/auth/session-store';
import { clubDirectoryQuery } from '@/features/clubs/queries';
import { isClubStaff } from '@/features/clubs/roles';
import { playerName } from '@/features/players/player-name';
import DrawPreview from '@/features/tournaments/draw-preview';
import LifecyclePanel from '@/features/tournaments/lifecycle-panel';
import ParticipantsPanel from '@/features/tournaments/participants-panel';
import { registrationsQuery, tournamentResultsQuery } from '@/features/tournaments/queries';
import RegistrationPanel from '@/features/tournaments/registration-panel';
import RepeatTournament from '@/features/tournaments/repeat-tournament';
import ResultsBracket from '@/features/tournaments/results-bracket';
import ResultsMatches from '@/features/tournaments/results-matches';
import ResultsPlacements from '@/features/tournaments/results-placements';
import ResultsRatings from '@/features/tournaments/results-ratings';
import ResultsStandings from '@/features/tournaments/results-standings';
import TournamentSummary from '@/features/tournaments/tournament-summary';

export const Route = createFileRoute('/_public/tournaments/$tournamentId')({
  component: TournamentPage,
});

/**
 * Публичная страница результатов турнира — ТЗ 9.4.
 *
 * Открыта без входа: критерий готовности MVP требует, чтобы ссылку на
 * результаты можно было отправить в чат клуба и она открылась у любого.
 *
 * Один запрос на всё: `GET /tournaments/:id/results` отдаёт и турнир, и
 * участников, и таблицы, и встречи, и рейтинги. Разбирать это на пять
 * запросов означало бы пять моментов времени в одном ответе — счёт из одного,
 * места из другого.
 */
function TournamentPage(): ReactNode {
  const t = useT();
  const { tournamentId } = Route.useParams();

  const user = useSessionStore((state) => state.user);
  const results = useQuery(tournamentResultsQuery(tournamentId));
  const registrations = useQuery(registrationsQuery(tournamentId));
  const clubs = useQuery(clubDirectoryQuery);

  // Таблицы, сетки и встречи ссылаются на игрока идентификатором, а состав
  // приходит один раз в `participants`.
  const names = useMemo(
    () =>
      new Map(
        (results.data?.participants ?? []).map(
          (participant) => [participant.player.id, playerName(participant.player)] as const,
        ),
      ),
    [results.data],
  );

  const data = results.data;

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/tournaments" className="text-sm text-blue-700 underline">
        {t('nav.tournaments')}
      </Link>

      <div className="mt-4">
        {/* Ссылку на результаты пересылают в чат клуба, и обрывается она там
            же. Общий текст проверки схемы («проверьте заполненные поля») на
            странице без единого поля человеку ничего не объясняет. */}
        {isMissingResource(results.error) ? (
          <p role="alert" className="py-10 text-center text-slate-600">
            {t('tournament.notFound')}
          </p>
        ) : (
          <QueryState
            isPending={results.isPending}
            error={results.error}
            onRetry={() => void results.refetch()}
          >
            {data === undefined ? null : (
              <>
                <TournamentSummary
                  tournament={data.tournament}
                  clubName={clubs.data?.get(data.tournament.clubId)?.name ?? null}
                />
                {/* Проведение турнира — ТЗ 4.1. Панель показывается только
                    организатору клуба-хозяина и молчит у всех остальных. */}
                <LifecyclePanel tournament={data.tournament} names={names} />
                {/* Запись и состав идут сразу за карточкой: пока турнир не
                    сыгран, это единственное, ради чего его страницу
                    открывают. Результаты ниже до старта пусты. */}
                <RegistrationPanel
                  tournament={data.tournament}
                  registrations={registrations.data ?? []}
                />
                <ParticipantsPanel
                  tournament={data.tournament}
                  registrations={registrations.data ?? []}
                />
                {/* «Повторить прошлый» — ТЗ 4.2. Стоит у турнира, а не в
                    форме создания: копирует настройки сервер, и брать их
                    неоткуда, кроме как у самого турнира. */}
                {/* Расстановка до старта видна организатору: после старта
                    менять её уже нечем, а публичные результаты ниже
                    показываются только у начатого турнира. */}
                {isClubStaff(user, data.tournament.clubId) &&
                  data.tournament.startedAt === null && (
                    <>
                      <DrawPreview stages={data.stages} names={names} />
                      <ResultsBracket stages={data.stages} names={names} />
                    </>
                  )}
                <RepeatTournament tournament={data.tournament} />
                {/* Результаты — у начатого турнира. До старта места «не
                    определены», а изменения рейтинга нулевые у всех: такие
                    таблицы выглядят поломкой, а не пустотой. */}
                {data.tournament.startedAt !== null && (
                  <>
                    <ResultsPlacements
                      participants={data.participants}
                      shared={data.shared}
                      unresolved={data.unresolved}
                      names={names}
                    />
                    <ResultsStandings standings={data.standings} names={names} />
                    <ResultsBracket stages={data.stages} names={names} />
                    <ResultsMatches stages={data.stages} names={names} />
                    <ResultsRatings ratings={data.ratings} names={names} />
                  </>
                )}
              </>
            )}
          </QueryState>
        )}
      </div>
    </section>
  );
}
