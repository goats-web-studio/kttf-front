import { isAppError } from '@kttf/shared/errors';
import { ARCHIVE_PERSONAL_DATA_DAYS, type AdminAccountRequestView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useId, useState, type ReactNode } from 'react';
import { z } from 'zod';

import { errorMessageKey } from '@/common/api';
import { fill, formatDateTime, useLocale, useT, type MessageKey } from '@/common/i18n';
import EmptyState from '@/common/ui/empty-state';
import PageHeader from '@/common/ui/page-header';
import PillTabs from '@/common/ui/pill-tabs';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { approveAccountRequest, rejectAccountRequest } from '@/features/account/api';
import { accountRequestKeys, adminAccountRequestsQuery } from '@/features/account/queries';
import { useSessionStore } from '@/features/auth/session-store';
import { TextDialog } from '@/features/duels/duel-actions';

/** Вид — в адресе: ссылку «все заявки» можно открыть заново. */
const searchSchema = z.object({
  view: z.enum(['pending', 'all']).optional().catch(undefined),
});

export const Route = createFileRoute('/_app/admin/accounts')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: AccountRequestsPage,
});

const STATUS_KEYS: Readonly<Record<AdminAccountRequestView['status'], MessageKey>> = {
  PENDING: 'admin.accounts.status.PENDING',
  APPROVED: 'admin.accounts.status.APPROVED',
  REJECTED: 'admin.accounts.status.REJECTED',
  CANCELLED: 'admin.accounts.status.CANCELLED',
};

const BLOCKED_KEYS: Readonly<Record<string, MessageKey>> = {
  LAST_CLUB_OWNER: 'admin.accounts.blocked.LAST_CLUB_OWNER',
  LAST_ADMIN: 'admin.accounts.blocked.LAST_ADMIN',
};

/**
 * Заявки по аккаунтам — ADR-095, только администратор.
 *
 * Удалить себя человек не может — просит здесь. Вернувшийся с тем же
 * номером просит вернуть историю: номер без SMS не подтверждён, поэтому
 * сверить имя с архивным профилем может только человек. Права проверяет
 * сервер (ТС 8.3); страница лишь не показывает чужое.
 */
function AccountRequestsPage(): ReactNode {
  const t = useT();
  const navigate = Route.useNavigate();
  const view = Route.useSearch().view ?? 'pending';
  const admin = useSessionStore((state) => state.user?.isAdmin ?? false);
  const list = useQuery({
    ...adminAccountRequestsQuery(view === 'pending' ? 'PENDING' : undefined),
    enabled: admin,
  });

  if (!admin) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 5, sm: 6 } }}>
        <EmptyState title={t('error.api.FORBIDDEN')} />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <PageHeader
        back={{ href: '/admin', label: t('admin.nav.overview') }}
        title={t('admin.nav.accounts')}
        subtitle={fill(t('admin.accounts.lead'), { days: String(ARCHIVE_PERSONAL_DATA_DAYS) })}
      />

      <PillTabs
        label={t('admin.accounts.filter')}
        value={view}
        options={[
          ['pending', 'admin.accounts.view.pending'],
          ['all', 'admin.accounts.view.all'],
        ]}
        onChange={(next) => {
          void navigate({ search: { view: next === 'pending' ? undefined : next } });
        }}
      />

      <Box key={view} className="tab-panel-in" sx={{ mt: 3 }}>
        <QueryState
          isPending={list.isPending}
          error={list.error}
          onRetry={() => void list.refetch()}
          loading={<RowsSkeleton rows={3} />}
        >
          {list.data?.length === 0 ? (
            <EmptyState title={t('admin.accounts.empty')} />
          ) : (
            <Stack
              component="ol"
              spacing={2}
              sx={{ m: 0, p: 0, listStyle: 'none' }}
              data-account-requests
            >
              {list.data?.map((item) => (
                <RequestCard key={item.id} item={item} />
              ))}
            </Stack>
          )}
        </QueryState>
      </Box>
    </Container>
  );
}

/**
 * Заявка карточкой: вид и дата — заголовком, ниже аккаунт, профиль игрока
 * с тем, что поможет его узнать (год рождения, рейтинг, турниры), и слова
 * самого человека. Ждущая — с красной чертой слева и двумя действиями.
 */
function RequestCard({ item }: { readonly item: AdminAccountRequestView }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const pending = item.status === 'PENDING';
  const [dialog, setDialog] = useState<'approve' | 'reject' | null>(null);
  const queryClient = useQueryClient();
  const refresh = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: accountRequestKeys.all });

  return (
    <Paper
      component="li"
      variant="outlined"
      data-account-request={item.id}
      sx={{
        p: { xs: 2, sm: 3 },
        // Ждущая заявка — красная черта слева, как новая заявка клуба:
        // одна яркая деталь, статус при этом написан словом.
        borderLeft: pending ? '4px solid var(--red-600)' : undefined,
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'baseline' } }}
      >
        <Typography variant="h3" component="h2">
          {t(item.kind === 'DELETE' ? 'admin.accounts.kind.DELETE' : 'admin.accounts.kind.RESTORE')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {t(STATUS_KEYS[item.status])} · {formatDateTime(item.createdAt, locale)}
        </Typography>
      </Stack>

      <Box
        component="dl"
        sx={{
          mt: 2,
          mb: 0,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'max-content 1fr' },
          columnGap: 3,
          rowGap: { xs: 0.25, sm: 1 },
          '& dt': { color: 'text.secondary', typography: 'body2', mt: { xs: 1, sm: 0 } },
          '& dd': { m: 0, typography: 'body1', overflowWrap: 'anywhere', whiteSpace: 'pre-line' },
        }}
      >
        <Field
          label={t('admin.accounts.field.account')}
          value={
            item.user === null
              ? t('admin.accounts.noAccount')
              : [item.user.login, item.user.phone].filter((part) => part !== null).join(' · ')
          }
        />
        <Field
          label={t('admin.accounts.field.player')}
          value={item.player === null ? t('admin.accounts.noPlayer') : <PlayerLine item={item} />}
        />
        {item.kind === 'RESTORE' && (
          <Field label={t('admin.accounts.field.claimed')} value={item.claimedName} />
        )}
        <Field
          label={t(
            item.kind === 'DELETE' ? 'admin.accounts.field.reason' : 'admin.accounts.field.comment',
          )}
          value={item.reason}
        />
        {item.answer !== null && <Field label={t('account.request.answer')} value={item.answer} />}
      </Box>

      {pending ? (
        <Box sx={{ mt: 2.5, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Button
            variant="outlined"
            color={item.kind === 'DELETE' ? 'error' : 'primary'}
            onClick={() => {
              setDialog('approve');
            }}
            sx={{ minHeight: 44 }}
          >
            {t('admin.accounts.approve')}
          </Button>
          <Button
            variant="text"
            onClick={() => {
              setDialog('reject');
            }}
            sx={{ minHeight: 44 }}
          >
            {t('admin.accounts.reject')}
          </Button>
        </Box>
      ) : (
        item.decidedAt !== null && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {fill(t('admin.accounts.decided'), { date: formatDateTime(item.decidedAt, locale) })}
          </Typography>
        )
      )}

      <ApproveDialog
        open={dialog === 'approve'}
        item={item}
        onClose={() => {
          setDialog(null);
        }}
        onDone={refresh}
      />
      <TextDialog
        open={dialog === 'reject'}
        title={t('admin.accounts.reject.title')}
        hint={t('admin.accounts.reject.hint')}
        label={t('admin.accounts.reject.answer')}
        submitLabel={t('admin.accounts.reject')}
        required
        maxLength={500}
        onClose={() => {
          setDialog(null);
        }}
        onSubmit={async (answer) => {
          await rejectAccountRequest(item.id, { answer });
          await refresh();
        }}
        errorText={(error) => t(errorMessageKey(error))}
      />
    </Paper>
  );
}

/** Профиль игрока — то, по чему его узнают: имя, год рождения, рейтинг, турниры. */
function PlayerLine({ item }: { readonly item: AdminAccountRequestView }): ReactNode {
  const t = useT();
  const player = item.player;

  if (player === null) return null;

  const name = `${player.lastName} ${player.firstName}`.trim();

  return (
    <>
      {name === '' ? (
        t('player.deleted')
      ) : (
        <a href={`/players/${player.id}`} target="_blank" rel="noreferrer">
          {name}
        </a>
      )}
      <Typography component="span" variant="body2" color="text.secondary" sx={{ display: 'block' }}>
        {fill(t('admin.accounts.playerLine'), {
          birthYear: String(player.birthYear),
          rating: player.rating,
          count: String(player.tournaments),
        })}
      </Typography>
    </>
  );
}

/**
 * Подтверждение одобрения. Для удаления — прямо, что аккаунт закроется
 * сразу: решение не отменить, вернуть историю человек сможет только новой
 * заявкой на восстановление.
 */
function ApproveDialog({
  open,
  item,
  onClose,
  onDone,
}: {
  readonly open: boolean;
  readonly item: AdminAccountRequestView;
  readonly onClose: () => void;
  readonly onDone: () => Promise<void>;
}): ReactNode {
  const t = useT();
  const titleId = useId();
  const approve = useMutation({
    mutationFn: () => approveAccountRequest(item.id),
    onSuccess: async () => {
      onClose();
      await onDone();
    },
  });
  const close = (): void => {
    approve.reset();
    onClose();
  };
  const deletion = item.kind === 'DELETE';

  return (
    <Dialog open={open} onClose={close} aria-labelledby={titleId} fullWidth maxWidth="xs">
      <DialogTitle id={titleId}>
        {t(
          deletion ? 'admin.accounts.approve.DELETE.title' : 'admin.accounts.approve.RESTORE.title',
        )}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          {deletion
            ? fill(t('admin.accounts.approve.DELETE.text'), {
                days: String(ARCHIVE_PERSONAL_DATA_DAYS),
              })
            : t('admin.accounts.approve.RESTORE.text')}
        </DialogContentText>
        {approve.error !== null && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {t(failureKey(approve.error))}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, flexWrap: 'wrap', gap: 1 }}>
        <Button variant="text" autoFocus onClick={close} sx={{ minHeight: 44 }}>
          {t('account.delete.cancel')}
        </Button>
        <Button
          variant="contained"
          color={deletion ? 'error' : 'primary'}
          disabled={approve.isPending}
          onClick={() => {
            approve.mutate();
          }}
          sx={{ minHeight: 44 }}
        >
          {t('admin.accounts.approve')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Строка «подпись — значение»; пустое необязательное поле не показывается. */
function Field({ label, value }: { readonly label: string; readonly value: ReactNode }): ReactNode {
  if (value === null || value === '') {
    return null;
  }

  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

/** Отказ «пока нельзя» при одобрении удаления — со своей причиной. */
function failureKey(error: Error): MessageKey {
  if (isAppError(error) && error.code === 'ACCOUNT_DELETE_BLOCKED') {
    const reason = error.details?.reason;
    const key = typeof reason === 'string' ? BLOCKED_KEYS[reason] : undefined;

    if (key !== undefined) return key;
  }

  return errorMessageKey(error);
}
