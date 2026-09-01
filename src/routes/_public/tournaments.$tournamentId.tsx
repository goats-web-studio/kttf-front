import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo, type ReactNode } from 'react';

import { useT } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';
import { clubDirectoryQuery } from '@/features/clubs/queries';
import { playerName } from '@/features/players/player-name';
import { tournamentResultsQuery } from '@/features/tournaments/queries';
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

  const results = useQuery(tournamentResultsQuery(tournamentId));
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
        </QueryState>
      </div>
    </section>
  );
}
