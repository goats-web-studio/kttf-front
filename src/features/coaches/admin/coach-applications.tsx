import { COACH_STATUSES, type CoachApplicationView, type CoachStatus } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Pencil } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { fill, formatDateTime, useLocale, useT, type MessageKey } from '@/common/i18n';
import EmptyState from '@/common/ui/empty-state';
import Pagination from '@/common/ui/pagination';
import PillTabs from '@/common/ui/pill-tabs';
import PlayerAvatar from '@/common/ui/player-avatar';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { usePlaceName } from '@/features/places/place-name';

import { approveCoach, rejectCoach, setCoachHidden, verifyCoachCredential } from '../api';
import CredentialScan from '../credential-scan';
import { COACH_STATUS_KEYS, CREDENTIAL_KIND_KEYS, coachFullName, coachPhoto } from '../labels';
import { coachApplicationsQuery, coachKeys } from '../queries';
import CoachStatusPlate from '../status-plate';

const STATUS_OPTIONS = COACH_STATUSES.map(
  (status) => [status, COACH_STATUS_KEYS[status]] as const,
) satisfies readonly (readonly [CoachStatus, MessageKey])[];

/**
 * Заявки тренеров у администратора — ADR-059, `docs/11` 3.1.
 *
 * Заявка — это готовая страница: администратор смотрит её как есть
 * (ссылка открывает и неопубликованную), сверяет документы по сканам и
 * ставит «Проверено KTTF», затем одобряет или отклоняет с причиной.
 * Опубликованную можно скрыть с причиной — постмодерация.
 */
export default function CoachApplications({
  status,
  page,
  onStatus,
  onPage,
}: {
  readonly status: CoachStatus;
  readonly page: number;
  readonly onStatus: (status: CoachStatus) => void;
  readonly onPage: (page: number) => void;
}): ReactNode {
  const t = useT();
  const list = useQuery(coachApplicationsQuery(status, page));
  const pages =
    list.data === undefined ? 1 : Math.max(1, Math.ceil(list.data.total / list.data.limit));

  return (
    <Box>
      {/* Четыре статуса пилюлей в 360px не помещаются: на телефоне — список. */}
      <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
        <PillTabs
          value={status}
          options={STATUS_OPTIONS}
          label={t('applications.coaches.status')}
          onChange={onStatus}
        />
      </Box>
      <TextField
        select
        fullWidth
        label={t('applications.coaches.status')}
        value={status}
        onChange={(event) => {
          onStatus(event.target.value as CoachStatus);
        }}
        sx={{ display: { xs: 'flex', sm: 'none' } }}
      >
        {STATUS_OPTIONS.map(([value, key]) => (
          <MenuItem key={value} value={value}>
            {t(key)}
          </MenuItem>
        ))}
      </TextField>

      <Box sx={{ mt: 3 }}>
        <QueryState
          isPending={list.isPending}
          error={list.error}
          onRetry={() => void list.refetch()}
          loading={<RowsSkeleton rows={3} />}
        >
          {list.data?.items.length === 0 ? (
            <EmptyState
              title={t(
                status === 'PENDING'
                  ? 'applications.coaches.emptyPending'
                  : 'applications.coaches.empty',
              )}
            />
          ) : (
            <Stack component="ol" spacing={2} sx={{ m: 0, p: 0, listStyle: 'none' }}>
              {list.data?.items.map((item) => (
                <CoachApplicationCard key={item.id} item={item} />
              ))}
            </Stack>
          )}
        </QueryState>
      </Box>

      {pages > 1 && (
        <Box sx={{ mt: 3 }}>
          <Pagination page={page} pages={pages} onPage={onPage} />
        </Box>
      )}
    </Box>
  );
}

type Decision = 'reject' | 'hide';

function CoachApplicationCard({ item }: { readonly item: CoachApplicationView }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const placeName = usePlaceName();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<Decision | null>(null);
  const pending = item.status === 'PENDING';

  const refresh = (): Promise<void> => queryClient.invalidateQueries({ queryKey: coachKeys.all });
  const approve = useMutation({ mutationFn: () => approveCoach(item.id), onSuccess: refresh });
  const hidden = useMutation({
    mutationFn: ({ hide, reason }: { readonly hide: boolean; readonly reason?: string }) =>
      setCoachHidden(item.id, hide, reason),
    onSuccess: refresh,
  });
  const reject = useMutation({
    mutationFn: (reason: string) => rejectCoach(item.id, reason),
    onSuccess: refresh,
  });
  const verify = useMutation({
    mutationFn: ({ id, verified }: { readonly id: string; readonly verified: boolean }) =>
      verifyCoachCredential(item.id, id, verified),
    onSuccess: refresh,
  });
  const error = approve.error ?? hidden.error ?? verify.error;

  return (
    <Paper
      component="li"
      variant="outlined"
      data-coach-application={item.id}
      sx={{
        p: { xs: 2, sm: 3 },
        // Ждущая проверки — красная черта слева, как новая заявка клуба.
        borderLeft: pending ? '4px solid var(--red-600)' : undefined,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <PlayerAvatar
          lastName={item.player.lastName}
          firstName={item.player.firstName}
          photoUrl={coachPhoto(item)}
          size="lg"
        />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h3" component="h2">
            {coachFullName(item.player)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {[
              item.city === null ? null : placeName(item.city),
              item.submittedAt === null
                ? null
                : fill(t('applications.coaches.submitted'), {
                    when: formatDateTime(item.submittedAt, locale),
                  }),
            ]
              .filter((part) => part !== null)
              .join(' · ')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Button
            variant="text"
            href={`/coaches/${item.slug}`}
            endIcon={<ExternalLink size={16} aria-hidden />}
            sx={{ minHeight: 44 }}
          >
            {t('applications.coaches.preview')}
          </Button>
          <Button
            variant="text"
            href={`/cabinet/coach?id=${item.id}`}
            startIcon={<Pencil size={16} aria-hidden />}
            sx={{ minHeight: 44 }}
          >
            {t('coach.edit')}
          </Button>
        </Box>
      </Box>

      {!pending && (
        <Box sx={{ mt: 2 }}>
          <CoachStatusPlate coach={item} />
        </Box>
      )}

      {item.headline !== null && <Typography sx={{ mt: 2 }}>{item.headline}</Typography>}
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {fill(t('applications.coaches.summary'), {
          services: String(item.trainings.length),
          credentials: String(item.credentials.length),
          achievements: String(item.achievements.length),
        })}
      </Typography>

      {item.credentials.length > 0 && (
        <Box sx={{ mt: 2.5 }}>
          <Typography variant="h4" component="h3" sx={{ mb: 1 }}>
            {t('coach.editor.credentials')}
          </Typography>
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 2 }}>
            {item.credentials.map((credential) => (
              <Box
                component="li"
                key={credential.id}
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: { xs: '1fr', sm: '160px minmax(0, 1fr)' },
                  alignItems: 'start',
                }}
              >
                {credential.fileUrl === null ? (
                  <Typography variant="body2" color="text.secondary">
                    {t('applications.coaches.noScan')}
                  </Typography>
                ) : (
                  <CredentialScan
                    url={credential.fileUrl}
                    isPublic={credential.filePublic}
                    version={credential.file}
                    variant="thumb"
                  />
                )}
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600 }}>{credential.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {[
                      t(CREDENTIAL_KIND_KEYS[credential.kind]),
                      credential.issuer,
                      credential.year === null ? null : String(credential.year),
                      t(
                        credential.filePublic
                          ? 'applications.coaches.scanPublic'
                          : 'applications.coaches.scanPrivate',
                      ),
                    ]
                      .filter((part) => part !== null)
                      .join(' · ')}
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={credential.verifiedAt !== null}
                        disabled={verify.isPending}
                        onChange={(event) => {
                          verify.mutate({ id: credential.id, verified: event.target.checked });
                        }}
                      />
                    }
                    label={t('coach.credential.verified')}
                    sx={{ mt: 0.5, minHeight: 44 }}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      <Box sx={{ mt: 2.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
        {/* Кнопки — обводкой: заявок на экране несколько, главная кнопка одна. */}
        {pending && (
          <>
            <Button
              disabled={approve.isPending}
              onClick={() => {
                approve.mutate();
              }}
              sx={{ minHeight: 44 }}
            >
              {t('applications.coaches.approve')}
            </Button>
            <Button
              color="error"
              onClick={() => {
                setDialog('reject');
              }}
              sx={{ minHeight: 44 }}
            >
              {t('applications.coaches.reject')}
            </Button>
          </>
        )}
        {item.status === 'APPROVED' &&
          (item.hidden ? (
            <Button
              disabled={hidden.isPending}
              onClick={() => {
                hidden.mutate({ hide: false });
              }}
              sx={{ minHeight: 44 }}
            >
              {t('applications.coaches.show')}
            </Button>
          ) : (
            <Button
              color="error"
              onClick={() => {
                setDialog('hide');
              }}
              sx={{ minHeight: 44 }}
            >
              {t('applications.coaches.hide')}
            </Button>
          ))}
      </Box>

      {error !== null && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t(errorMessageKey(error))}
        </Alert>
      )}

      <ReasonDialog
        open={dialog !== null}
        title={t(
          dialog === 'hide' ? 'applications.coaches.hideTitle' : 'applications.coaches.rejectTitle',
        )}
        confirm={t(dialog === 'hide' ? 'applications.coaches.hide' : 'applications.coaches.reject')}
        pending={reject.isPending || hidden.isPending}
        error={dialog === 'hide' ? hidden.error : reject.error}
        onClose={() => {
          setDialog(null);
        }}
        onConfirm={(reason) => {
          const close = {
            onSuccess: () => {
              setDialog(null);
            },
          };

          if (dialog === 'hide') hidden.mutate({ hide: true, reason }, close);
          else reject.mutate(reason, close);
        }}
      />
    </Paper>
  );
}

/**
 * Причина отказа или скрытия — обязательна: тренер увидит её в кабинете
 * и поправит страницу (ADR-059).
 */
function ReasonDialog({
  open,
  title,
  confirm,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  readonly open: boolean;
  readonly title: string;
  readonly confirm: string;
  readonly pending: boolean;
  readonly error: unknown;
  readonly onClose: () => void;
  readonly onConfirm: (reason: string) => void;
}): ReactNode {
  const t = useT();
  const id = useId();
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby={`${id}-title`}
      fullWidth
      maxWidth="sm"
      slotProps={{
        transition: {
          onExited: () => {
            setReason('');
          },
        },
      }}
    >
      <DialogTitle id={`${id}-title`}>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('applications.coaches.reasonHint')}
        </Typography>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={3}
          label={t('applications.coaches.reason')}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
          }}
          slotProps={{ htmlInput: { maxLength: 500 } }}
        />
        {error !== null && error !== undefined && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {t(errorMessageKey(error))}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="text" onClick={onClose} sx={{ minHeight: 44 }}>
          {t('applications.coaches.cancel')}
        </Button>
        <Button
          color="error"
          disabled={trimmed === '' || pending}
          onClick={() => {
            onConfirm(trimmed);
          }}
          sx={{ minHeight: 44 }}
        >
          {confirm}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
