import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CardActionArea from '@mui/material/CardActionArea';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import EmptyState from '@/common/ui/empty-state';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { useSessionStore } from '@/features/auth/session-store';
import ClubMark from '@/features/clubs/club-mark';
import { clubDirectoryQuery } from '@/features/clubs/queries';
import RoleName from '@/features/clubs/role-name';
import { usePlaceName } from '@/features/places/place-name';

export const Route = createFileRoute('/_app/cabinet/clubs/')({
  component: MyClubsPage,
});

/**
 * Мои клубы — вход в рабочее место организатора.
 *
 * Отсюда клуб открывается на управление: турниры клуба по стадиям, данные
 * клуба и состав. Новый клуб заводит администратор платформы из заявки
 * (ADR-049), ему здесь — ссылка на заявки; остальным — «Подать заявку на клуб», ведущая на форму
 * «Напишите нам». У кого клуб уже есть, под списком объяснено, что второй
 * клуб или филиал — тоже новой заявкой. Судья видит клуб в списке, но ведёт его на
 * публичную страницу: управлять клубом его роль не даёт (ADR-014).
 */
function MyClubsPage(): ReactNode {
  const t = useT();
  const placeName = usePlaceName();
  const user = useSessionStore((state) => state.user);
  const clubs = useQuery(clubDirectoryQuery);
  const roles = user?.clubRoles ?? [];
  const isAdmin = user?.isAdmin === true;
  // Клуб заводится только из заявки (ADR-049): администратор — разбирая
  // заявки, остальные — подавая её.
  const newClub = (
    <Button variant="contained" href={isAdmin ? '/admin/applications' : '/feedback'}>
      {t(isAdmin ? 'page.applications.title' : 'clubs.apply')}
    </Button>
  );

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <Stack
        direction="row"
        useFlexGap
        spacing={2}
        sx={{ flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between' }}
      >
        <Typography variant="h1">{t('nav.myClubs')}</Typography>
        {roles.length > 0 && isAdmin && newClub}
      </Stack>

      <Box sx={{ mt: 3 }}>
        {roles.length === 0 ? (
          <EmptyState
            title={t('myClubs.empty.title')}
            text={t('myClubs.empty.text')}
            action={newClub}
          />
        ) : (
          <QueryState
            isPending={clubs.isPending}
            error={clubs.error}
            onRetry={() => void clubs.refetch()}
            loading={<RowsSkeleton rows={roles.length} />}
          >
            <Box
              component="ul"
              sx={{
                listStyle: 'none',
                m: 0,
                p: 0,
                borderTop: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              {roles.map((role) => {
                const club = clubs.data?.get(role.clubId);
                const titleId = `my-club-${role.clubId}`;

                return (
                  <Box
                    component="li"
                    key={`${role.clubId}-${role.role}`}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                  >
                    <CardActionArea
                      href={
                        role.role === 'REFEREE'
                          ? `/clubs/${role.clubId}`
                          : `/cabinet/club/${role.clubId}`
                      }
                      aria-labelledby={titleId}
                      sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2, px: 1.5 }}
                    >
                      <ClubMark club={club ?? { name: '?', logoUrl: null }} size={48} />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography id={titleId} variant="h3" component="h2">
                          {club?.name ?? role.clubId}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {club === undefined ? null : placeName(club.city)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
                        <RoleName role={role.role} />
                      </Typography>
                    </CardActionArea>
                  </Box>
                );
              })}
            </Box>
          </QueryState>
        )}
      </Box>

      {/* Второй клуб или филиал владелец не заводит сам — та же заявка,
          что и первый (ADR-049). */}
      {roles.length > 0 && !isAdmin && (
        <Paper
          variant="outlined"
          component="aside"
          aria-labelledby="my-clubs-more"
          sx={{ mt: 4, p: { xs: 3, sm: 4 } }}
        >
          <Typography id="my-clubs-more" variant="h3" component="h2">
            {t('myClubs.more.title')}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1, maxWidth: '68ch' }}>
            {t('myClubs.more.text')}
          </Typography>
          <Box sx={{ mt: 2 }}>{newClub}</Box>
        </Paper>
      )}
    </Container>
  );
}
