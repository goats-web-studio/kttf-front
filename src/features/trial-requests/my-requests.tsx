import type { TrialRequestView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from '@tanstack/react-router';
import { MessageCircle, Phone } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { fill, formatDateTime, useLocale, useT } from '@/common/i18n';
import Pagination from '@/common/ui/pagination';
import Surface from '@/common/ui/surface';
import { phoneHref, whatsappHref } from '@/features/clubs/contacts';
import { Badge } from '@/features/coaches/coach-cards';

import { cancelTrialRequest } from './api';
import { TrialFacts } from './inbox-panel';
import { MY_REQUESTS_ANCHOR, TRIAL_STATUS_KEYS, TRIAL_STATUS_TONES } from './inbox';
import { myTrialRequestsQuery, trialRequestKeys } from './queries';

const PAGE_SIZE = 10;

/**
 * «Мои заявки» на рабочем столе — ADR-059, T3. Свои заявки на пробные со
 * статусом и ответом; новую можно отозвать. После «Принята» — контакты
 * адресата: дальше человек может написать сам. Заявок нет — блока нет:
 * рабочий стол отвечает на «что мне сейчас делать».
 *
 * Сюда ведёт уведомление об ответе (`/cabinet#my-requests`): список
 * приходит позже перехода, поэтому к блоку прокручивает он сам.
 */
export default function MyTrialRequests(): ReactNode {
  const t = useT();
  const [page, setPage] = useState(1);
  const requests = useQuery(myTrialRequestsQuery({ page, limit: PAGE_SIZE }));
  const hash = useLocation({ select: (location) => location.hash });
  const anchor = useRef<HTMLDivElement>(null);
  const total = requests.data?.total ?? 0;

  useEffect(() => {
    if (hash === MY_REQUESTS_ANCHOR && total > 0) {
      anchor.current?.scrollIntoView({ block: 'start' });
    }
  }, [hash, total]);

  if (requests.data === undefined || total === 0) return null;

  return (
    <Box
      ref={anchor}
      id={MY_REQUESTS_ANCHOR}
      data-my-trial-requests
      // Липкая шапка не закрывает заголовок блока после прокрутки к якорю.
      sx={{ scrollMarginTop: 72 }}
    >
      <Surface title={t('trial.mine.title')} subtitle={t('trial.mine.lead')} flush>
        <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
          {requests.data.items.map((request) => (
            <MyRequest key={request.id} request={request} />
          ))}
        </Box>
        <Box sx={{ pb: 2 }}>
          <Pagination page={page} pages={Math.ceil(total / PAGE_SIZE)} onPage={setPage} />
        </Box>
      </Surface>
    </Box>
  );
}

function MyRequest({ request }: { readonly request: TrialRequestView }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const cancel = useMutation({
    mutationFn: () => cancelTrialRequest(request.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: trialRequestKeys.all });
    },
  });
  const { target } = request;
  const targetHref =
    target.kind === 'CLUB'
      ? `/clubs/${target.id}`
      : target.slug === null
        ? null
        : `/coaches/${target.slug}`;
  const message = fill(t('trial.mine.message'), { training: request.training.title });

  return (
    <Box
      component="li"
      data-my-trial-request={request.id}
      sx={{ px: { xs: 2, sm: 3 }, py: 2, borderTop: 1, borderColor: 'divider' }}
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
        <Link
          href={`/trainings?training=${request.training.id}`}
          sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}
        >
          {request.training.title}
        </Link>
        <Badge tone={TRIAL_STATUS_TONES[request.status]}>
          {t(TRIAL_STATUS_KEYS[request.status])}
        </Badge>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {targetHref === null ? (
          fill(t('trial.mine.to'), { name: target.name })
        ) : (
          <>
            {fill(t('trial.mine.to'), { name: '' })}
            <Link href={targetHref} color="text.secondary">
              {target.name}
            </Link>
          </>
        )}
        {` · ${fill(t('trial.sentAt'), { date: formatDateTime(request.createdAt, locale) })}`}
      </Typography>
      <TrialFacts request={request} />

      {request.status === 'ACCEPTED' && (target.whatsapp !== null || target.phone !== null) && (
        <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {target.whatsapp !== null && (
            <Button
              size="small"
              href={whatsappHref(target.whatsapp, message)}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<MessageCircle size={16} aria-hidden />}
              sx={{ minHeight: 44 }}
            >
              {t('club.contact.whatsapp')}
            </Button>
          )}
          {target.phone !== null && (
            <Button
              size="small"
              href={phoneHref(target.phone)}
              startIcon={<Phone size={16} aria-hidden />}
              sx={{ minHeight: 44 }}
            >
              {t('club.contact.call')}
            </Button>
          )}
        </Box>
      )}

      {request.status === 'NEW' && (
        <Button
          variant="text"
          color="error"
          disabled={cancel.isPending}
          onClick={() => {
            cancel.mutate();
          }}
          sx={{ mt: 1, minHeight: 44 }}
        >
          {t('trial.mine.cancel')}
        </Button>
      )}
      {cancel.error !== null && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {t(errorMessageKey(cancel.error))}
        </Alert>
      )}
    </Box>
  );
}
