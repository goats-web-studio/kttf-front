import { clubImageVariant, type ClubContentItem } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Play } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { z } from 'zod';

import { errorMessageKey } from '@/common/api';
import { formatDateTime, useLocale, useT } from '@/common/i18n';
import EmptyState from '@/common/ui/empty-state';
import { BackLink } from '@/common/ui/page-header';
import Pagination from '@/common/ui/pagination';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { useSessionStore } from '@/features/auth/session-store';
import { hideClubContent } from '@/features/club-content/api';
import { clubContentFeedQuery, clubContentKeys } from '@/features/club-content/queries';

const searchSchema = z.object({ page: z.coerce.number().int().positive().catch(1) });

export const Route = createFileRoute('/_app/cabinet/content')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: ContentPage,
});

const PAGE_SIZE = 20;

/**
 * Контент клубов — модерация, ADR-055 (постмодерация).
 *
 * Свежие записи и фото всех клубов одной лентой. Скрытое пропадает со
 * страницы клуба, а клуб видит в кабинете причину. Вернуть — той же кнопкой.
 */
function ContentPage(): ReactNode {
  const t = useT();
  const user = useSessionStore((state) => state.user);

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <BackLink href="/cabinet" label={t('page.cabinet.title')} />
      <Typography variant="h1" sx={{ mt: 1 }}>
        {t('page.content.title')}
      </Typography>
      {user?.isAdmin === true ? (
        <>
          <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 680 }}>
            {t('content.lead')}
          </Typography>
          <Feed />
        </>
      ) : (
        <Box sx={{ mt: 3 }}>
          <EmptyState
            title={t('applications.forbidden.title')}
            text={t('places.forbidden.text')}
            action={<Button href="/cabinet">{t('page.cabinet.title')}</Button>}
          />
        </Box>
      )}
    </Container>
  );
}

function Feed(): ReactNode {
  const t = useT();
  const { page } = Route.useSearch();
  const navigate = Route.useNavigate();
  const feed = useQuery(clubContentFeedQuery({ page, limit: PAGE_SIZE }));
  const pages = feed.data === undefined ? 1 : Math.max(1, Math.ceil(feed.data.total / PAGE_SIZE));

  return (
    <Box sx={{ mt: 3 }}>
      <QueryState
        isPending={feed.isPending}
        error={feed.error}
        onRetry={() => void feed.refetch()}
        loading={<RowsSkeleton rows={3} />}
      >
        {feed.data?.items.length === 0 ? (
          <EmptyState title={t('content.empty.title')} text={t('content.empty.text')} />
        ) : (
          <Box sx={{ display: 'grid', gap: 1.5 }}>
            {(feed.data?.items ?? []).map((item) => (
              <ContentRow key={`${item.kind}-${item.id}`} item={item} />
            ))}
          </Box>
        )}
      </QueryState>
      <Pagination
        page={page}
        pages={pages}
        onPage={(next) => {
          void navigate({ search: { page: next } });
        }}
      />
    </Box>
  );
}

function ContentRow({ item }: { readonly item: ClubContentItem }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const hide = useMutation({
    mutationFn: (hidden: boolean) =>
      hideClubContent(item.kind, item.id, {
        hidden,
        reason: hidden && reason.trim() !== '' ? reason.trim() : null,
      }),
    onSuccess: async () => {
      setReason('');
      await queryClient.invalidateQueries({ queryKey: clubContentKeys.all });
    },
  });

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', sm: '160px 1fr' },
        opacity: item.hidden ? 0.75 : 1,
      }}
    >
      {item.imageUrl === null ? (
        <Box sx={{ display: { xs: 'none', sm: 'block' } }} />
      ) : (
        <Box sx={{ position: 'relative' }}>
          <Box
            component="img"
            src={clubImageVariant(item.imageUrl, 480)}
            alt=""
            loading="lazy"
            sx={{
              display: 'block',
              width: '100%',
              aspectRatio: '4 / 3',
              objectFit: 'cover',
              borderRadius: 2,
            }}
          />
          {item.youtubeId !== null && (
            <Box sx={{ position: 'absolute', left: 8, top: 8, color: 'var(--paper)' }}>
              <Play size={18} aria-hidden fill="currentColor" />
            </Box>
          )}
        </Box>
      )}
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" color="text.secondary">
          <Link href={`/clubs/${item.club.id}`}>{item.club.name}</Link>
          {' · '}
          {t(item.kind === 'POST' ? 'content.kind.post' : 'content.kind.media')}
          {' · '}
          {formatDateTime(item.createdAt, locale)}
        </Typography>
        {item.title !== null && (
          <Typography sx={{ mt: 0.5, fontWeight: 600 }}>{item.title}</Typography>
        )}
        {item.excerpt !== null && (
          <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-line' }}>
            {item.excerpt}
          </Typography>
        )}
        {item.hidden && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            {item.hiddenReason === null
              ? t('manage.content.hidden')
              : `${t('manage.content.hidden')}: ${item.hiddenReason}`}
          </Alert>
        )}
        <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          {!item.hidden && (
            <TextField
              size="small"
              label={t('content.reason')}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
              }}
              slotProps={{ htmlInput: { maxLength: 200 } }}
              sx={{ minWidth: { sm: 280 } }}
            />
          )}
          <Button
            variant="outlined"
            disabled={hide.isPending}
            onClick={() => {
              hide.mutate(!item.hidden);
            }}
            sx={{ minHeight: 40 }}
          >
            {t(item.hidden ? 'content.show' : 'content.hide')}
          </Button>
        </Box>
        {hide.error !== null && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {t(errorMessageKey(hide.error))}
          </Alert>
        )}
      </Box>
    </Paper>
  );
}
