import type { ClubMemberView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { fill, useT } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { reloadUser } from '@/features/auth/session';
import { useSessionStore } from '@/features/auth/session-store';

import AddMemberForm from './add-member-form';
import { removeClubMember } from './api';
import MemberName from './member-name';
import { clubKeys, clubMembersQuery } from './queries';
import RoleName from './role-name';

/**
 * Состав клуба — ТЗ 3.2, «состав организаторов с ролями».
 *
 * Состав ведёт владелец (ТЗ 1): только у него есть добавление и «Убрать».
 * Последнего владельца сервер убрать не даст — клуб без владельца некому
 * передать.
 */
export default function StaffPanel({ clubId }: { readonly clubId: string }): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const user = useSessionStore((state) => state.user);
  const members = useQuery(clubMembersQuery(clubId));
  const [removing, setRemoving] = useState<ClubMemberView | null>(null);

  const isOwner =
    user?.clubRoles.some((role) => role.clubId === clubId && role.role === 'OWNER') === true;
  const owners = (members.data ?? []).filter((member) => member.role === 'OWNER').length;

  const remove = useMutation({
    mutationFn: (member: ClubMemberView) => removeClubMember(clubId, member.userId),
    onSuccess: async (_, member) => {
      setRemoving(null);
      await queryClient.invalidateQueries({ queryKey: clubKeys.members(clubId) });
      // Убравший себя теряет права на клуб: сессия обязана это узнать сразу.
      if (member.userId === user?.id) {
        await reloadUser();
      }
    },
  });

  return (
    <Box component="section" sx={{ mt: 6 }}>
      <Typography variant="h2">{t('club.staff.title')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {t('club.staff.lead')}
      </Typography>

      <Box sx={{ mt: 2 }}>
        <QueryState
          isPending={members.isPending}
          error={members.error}
          onRetry={() => void members.refetch()}
          loading={<RowsSkeleton rows={2} />}
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
            {(members.data ?? []).map((member) => (
              <Stack
                component="li"
                key={member.userId}
                direction="row"
                spacing={2}
                sx={{
                  alignItems: 'center',
                  minHeight: 56,
                  px: 1.5,
                  borderBottom: 1,
                  borderColor: 'divider',
                }}
              >
                <Typography sx={{ flex: 1, minWidth: 0 }}>
                  <MemberName member={member} />
                  {member.userId === user?.id && (
                    <Typography component="span" color="text.secondary">
                      {' '}
                      {t('club.staff.you')}
                    </Typography>
                  )}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <RoleName role={member.role} />
                </Typography>
                {/* Единственного владельца сервер убрать не даст, а его отказ —
                    общее «нет прав», которое здесь только запутает. */}
                {isOwner && !(member.role === 'OWNER' && owners <= 1) && (
                  <Button
                    variant="text"
                    color="error"
                    sx={{ minHeight: 44 }}
                    onClick={() => {
                      remove.reset();
                      setRemoving(member);
                    }}
                  >
                    {t('club.staff.remove')}
                  </Button>
                )}
              </Stack>
            ))}
          </Box>
        </QueryState>
      </Box>

      {isOwner && <AddMemberForm clubId={clubId} />}

      <Dialog
        open={removing !== null}
        onClose={() => {
          setRemoving(null);
        }}
        aria-labelledby="remove-member-title"
      >
        <DialogTitle id="remove-member-title">
          {fill(t('club.staff.removeConfirm'), {
            name: removing?.name ?? t('club.staff.noProfile'),
          })}
        </DialogTitle>
        {remove.error !== null && (
          <DialogContent>
            <Alert severity="error">{t(errorMessageKey(remove.error))}</Alert>
          </DialogContent>
        )}
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="text"
            autoFocus
            onClick={() => {
              setRemoving(null);
            }}
          >
            {t('club.staff.removeNo')}
          </Button>
          <Button
            variant="outlined"
            color="error"
            disabled={remove.isPending}
            onClick={() => {
              if (removing !== null) {
                remove.mutate(removing);
              }
            }}
          >
            {t('club.staff.removeYes')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
