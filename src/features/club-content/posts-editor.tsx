import {
  createClubPostSchema,
  isPromoExpired,
  rejectPhoto,
  CLUB_IMAGE_MAX_BYTES,
  clubImageVariant,
  type ClubPostView,
  type ClubView,
  type CreateClubPostInput,
  type PostKind,
} from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Pin, PinOff, Plus, Trash2 } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT, type MessageKey } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { uploadClubImage } from '@/features/clubs/api';
import { clubTodayIso } from '@/features/clubs/club-time';

import { createClubPost, deleteClubPost, updateClubPost } from './api';
import { PostCard } from './club-posts';
import { allClubPostsQuery, clubContentKeys } from './queries';

interface Draft {
  readonly kind: PostKind;
  readonly title: string;
  readonly body: string;
  readonly imageUrl: string | null;
  readonly validUntil: string;
}

const EMPTY: Draft = { kind: 'NEWS', title: '', body: '', imageUrl: null, validUntil: '' };

const draftOf = (post: ClubPostView): Draft => ({
  kind: post.kind,
  title: post.title,
  body: post.body,
  imageUrl: post.imageUrl,
  validUntil: post.validUntil ?? '',
});

/**
 * Новости и акции в кабинете клуба — ADR-055, `docs/09` 3.2.
 *
 * Публикуется сразу (постмодерация). Скрытое администратором видно здесь с
 * причиной. Закреп у клуба один: новый снимает старый.
 */
export default function PostsEditor({ club }: { readonly club: ClubView }): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const posts = useQuery(allClubPostsQuery(club.id, { page: 1, limit: 50 }));
  const [editing, setEditing] = useState<ClubPostView | 'new' | null>(null);
  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: clubContentKeys.all });
  };

  const pin = useMutation({
    mutationFn: (post: ClubPostView) => updateClubPost(club.id, post.id, { pinned: !post.pinned }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (post: ClubPostView) => deleteClubPost(club.id, post.id),
    onSuccess: refresh,
  });
  const today = clubTodayIso();

  return (
    <Box sx={{ mt: 3 }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Typography color="text.secondary" sx={{ maxWidth: 680 }}>
          {t('manage.posts.lead')}
        </Typography>
        {editing === null && (
          <Button
            variant="outlined"
            startIcon={<Plus size={18} aria-hidden />}
            onClick={() => {
              setEditing('new');
            }}
            sx={{ minHeight: 44 }}
          >
            {t('manage.posts.new')}
          </Button>
        )}
      </Box>

      {editing !== null && (
        <PostForm
          club={club}
          post={editing === 'new' ? null : editing}
          onDone={() => {
            setEditing(null);
          }}
        />
      )}

      {(pin.error ?? remove.error) !== null && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t(errorMessageKey(pin.error ?? remove.error))}
        </Alert>
      )}

      <Box sx={{ mt: 3 }}>
        <QueryState
          isPending={posts.isPending}
          error={posts.error}
          onRetry={() => void posts.refetch()}
          loading={<RowsSkeleton rows={2} />}
        >
          {posts.data?.items.length === 0 ? (
            <Typography color="text.secondary">{t('manage.posts.empty')}</Typography>
          ) : (
            <Box sx={{ display: 'grid', gap: 2 }}>
              {(posts.data?.items ?? []).map((post) => (
                <Box key={post.id}>
                  {post.hidden && (
                    <Alert severity="warning" sx={{ mb: 1 }}>
                      {post.hiddenReason === null
                        ? t('manage.content.hidden')
                        : `${t('manage.content.hidden')}: ${post.hiddenReason}`}
                    </Alert>
                  )}
                  {isPromoExpired(post, today) && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      {t('manage.posts.expired')}
                    </Typography>
                  )}
                  <PostCard
                    post={post}
                    actions={
                      <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        <Button
                          size="small"
                          startIcon={<Pencil size={16} aria-hidden />}
                          onClick={() => {
                            setEditing(post);
                          }}
                          sx={{ minHeight: 44 }}
                        >
                          {t('manage.posts.edit')}
                        </Button>
                        <Button
                          size="small"
                          startIcon={
                            post.pinned ? (
                              <PinOff size={16} aria-hidden />
                            ) : (
                              <Pin size={16} aria-hidden />
                            )
                          }
                          disabled={pin.isPending}
                          onClick={() => {
                            pin.mutate(post);
                          }}
                          sx={{ minHeight: 44 }}
                        >
                          {t(post.pinned ? 'manage.posts.unpin' : 'manage.posts.pin')}
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          startIcon={<Trash2 size={16} aria-hidden />}
                          disabled={remove.isPending}
                          onClick={() => {
                            if (window.confirm(t('manage.posts.deleteConfirm')))
                              remove.mutate(post);
                          }}
                          sx={{ minHeight: 44 }}
                        >
                          {t('manage.posts.delete')}
                        </Button>
                      </Box>
                    }
                  />
                </Box>
              ))}
            </Box>
          )}
        </QueryState>
      </Box>
    </Box>
  );
}

/** Форма записи: новая или правка. Картинка загружается сразу, сохраняется вместе с записью. */
function PostForm({
  club,
  post,
  onDone,
}: {
  readonly club: ClubView;
  readonly post: ClubPostView | null;
  readonly onDone: () => void;
}): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Draft>(post === null ? EMPTY : draftOf(post));
  const [invalid, setInvalid] = useState<MessageKey | null>(null);

  const change = (patch: Partial<Draft>): void => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const upload = useMutation({
    mutationFn: (file: File) => uploadClubImage(club.id, file),
    onSuccess: (image) => {
      change({ imageUrl: image.url });
    },
  });

  const save = useMutation({
    mutationFn: (values: CreateClubPostInput) =>
      post === null
        ? createClubPost(club.id, values)
        : updateClubPost(club.id, post.id, {
            ...values,
            imageUrl: values.imageUrl ?? null,
            validUntil: values.validUntil ?? null,
          }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clubContentKeys.all });
      onDone();
    },
  });

  return (
    <Paper variant="outlined" component="section" sx={{ mt: 3, p: { xs: 2.5, sm: 4 } }}>
      <Typography variant="h2">
        {t(post === null ? 'manage.posts.new' : 'manage.posts.edit')}
      </Typography>
      <Box
        sx={{ mt: 3, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '200px 1fr' } }}
      >
        <TextField
          select
          label={t('manage.posts.kind')}
          value={draft.kind}
          onChange={(event) => {
            const kind = event.target.value as PostKind;
            change({ kind, validUntil: kind === 'NEWS' ? '' : draft.validUntil });
          }}
        >
          <MenuItem value="NEWS">{t('club.posts.news')}</MenuItem>
          <MenuItem value="PROMO">{t('club.posts.promo')}</MenuItem>
        </TextField>
        <TextField
          label={t('manage.posts.titleField')}
          value={draft.title}
          onChange={(event) => {
            change({ title: event.target.value });
          }}
          slotProps={{ htmlInput: { maxLength: 150 } }}
        />
      </Box>
      <TextField
        label={t('manage.posts.body')}
        value={draft.body}
        multiline
        minRows={5}
        fullWidth
        onChange={(event) => {
          change({ body: event.target.value });
        }}
        helperText={t('manage.posts.bodyHint')}
        slotProps={{ htmlInput: { maxLength: 4000 } }}
        sx={{ mt: 2 }}
      />
      {draft.kind === 'PROMO' && (
        <TextField
          type="date"
          label={t('manage.posts.validUntil')}
          value={draft.validUntil}
          onChange={(event) => {
            change({ validUntil: event.target.value });
          }}
          helperText={t('manage.posts.validUntilHint')}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ mt: 2, width: { xs: '100%', sm: 260 } }}
        />
      )}

      <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
        {draft.imageUrl !== null && (
          <Box
            component="img"
            src={clubImageVariant(draft.imageUrl, 480)}
            alt=""
            sx={{ width: 160, aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 2 }}
          />
        )}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';

            if (file === undefined) return;

            const rejection = rejectPhoto(file, CLUB_IMAGE_MAX_BYTES);

            if (rejection !== null) {
              setInvalid(
                rejection === 'SIZE' ? 'manage.page.imageTooBig' : 'manage.page.imageType',
              );
              return;
            }

            setInvalid(null);
            upload.mutate(file);
          }}
        />
        <Button
          disabled={upload.isPending}
          onClick={() => input.current?.click()}
          sx={{ minHeight: 44 }}
        >
          {upload.isPending
            ? t('manage.page.uploading')
            : t(draft.imageUrl === null ? 'manage.posts.addImage' : 'manage.page.replace')}
        </Button>
        {draft.imageUrl !== null && (
          <Button
            onClick={() => {
              change({ imageUrl: null });
            }}
            sx={{ minHeight: 44 }}
          >
            {t('manage.page.remove')}
          </Button>
        )}
      </Box>

      {invalid !== null && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t(invalid)}
        </Alert>
      )}
      {(save.error ?? upload.error) !== null && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t(errorMessageKey(save.error ?? upload.error))}
        </Alert>
      )}

      <Box sx={{ mt: 3, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <Button
          variant="outlined"
          size="large"
          disabled={save.isPending || upload.isPending}
          onClick={() => {
            const values = {
              kind: draft.kind,
              title: draft.title,
              body: draft.body,
              imageUrl: draft.imageUrl,
              validUntil:
                draft.kind === 'PROMO' && draft.validUntil !== '' ? draft.validUntil : null,
            };
            const parsed = createClubPostSchema.safeParse(values);

            if (!parsed.success) {
              setInvalid('manage.posts.invalid');
              return;
            }

            setInvalid(null);
            save.mutate(parsed.data);
          }}
        >
          {save.isPending ? t('common.loading') : t('manage.posts.publish')}
        </Button>
        <Button size="large" onClick={onDone}>
          {t('manage.posts.cancel')}
        </Button>
      </Box>
    </Paper>
  );
}
