import type { TournamentResultsView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useId, useMemo, useRef, type ReactNode } from 'react';
import { z } from 'zod';

import { isMissingResource } from '@/common/api';
import { useT } from '@/common/i18n';
import { BackLink } from '@/common/ui/page-header';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
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
import {
  availableResultTabs,
  RESULT_TAB_LABELS,
  searchResultTab,
  type ResultTab,
} from '@/features/tournaments/results-tabs';
import TournamentSummary from '@/features/tournaments/tournament-summary';

const searchSchema = z.object({ tab: searchResultTab });

export const Route = createFileRoute('/_public/tournaments/$tournamentId')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
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
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <BackLink href="/tournaments" label={t('nav.tournaments')} />

      <Box sx={{ mt: 1 }}>
        {/* Ссылку на результаты пересылают в чат клуба, и обрывается она там
            же. Общий текст проверки схемы («проверьте заполненные поля») на
            странице без единого поля человеку ничего не объясняет. */}
        {isMissingResource(results.error) ? (
          <Typography role="alert" color="text.secondary" sx={{ py: 5, textAlign: 'center' }}>
            {t('tournament.notFound')}
          </Typography>
        ) : (
          <QueryState
            isPending={results.isPending}
            error={results.error}
            onRetry={() => void results.refetch()}
            loading={<RowsSkeleton />}
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
                {/* «Повторить прошлый» — ТЗ 4.2. Стоит у турнира, а не в
                    форме создания: копирует настройки сервер, и брать их
                    неоткуда, кроме как у самого турнира. */}
                <RepeatTournament tournament={data.tournament} />
                {/* Результаты — у начатого турнира. До старта места «не
                    определены», а изменения рейтинга нулевые у всех: такие
                    таблицы выглядят поломкой, а не пустотой. */}
                {data.tournament.startedAt === null ? (
                  <>
                    <ParticipantsPanel
                      tournament={data.tournament}
                      registrations={registrations.data ?? []}
                    />
                    {/* Расстановка до старта видна организатору: после
                        старта менять её уже нечем. */}
                    {isClubStaff(user, data.tournament.clubId) && (
                      <>
                        <DrawPreview
                          tournamentId={tournamentId}
                          stages={data.stages}
                          names={names}
                        />
                        <ResultsBracket stages={data.stages} names={names} />
                      </>
                    )}
                  </>
                ) : isClubStaff(user, data.tournament.clubId) &&
                  data.tournament.finishedAt === null ? (
                  // Организатору состав нужен под рукой посреди турнира —
                  // снять участника, принять заявку, — а не во вкладке.
                  // После завершения менять в нём нечего: он уходит во
                  // вкладку, как у всех, и не заслоняет итоги.
                  <>
                    <ParticipantsPanel
                      tournament={data.tournament}
                      registrations={registrations.data ?? []}
                    />
                    <ResultTabs data={data} names={names} participants={null} />
                  </>
                ) : (
                  <ResultTabs
                    data={data}
                    names={names}
                    participants={
                      <ParticipantsPanel
                        tournament={data.tournament}
                        registrations={registrations.data ?? []}
                      />
                    }
                  />
                )}
              </>
            )}
          </QueryState>
        )}
      </Box>
    </Container>
  );
}

interface ResultTabsProps {
  readonly data: TournamentResultsView;
  readonly names: ReadonlyMap<string, string>;
  /** Состав во вкладке; `null` — состав показан над вкладками. */
  readonly participants: ReactNode;
}

/**
 * Результаты начатого турнира — по вкладкам, а не одной лентой.
 *
 * Вкладка живёт в адресе: «смотри сетку» пересылают ссылкой. Недоступная
 * вкладка из старой ссылки (у олимпийки нет групп) открывает первую.
 */
function ResultTabs({ data, names, participants }: ResultTabsProps): ReactNode {
  const t = useT();
  const id = useId();
  const strip = useRef<HTMLDivElement>(null);
  const navigate = Route.useNavigate();
  const { tab: requested } = Route.useSearch();

  const tabs = availableResultTabs(data, { withPlayers: participants !== null });
  const first = tabs[0] ?? 'places';
  const current: ResultTab =
    requested !== undefined && tabs.includes(requested) ? requested : first;

  const select = (tab: ResultTab): void => {
    void navigate({
      // Первая вкладка — умолчание и в адрес не пишется (common/search.ts).
      search: (prev) => ({ ...prev, tab: tab === first ? undefined : tab }),
      replace: true,
      resetScroll: false,
    });
  };

  // Ссылка «?tab=ratings» на телефоне: вкладка за краем полосы. Tabs
  // докручивают к ней при монтировании, но до того, как приехал шрифт, — после
  // подмены ширины вкладок выбранная снова оказывается за краем.
  useEffect(() => {
    let cancelled = false;

    // Без FontFaceSet (jsdom, старые WebView) шрифт ждать нечем.
    const fontsReady = 'fonts' in document ? document.fonts.ready : Promise.resolve();

    void fontsReady.then(() => {
      const scroller = strip.current?.querySelector<HTMLElement>('.MuiTabs-scroller');
      const selected = strip.current?.querySelector<HTMLElement>(
        '[role="tab"][aria-selected="true"]',
      );

      if (cancelled || scroller == null || selected == null) {
        return;
      }

      const left = selected.offsetLeft - (scroller.clientWidth - selected.offsetWidth) / 2;
      scroller.scrollLeft = Math.max(0, left);
    });

    return () => {
      cancelled = true;
    };
  }, [current]);

  return (
    <Box ref={strip} sx={{ mt: 5 }}>
      <Tabs
        value={current}
        onChange={(_, tab: ResultTab) => {
          select(tab);
        }}
        aria-label={t('results.tabs.label')}
        variant="scrollable"
        // На телефоне шесть вкладок не помещаются: стрелка показывает, что
        // справа есть ещё, иначе «Рейтинг» и «Участники» никто не найдёт.
        scrollButtons="auto"
        allowScrollButtonsMobile
      >
        {tabs.map((tab) => (
          <Tab
            key={tab}
            value={tab}
            label={t(RESULT_TAB_LABELS[tab])}
            id={`${id}-tab-${tab}`}
            aria-controls={`${id}-panel`}
            sx={{ px: { xs: 1.5, sm: 2 } }}
          />
        ))}
      </Tabs>
      <Box
        key={current}
        className="tab-panel-in"
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-tab-${current}`}
        // Секции рассчитаны на ленту и несут свой отступ сверху; под
        // вкладками он лишний.
        sx={{ '& > :first-of-type': { mt: 3 } }}
      >
        {current === 'places' && (
          <ResultsPlacements
            participants={data.participants}
            shared={data.shared}
            unresolved={data.unresolved}
            names={names}
          />
        )}
        {current === 'groups' && <ResultsStandings standings={data.standings} names={names} />}
        {current === 'bracket' && <ResultsBracket stages={data.stages} names={names} />}
        {current === 'matches' && <ResultsMatches stages={data.stages} names={names} />}
        {current === 'ratings' && <ResultsRatings ratings={data.ratings} names={names} />}
        {current === 'players' && participants}
      </Box>
    </Box>
  );
}
