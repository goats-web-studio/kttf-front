import type { AuthUserView } from '@kttf/shared/types';
import { MAX_PAGE_SIZE } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';

import { useT, type MessageKey } from '@/common/i18n';
import EmptyState from '@/common/ui/empty-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import Surface from '@/common/ui/surface';
import { groupClubTournaments, type ClubTournamentGroup } from '@/features/clubs/club-tournaments';
import { clubDirectoryQuery } from '@/features/clubs/queries';
import TournamentList from '@/features/clubs/tournament-list';
import { tournamentsQuery } from '@/features/tournaments/queries';

/** Группы на рабочем столе: то, что требует действия; отменённые — в клубе. */
const DESK_GROUPS: readonly (readonly [ClubTournamentGroup, MessageKey])[] = [
  ['running', 'manage.tournaments.running'],
  ['open', 'manage.tournaments.open'],
  ['draft', 'manage.tournaments.draft'],
  ['finished', 'cabinet.tournaments.recent'],
];

/** Завершённых — последние три: архив целиком живёт на странице клуба. */
const RECENT = 3;

/**
 * Рабочий стол организатора — ADR-048.
 *
 * Вопрос, с которым приходят: что в моих клубах сейчас и что делать
 * дальше. Поэтому сверху клубы с главным действием — создать турнир, —
 * ниже турниры всех клубов по стадиям: идущий с консолью, анонсы, черновики,
 * недавние. Полный список и настройки клуба — на странице управления.
 */
export default function ClubDesk({ user }: { readonly user: AuthUserView }): ReactNode {
  const t = useT();
  const directory = useQuery(clubDirectoryQuery);
  const clubIds = [...new Set(user.clubRoles.map((role) => role.clubId))];

  const lists = useQueries({
    queries: clubIds.map((clubId) => tournamentsQuery({ page: 1, limit: MAX_PAGE_SIZE, clubId })),
  });
  const pending = lists.some((list) => list.isPending);
  const all = lists.flatMap((list) => list.data?.items ?? []);
  const grouped = groupClubTournaments(all);
  const managing = user.clubRoles.filter((role) => role.role !== 'REFEREE');
  const managed = managing.length;
  const firstManaged = managing[0]?.clubId;

  return (
    <>
      {/* Клубы — в боковом меню каркаса (ADR-074); здесь их турниры и главное
          действие — создать турнир. Несколько клубов — выбор клуба в форме. */}
      <Surface
        title={t('cabinet.tournaments.title')}
        action={
          managed > 0 ? (
            <Button
              variant="contained"
              href={
                managed === 1 && firstManaged !== undefined
                  ? `/tournaments/new?club=${firstManaged}`
                  : '/tournaments/new'
              }
              startIcon={<Plus size={16} aria-hidden />}
            >
              {t('tournament.form.create')}
            </Button>
          ) : undefined
        }
      >
        {pending ? (
          <RowsSkeleton rows={3} />
        ) : all.length === 0 ? (
          <EmptyState title={t('manage.tournaments.empty.title')} />
        ) : (
          <Stack spacing={3}>
            {DESK_GROUPS.map(([group, title]) => {
              const rows =
                group === 'finished' ? grouped.finished.slice(0, RECENT) : grouped[group];

              return rows.length === 0 ? null : (
                <Box key={group}>
                  <Typography variant="h3" sx={{ mb: 1 }}>
                    {t(title)}
                  </Typography>
                  <TournamentList
                    tournaments={rows}
                    club={undefined}
                    clubOf={(tournament) => directory.data?.get(tournament.clubId)}
                    action={(tournament) =>
                      tournament.status === 'RUNNING' ? (
                        <Button href={`/console/${tournament.id}`}>{t('manage.console')}</Button>
                      ) : null
                    }
                  />
                </Box>
              );
            })}
          </Stack>
        )}
      </Surface>
    </>
  );
}
