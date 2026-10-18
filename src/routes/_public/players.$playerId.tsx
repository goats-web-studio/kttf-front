import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { PlayerStatsPeriod } from '@kttf/shared/types';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';
import { z } from 'zod';

import { isMissingResource } from '@/common/api';
import { useT } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { clubDirectoryQuery } from '@/features/clubs/queries';
import { usePlaceName } from '@/features/places/place-name';
import { useSessionStore } from '@/features/auth/session-store';
import HeadToHead from '@/features/players/head-to-head';
import PlayerResults from '@/features/players/player-results';
import PlayerSummary from '@/features/players/player-summary';
import ProfileHeader from '@/features/players/profile-header';
import {
  playerQuery,
  playerRatingHistoryQuery,
  playerSummaryQuery,
} from '@/features/players/queries';
import RatingSection from '@/features/players/rating-section';

export const Route = createFileRoute('/_public/players/$playerId')({
  component: PlayerPage,
});

/**
 * Публичный профиль игрока — ТЗ 9.3, в структуре RTTF (ADR-048).
 *
 * Сверху вниз, как у RTTF: шапка с анкетой и рейтингом, кривая рейтинга,
 * общая статистика, лучшие победы, награды и результаты по турнирам. Дизайн
 * свой — карточки «Спорт-модерн».
 *
 * Открыт без входа: результаты турниров — спортивный факт, а не персональные
 * данные. Свой профиль отличается только кнопками правки и кабинета: «Мой
 * профиль» в шапке ведёт сюда, а не в кабинет — себя смотрят так же, как
 * других.
 *
 * Запросы раздельные: карточка нужна раньше всех, кривая приходит целиком,
 * сводка зависит от периода, а результаты подгружаются. Сложенные в один
 * ответ, они ждали бы самую медленную часть.
 *
 * **Отказ у страницы один на всех.** Секции ниже шапки рисуются только
 * тогда, когда игрок нашёлся, — иначе неверная ссылка падала бы пятью
 * одинаковыми сообщениями.
 */
function PlayerPage(): ReactNode {
  const t = useT();
  const placeName = usePlaceName();
  // Параметр типизирован деревом маршрутов: опечатка в имени не соберётся.
  const { playerId } = Route.useParams();
  const user = useSessionStore((state) => state.user);

  // Обрезанная ссылка — самый частый способ сюда попасть, и по ней сервер
  // ответит отказом проверки схемы. Спрашивать его об этом незачем: форма
  // идентификатора известна и здесь.
  const isKnownId = z.uuid().safeParse(playerId).success;

  const [period, setPeriod] = useState<PlayerStatsPeriod>('ALL');
  const player = useQuery({ ...playerQuery(playerId), enabled: isKnownId });
  const history = useQuery({ ...playerRatingHistoryQuery(playerId), enabled: isKnownId });
  const summary = useQuery({
    ...playerSummaryQuery(playerId, period),
    enabled: isKnownId,
    // Пока грузится другой период, видны прежние числа, а не скелетон.
    placeholderData: keepPreviousData,
  });
  const clubs = useQuery(clubDirectoryQuery);

  const [opponentId, setOpponentId] = useState<string | null>(null);

  if (!isKnownId || isMissingResource(player.error)) {
    return (
      <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
        <Typography role="alert" color="text.secondary" sx={{ py: 5, textAlign: 'center' }}>
          {t('player.notFound')}
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 4, sm: 6 } }}>
      <QueryState
        isPending={player.isPending}
        error={player.error}
        onRetry={() => void player.refetch()}
        loading={<HeaderSkeleton />}
      >
        {player.data === undefined ? null : (
          <ProfileHeader
            player={player.data}
            cityName={placeName(player.data.city)}
            clubName={
              player.data.clubId === null
                ? null
                : (clubs.data?.get(player.data.clubId)?.name ?? null)
            }
            // Максимум — за всё время и от периода не зависит: берётся из
            // любой пришедшей сводки.
            maxRating={summary.data?.maxRating ?? null}
            isOwn={user?.playerId === playerId}
          />
        )}
      </QueryState>

      {player.data !== undefined && (
        <Stack spacing={3} sx={{ mt: 3 }}>
          <QueryState
            isPending={history.isPending}
            error={history.error}
            onRetry={() => void history.refetch()}
            loading={<RowsSkeleton />}
          >
            {history.data === undefined ? null : <RatingSection history={history.data} />}
          </QueryState>

          <PlayerSummary
            summary={summary}
            period={period}
            onPeriod={setPeriod}
            onSelectOpponent={setOpponentId}
          />

          {/* Личный счёт — над результатами: это ответ на только что
              заданный вопрос, внизу страницы его пришлось бы искать. */}
          {opponentId !== null && (
            <HeadToHead
              playerId={playerId}
              opponentId={opponentId}
              onClose={() => {
                setOpponentId(null);
              }}
            />
          )}

          <PlayerResults playerId={playerId} onSelectOpponent={setOpponentId} />
        </Stack>
      )}
    </Container>
  );
}

/** Шапка профиля на время загрузки: имя, строка о человеке, рейтинг. */
function HeaderSkeleton(): ReactNode {
  const t = useT();

  return (
    <Box role="status" aria-label={t('common.loading')}>
      <Skeleton variant="text" width="60%" sx={{ fontSize: 30 }} />
      <Skeleton variant="text" width="40%" />
      <Skeleton variant="rounded" width={120} height={44} sx={{ mt: 2 }} />
    </Box>
  );
}
