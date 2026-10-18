import type { AuthUserView, ClubView, TournamentView } from '@kttf/shared/types';
import { MAX_PAGE_SIZE } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';

import { fill, useT, type MessageKey } from '@/common/i18n';
import EmptyState from '@/common/ui/empty-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import Surface from '@/common/ui/surface';
import { groupClubTournaments, type ClubTournamentGroup } from '@/features/clubs/club-tournaments';
import { clubDirectoryQuery } from '@/features/clubs/queries';
import RoleName from '@/features/clubs/role-name';
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
  const managed = user.clubRoles.filter((role) => role.role !== 'REFEREE').length;

  return (
    <>
      <Surface
        title={t('nav.myClubs')}
        action={<Button href="/cabinet/clubs">{t('cabinet.clubs.all')}</Button>}
      >
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
          }}
        >
          {user.clubRoles.map((role) => (
            <ClubTile
              key={`${role.clubId}-${role.role}`}
              // Главная кнопка на экране одна (07, 5.1): залитая «Создать
              // турнир» — только когда клуб, которым управляют, один.
              primary={managed === 1}
              club={directory.data?.get(role.clubId)}
              clubId={role.clubId}
              role={role.role}
              tournaments={all.filter((tournament) => tournament.clubId === role.clubId)}
            />
          ))}
        </Box>
      </Surface>

      <Surface title={t('cabinet.tournaments.title')}>
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

/**
 * Клуб плиткой: роль, что в нём происходит, и куда идти. Судья клубом не
 * управляет (ADR-014) — ему страница клуба, а не управление и не создание
 * турнира.
 */
function ClubTile({
  club,
  clubId,
  role,
  tournaments,
  primary,
}: {
  readonly primary: boolean;
  readonly club: ClubView | undefined;
  readonly clubId: string;
  readonly role: AuthUserView['clubRoles'][number]['role'];
  readonly tournaments: readonly TournamentView[];
}): ReactNode {
  const t = useT();
  const grouped = groupClubTournaments(tournaments);
  const manages = role !== 'REFEREE';

  const facts = [
    grouped.running.length > 0
      ? fill(t('cabinet.clubs.running'), { count: String(grouped.running.length) })
      : null,
    grouped.open.length > 0
      ? fill(t('cabinet.clubs.open'), { count: String(grouped.open.length) })
      : null,
    grouped.draft.length > 0
      ? fill(t('cabinet.clubs.drafts'), { count: String(grouped.draft.length) })
      : null,
  ].filter((fact): fact is string => fact !== null);

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, bgcolor: 'var(--paper-sunken)', boxShadow: 'none', borderColor: 'transparent' }}
    >
      <Typography variant="h3" component="p">
        {club?.name ?? clubId}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        <RoleName role={role} />
        {facts.length > 0 && ` · ${facts.join(' · ')}`}
      </Typography>
      <Stack direction="row" useFlexGap spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
        {manages ? (
          <>
            <Button
              variant={primary ? 'contained' : 'outlined'}
              href={`/tournaments/new?club=${clubId}`}
              startIcon={<Plus size={16} aria-hidden />}
            >
              {t('tournament.form.create')}
            </Button>
            <Button href={`/cabinet/club/${clubId}`}>{t('cabinet.clubs.manage')}</Button>
          </>
        ) : (
          <Button href={`/clubs/${clubId}`}>{t('manage.publicPage')}</Button>
        )}
      </Stack>
    </Paper>
  );
}
