import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { PlayerStatsPeriod } from '@kttf/shared/types';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState, type ReactNode } from 'react';
import { z } from 'zod';

import { isMissingResource } from '@/common/api';
import { useT } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { clubDirectoryQuery } from '@/features/clubs/queries';
import PlayerForumPosts from '@/features/forum/player-posts';
import { usePlaceName } from '@/features/places/place-name';
import { useSessionStore } from '@/features/auth/session-store';
import BestWins from '@/features/players/best-wins';
import HeadToHead from '@/features/players/head-to-head';
import PlayerResults from '@/features/players/player-results';
import { playerName } from '@/features/players/player-name';
import PlayerSummary from '@/features/players/player-summary';
import ProfileFacts from '@/features/players/profile-facts';
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
 * Публичный профиль игрока — ТЗ 9.3, содержание RTTF (ADR-048), раскладка
 * своя (ADR-060).
 *
 * Сначала — кто он: шапка-визитка с плашкой рейтинга и «Формой», под ней
 * три карточки — чем играет, достижения, об игроке. Потом — «История игры»:
 * кривая рейтинга, статистика за период, лучшие победы и результаты по
 * турнирам, свёрнутые до итога (ADR-048, ADR-050).
 *
 * Открыт без входа: результаты турниров — спортивный факт, а не персональные
 * данные. Свой профиль отличается только кнопками правки и кабинета: «Мой
 * профиль» в шапке ведёт сюда, а не в кабинет — себя смотрят так же, как
 * других.
 *
 * Запросы раздельные: карточка нужна раньше всех, кривая приходит целиком,
 * сводка и лучшие победы зависят каждая от своего периода, а результаты
 * подгружаются. Сложенные в один
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
  // Место, максимум, медали и первый турнир — за всё время, от периода
  // статистики не зависят. При периоде «Всё время» это тот же запрос.
  const overall = useQuery({ ...playerSummaryQuery(playerId, 'ALL'), enabled: isKnownId });
  const clubs = useQuery(clubDirectoryQuery);

  const [opponentId, setOpponentId] = useState<string | null>(null);
  const isOwn = user?.playerId === playerId;
  const viewerId = user?.playerId ?? null;

  useEffect(() => {
    // Личный счёт открыли из шапки или из результатов — показать его.
    // Переход без плавной прокрутки: движение здесь ничего не объясняет.
    if (opponentId === null) return;
    document.getElementById(HEAD_TO_HEAD_ID)?.scrollIntoView({ block: 'start' });
  }, [opponentId]);

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
            club={clubOf(player.data.clubId, clubs.data)}
            summary={overall.data}
            isOwn={isOwn}
            onCompare={
              viewerId === null || isOwn
                ? undefined
                : () => {
                    setOpponentId(viewerId);
                  }
            }
          />
        )}
      </QueryState>

      {player.data !== undefined && (
        <Box sx={{ mt: 2 }}>
          <ProfileFacts player={player.data} summary={overall.data} />
        </Box>
      )}

      {player.data !== undefined && (
        <Stack spacing={3} sx={{ mt: { xs: 5, md: 6 } }}>
          <Typography variant="h2">{t('profile.history.title')}</Typography>
          <QueryState
            isPending={history.isPending}
            error={history.error}
            onRetry={() => void history.refetch()}
            loading={<RowsSkeleton />}
          >
            {history.data === undefined ? null : (
              <RatingSection
                history={history.data}
                // Максимум — за всё время, от периода сводки не зависит.
                peak={
                  overall.data === undefined
                    ? null
                    : { rating: overall.data.maxRating, at: overall.data.maxRatingAt }
                }
              />
            )}
          </QueryState>

          <PlayerSummary summary={summary} period={period} onPeriod={setPeriod} />
          <BestWins playerId={playerId} />

          {/* Личный счёт — над результатами: это ответ на только что
              заданный вопрос, внизу страницы его пришлось бы искать. */}
          {opponentId !== null && (
            <Box id={HEAD_TO_HEAD_ID} sx={{ scrollMarginTop: 80 }}>
              <HeadToHead
                playerId={playerId}
                opponentId={opponentId}
                onClose={() => {
                  setOpponentId(null);
                }}
              />
            </Box>
          )}

          <PlayerResults
            playerId={playerId}
            playerLabel={isOwn ? t('profile.results.me') : playerName(player.data)}
            onSelectOpponent={setOpponentId}
          />
        </Stack>
      )}

      {/* Сообщения на форуме — после истории игры (ADR-064, F2). */}
      {player.data !== undefined && <PlayerForumPosts playerId={playerId} />}
    </Container>
  );
}

const HEAD_TO_HEAD_ID = 'head-to-head';

/** Клуб игрока ссылкой — имя из справочника клубов, пока он не пришёл — без клуба. */
function clubOf(
  clubId: string | null,
  directory: ReadonlyMap<string, { readonly name: string }> | undefined,
): { readonly id: string; readonly name: string } | null {
  const name = clubId === null ? undefined : directory?.get(clubId)?.name;

  return clubId === null || name === undefined ? null : { id: clubId, name };
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
