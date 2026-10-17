import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CardActionArea from '@mui/material/CardActionArea';
import Container from '@mui/material/Container';
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

export const Route = createFileRoute('/_app/cabinet/clubs/')({
  component: MyClubsPage,
});

/**
 * Мои клубы — вход в рабочее место организатора.
 *
 * Отсюда клуб заводится и открывается на управление: турниры клуба по
 * стадиям, данные клуба и состав. Судья видит клуб в списке, но ведёт его на
 * публичную страницу: управлять клубом его роль не даёт (ADR-014).
 */
function MyClubsPage(): ReactNode {
  const t = useT();
  const user = useSessionStore((state) => state.user);
  const clubs = useQuery(clubDirectoryQuery);
  const roles = user?.clubRoles ?? [];

  return (
    <Container maxWidth="md" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <Stack
        direction="row"
        useFlexGap
        spacing={2}
        sx={{ flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between' }}
      >
        <Typography variant="h1">{t('nav.myClubs')}</Typography>
        {roles.length > 0 && (
          <Button variant="contained" href="/cabinet/clubs/new">
            {t('club.create')}
          </Button>
        )}
      </Stack>

      <Box sx={{ mt: 3 }}>
        {roles.length === 0 ? (
          <EmptyState
            title={t('myClubs.empty.title')}
            text={t('myClubs.empty.text')}
            action={
              <Button variant="contained" href="/cabinet/clubs/new">
                {t('club.create')}
              </Button>
            }
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
                          {club?.city}
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
    </Container>
  );
}
