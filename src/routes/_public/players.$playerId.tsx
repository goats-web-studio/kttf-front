import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';

import { useT } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';
import { clubDirectoryQuery } from '@/features/clubs/queries';
import HeadToHead from '@/features/players/head-to-head';
import PlayerMatches from '@/features/players/player-matches';
import { playerName } from '@/features/players/player-name';
import PlayerRating from '@/features/players/player-rating';
import { playerQuery, playerRatingHistoryQuery } from '@/features/players/queries';

export const Route = createFileRoute('/_public/players/$playerId')({
  component: PlayerPage,
});

/**
 * Публичный профиль игрока — ТЗ 9.3.
 *
 * Открыт без входа: результаты турниров — спортивный факт, а не персональные
 * данные. Телефона и аккаунта на странице поэтому нет, только то, что игрок
 * показывает соперникам сам.
 *
 * Данные берутся тремя запросами, а не одним: карточка, кривая рейтинга и
 * история встреч живут по-разному. Встречи листаются постранично, кривая
 * приходит целиком, а карточка нужна раньше обеих — сложенные в один ответ,
 * они заставили бы ждать самую медленную часть.
 *
 * Блока статистики (винрейт, средний счёт, любимый соперник, серии), который
 * требует ТЗ 9.3, здесь нет: в контракте ТС 7.2 его нет ни одним полем, а
 * посчитать по видимой странице истории — значит показать число, меняющееся
 * от перелистывания. Расхождение записано открытым вопросом ОВ-19.
 */
function PlayerPage(): ReactNode {
  const t = useT();
  // Параметр типизирован деревом маршрутов: опечатка в имени не соберётся.
  const { playerId } = Route.useParams();

  const player = useQuery(playerQuery(playerId));
  const history = useQuery(playerRatingHistoryQuery(playerId));
  const clubs = useQuery(clubDirectoryQuery);

  const [opponentId, setOpponentId] = useState<string | null>(null);

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <QueryState
        isPending={player.isPending}
        error={player.error}
        onRetry={() => void player.refetch()}
      >
        {player.data === undefined ? null : (
          <header>
            <h1 className="text-2xl font-semibold text-slate-900">{playerName(player.data)}</h1>
            <p className="mt-1 text-slate-600">
              {player.data.city}
              {player.data.clubId !== null &&
                ` · ${clubs.data?.get(player.data.clubId)?.name ?? ''}`}
              {` · ${String(player.data.birthYear)}`}
            </p>

            <p className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-semibold tabular-nums text-slate-900">
                {player.data.rating}
              </span>
              <span className="text-sm text-slate-500">
                {t('player.rating.matches')}{' '}
                <span className="tabular-nums">{player.data.ratedMatches}</span>
              </span>
              {player.data.isProvisional && (
                // Провизорный рейтинг двигается быстрее: сыграно меньше
                // двадцати рейтинговых встреч (ТЗ 7.1).
                <span className="text-sm text-slate-500">{t('ratings.provisional')}</span>
              )}
            </p>
          </header>
        )}
      </QueryState>

      <QueryState
        isPending={history.isPending}
        error={history.error}
        onRetry={() => void history.refetch()}
      >
        {history.data === undefined ? null : <PlayerRating history={history.data} />}
      </QueryState>

      {/* Личный счёт стоит над историей встреч, а не под ней: это ответ на
          только что заданный вопрос, и внизу страницы его пришлось бы искать. */}
      {opponentId !== null && (
        <HeadToHead
          playerId={playerId}
          opponentId={opponentId}
          onClose={() => {
            setOpponentId(null);
          }}
        />
      )}

      <PlayerMatches playerId={playerId} onSelectOpponent={setOpponentId} />
    </section>
  );
}
