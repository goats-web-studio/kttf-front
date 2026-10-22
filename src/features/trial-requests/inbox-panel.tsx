import type { IncomingTrialRequestView, ListTrialRequestsQuery } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Phone } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { fill, formatDateTime, useLocale, useT } from '@/common/i18n';
import EmptyState from '@/common/ui/empty-state';
import Pagination from '@/common/ui/pagination';
import PillTabs from '@/common/ui/pill-tabs';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { phoneHref, whatsappHref } from '@/features/clubs/contacts';
import { Badge } from '@/features/coaches/coach-cards';

import { answerTrialRequest } from './api';
import { TRIAL_STATUS_KEYS, TRIAL_STATUS_TONES, forWhomText, type TrialInbox } from './inbox';
import { inboxTrialRequestsQuery, trialRequestKeys } from './queries';

const PAGE_SIZE = 20;

type Filter = 'NEW' | 'ALL';

const FILTERS = [
  ['NEW', 'trial.inbox.filterNew'],
  ['ALL', 'trial.inbox.filterAll'],
] as const;

/**
 * Вкладка «Заявки» кабинета тренера и клуба — ADR-059, T3 (`docs/11`
 * 3.3.3). Одна на обоих: адресат задаёт только адрес и вводный текст.
 * Сначала новые — то, с чем надо что-то сделать: позвонить или написать
 * человеку и отметить ответ, он придёт ему в уведомления.
 */
export default function TrialInboxPanel({ inbox }: { readonly inbox: TrialInbox }): ReactNode {
  const t = useT();
  const [filter, setFilter] = useState<Filter>('NEW');
  const [page, setPage] = useState(1);
  const query: ListTrialRequestsQuery = {
    page,
    limit: PAGE_SIZE,
    ...(filter === 'NEW' ? { status: 'NEW' } : {}),
  };
  const requests = useQuery(inboxTrialRequestsQuery(inbox, query));
  const items = requests.data?.items ?? [];
  const pages = Math.ceil((requests.data?.total ?? 0) / PAGE_SIZE);

  return (
    <Paper
      variant="outlined"
      component="section"
      data-trial-inbox={inbox.kind}
      sx={{ mt: 3, p: { xs: 2.5, sm: 4 } }}
    >
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Typography variant="h2">{t('trial.inbox.title')}</Typography>
        <PillTabs
          value={filter}
          options={FILTERS}
          label={t('trial.inbox.filter')}
          onChange={(next) => {
            setFilter(next);
            setPage(1);
          }}
        />
      </Box>
      <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 680 }}>
        {t(inbox.kind === 'CLUB' ? 'trial.inbox.leadClub' : 'trial.inbox.leadCoach')}
      </Typography>

      <Box sx={{ mt: 3 }}>
        <QueryState
          isPending={requests.isPending}
          error={requests.error}
          onRetry={() => void requests.refetch()}
          loading={<RowsSkeleton rows={3} />}
        >
          {items.length === 0 ? (
            <EmptyState
              title={t(filter === 'NEW' ? 'trial.inbox.emptyNew' : 'trial.inbox.emptyAll')}
              text={t('trial.inbox.emptyText')}
            />
          ) : (
            <Box
              component="ul"
              sx={{
                m: 0,
                p: 0,
                listStyle: 'none',
                border: 1,
                borderColor: 'divider',
                borderRadius: 3,
              }}
            >
              {items.map((request) => (
                <IncomingItem key={request.id} request={request} />
              ))}
            </Box>
          )}
          <Pagination page={page} pages={pages} onPage={setPage} />
        </QueryState>
      </Box>
    </Paper>
  );
}

/** Подпись — значение; пустое не выводится. */
function Field({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string | null;
}): ReactNode {
  if (value === null || value === '') return null;

  return (
    <Box sx={{ display: 'contents' }}>
      <Typography component="dt" variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography component="dd" sx={{ m: 0, overflowWrap: 'anywhere', whiteSpace: 'pre-line' }}>
        {value}
      </Typography>
    </Box>
  );
}

/** Факты заявки: для кого, когда удобно, комментарий, ответ. */
export function TrialFacts({
  request,
}: {
  readonly request: Pick<
    IncomingTrialRequestView,
    'forWhom' | 'childAge' | 'preferredTime' | 'comment' | 'reply'
  >;
}): ReactNode {
  const t = useT();

  return (
    <Box
      component="dl"
      sx={{
        m: 0,
        mt: 1.5,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'max-content minmax(0, 1fr)' },
        columnGap: 3,
        rowGap: { xs: 0.25, sm: 0.75 },
        '& dt:not(:first-of-type)': { mt: { xs: 1, sm: 0 } },
      }}
    >
      <Field label={t('trial.field.forWhom')} value={forWhomText(request, t)} />
      <Field label={t('trial.field.time')} value={request.preferredTime} />
      <Field label={t('trial.field.comment')} value={request.comment} />
      <Field label={t('trial.field.reply')} value={request.reply} />
    </Box>
  );
}

function IncomingItem({ request }: { readonly request: IncomingTrialRequestView }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [reply, setReply] = useState('');
  const answer = useMutation({
    mutationFn: (status: 'ACCEPTED' | 'DECLINED') =>
      answerTrialRequest(request.id, {
        status,
        ...(reply.trim() === '' ? {} : { reply: reply.trim() }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: trialRequestKeys.all });
    },
  });
  const message = fill(t('trial.inbox.message'), {
    name: request.target.name,
    training: request.training.title,
  });
  const { requester } = request;

  return (
    <Box
      component="li"
      data-trial-request={request.id}
      sx={{
        px: { xs: 2, sm: 3 },
        py: 2,
        borderTop: 1,
        borderColor: 'divider',
        '&:first-of-type': { borderTop: 0 },
      }}
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
        <Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
          {request.training.title}
        </Typography>
        <Badge tone={TRIAL_STATUS_TONES[request.status]}>
          {t(TRIAL_STATUS_KEYS[request.status])}
        </Badge>
        {request.source === 'CAMPAIGN' && <Badge>{t('trial.inbox.fromAds')}</Badge>}
      </Box>
      <Typography sx={{ mt: 0.5 }}>
        {requester.playerId === null ? (
          <Box component="span" sx={{ fontWeight: 500 }}>
            {requester.name}
          </Box>
        ) : (
          <Link href={`/players/${requester.playerId}`} sx={{ fontWeight: 500 }}>
            {requester.name}
          </Link>
        )}
        <Box component="span" sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
          {` · ${requester.phone}`}
        </Box>
      </Typography>
      <TrialFacts request={request} />
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {fill(t('trial.sentAt'), { date: formatDateTime(request.createdAt, locale) })}
        {request.answeredAt !== null &&
          ` · ${fill(t('trial.answeredAt'), { date: formatDateTime(request.answeredAt, locale) })}`}
      </Typography>

      {/* Позвонить и написать — пока заявка жива; отозванной звонить незачем. */}
      {request.status !== 'CANCELLED' && (
        <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Button
            size="small"
            href={phoneHref(requester.phone)}
            startIcon={<Phone size={16} aria-hidden />}
            sx={{ minHeight: 44 }}
          >
            {t('club.contact.call')}
          </Button>
          <Button
            size="small"
            href={whatsappHref(requester.phone, message)}
            target="_blank"
            rel="noopener noreferrer"
            startIcon={<MessageCircle size={16} aria-hidden />}
            sx={{ minHeight: 44 }}
          >
            {t('club.contact.whatsapp')}
          </Button>
        </Box>
      )}

      {request.status === 'NEW' && (
        <Box sx={{ mt: 2, display: 'grid', gap: 1.5, maxWidth: 560 }}>
          <TextField
            size="small"
            label={t('trial.inbox.reply')}
            helperText={t('trial.inbox.replyHint')}
            value={reply}
            onChange={(event) => {
              setReply(event.target.value);
            }}
            multiline
            minRows={1}
            slotProps={{ htmlInput: { maxLength: 500 } }}
          />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Button
              disabled={answer.isPending}
              onClick={() => {
                answer.mutate('ACCEPTED');
              }}
              sx={{ minHeight: 44 }}
            >
              {t('trial.inbox.accept')}
            </Button>
            <Button
              variant="text"
              color="error"
              disabled={answer.isPending}
              onClick={() => {
                answer.mutate('DECLINED');
              }}
              sx={{ minHeight: 44 }}
            >
              {t('trial.inbox.decline')}
            </Button>
          </Box>
        </Box>
      )}
      {answer.error !== null && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t(errorMessageKey(answer.error))}
        </Alert>
      )}
    </Box>
  );
}
