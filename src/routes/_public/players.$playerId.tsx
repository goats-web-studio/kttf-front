import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Building2, Cake, MapPin, type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { z } from 'zod';

import { isMissingResource } from '@/common/api';
import { useT } from '@/common/i18n';
import PlayerAvatar from '@/common/ui/player-avatar';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { clubDirectoryQuery } from '@/features/clubs/queries';
import { usePlaceName } from '@/features/places/place-name';
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
 *
 * **Отказ у страницы один на всех.** Три запроса на неверную ссылку падают
 * втроём, и три одинаковых сообщения — это одна причина, названная трижды.
 * Секции ниже карточки рисуются только тогда, когда игрок нашёлся.
 */
function PlayerPage(): ReactNode {
  const t = useT();
  const placeName = usePlaceName();
  // Параметр типизирован деревом маршрутов: опечатка в имени не соберётся.
  const { playerId } = Route.useParams();

  // Обрезанная ссылка — самый частый способ сюда попасть, и по ней сервер
  // ответит отказом проверки схемы. Спрашивать его об этом незачем: форма
  // идентификатора известна и здесь.
  const isKnownId = z.uuid().safeParse(playerId).success;

  const player = useQuery({ ...playerQuery(playerId), enabled: isKnownId });
  const history = useQuery({ ...playerRatingHistoryQuery(playerId), enabled: isKnownId });
  const clubs = useQuery(clubDirectoryQuery);

  const [opponentId, setOpponentId] = useState<string | null>(null);

  if (!isKnownId || isMissingResource(player.error)) {
    return (
      <Container maxWidth="md" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
        <Typography role="alert" color="text.secondary" sx={{ py: 5, textAlign: 'center' }}>
          {t('player.notFound')}
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <QueryState
        isPending={player.isPending}
        error={player.error}
        onRetry={() => void player.refetch()}
        loading={<HeaderSkeleton />}
      >
        {player.data === undefined ? null : (
          <Paper
            variant="outlined"
            component="header"
            sx={{
              p: { xs: 2.5, sm: 4 },
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { sm: 'center' },
              gap: { xs: 2.5, sm: 4 },
              backgroundImage:
                'radial-gradient(circle at 100% 0%, var(--red-50) 0, transparent 38%)',
            }}
          >
            <Stack
              direction="row"
              spacing={2.5}
              sx={{ alignItems: 'center', flex: 1, minWidth: 0 }}
            >
              <PlayerAvatar
                lastName={player.data.lastName}
                firstName={player.data.firstName}
                photoUrl={player.data.photoUrl}
                size="xl"
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="h1"
                  sx={{ fontSize: { xs: 28, sm: 36 }, lineHeight: { xs: '32px', sm: '40px' } }}
                >
                  {playerName(player.data)}
                </Typography>
                <Stack
                  direction="row"
                  useFlexGap
                  spacing={2}
                  sx={{ mt: 1, flexWrap: 'wrap', color: 'text.secondary', typography: 'body2' }}
                >
                  <Meta icon={MapPin}>{placeName(player.data.city)}</Meta>
                  {player.data.clubId !== null && (
                    <Meta icon={Building2}>{clubs.data?.get(player.data.clubId)?.name ?? ''}</Meta>
                  )}
                  <Meta icon={Cake}>{String(player.data.birthYear)}</Meta>
                </Stack>
              </Box>
            </Stack>

            {/* Рейтинг — главное число профиля, дисплейный набор 44px
                (07-design-system.md, 3.5). Ради него страницу и открывают. */}
            <Box
              sx={{
                flexShrink: 0,
                px: 3,
                py: 2,
                borderRadius: 4,
                bgcolor: 'var(--paper-sunken)',
                textAlign: { sm: 'right' },
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                {t('ratings.column.rating')}
              </Typography>
              <Typography
                variant="h1"
                component="p"
                sx={{ fontSize: 48, lineHeight: '48px', fontVariantNumeric: 'tabular-nums' }}
              >
                {player.data.rating}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {t('player.rating.matches')}{' '}
                <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                  {player.data.ratedMatches}
                </Box>
                {player.data.isProvisional && (
                  // Провизорный рейтинг двигается быстрее: сыграно меньше
                  // двадцати рейтинговых встреч (ТЗ 7.1).
                  <> · {t('ratings.provisional')}</>
                )}
              </Typography>
            </Box>
          </Paper>
        )}
      </QueryState>

      {/* Пока игрок не пришёл, ниже рисовать нечего: и ожидание, и отказ
          назывались бы по разу на каждую секцию. */}
      {player.data !== undefined && (
        <>
          <QueryState
            isPending={history.isPending}
            error={history.error}
            onRetry={() => void history.refetch()}
            loading={<RowsSkeleton />}
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
        </>
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

/** Факт о человеке с иконкой: город, клуб, год рождения. */
function Meta({
  icon: Icon,
  children,
}: {
  readonly icon: LucideIcon;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
      <Icon size={15} aria-hidden />
      {children}
    </Box>
  );
}
