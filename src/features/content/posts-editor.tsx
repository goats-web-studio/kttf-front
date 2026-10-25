import {
  isPromoExpired,
  rejectPhoto,
  CLUB_IMAGE_MAX_BYTES,
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
import RichField from '@/common/rich/rich-field';
import { useT, type MessageKey } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { clubTodayIso } from '@/features/clubs/club-time';

import { createPost, deletePost, updatePost } from './api';
import {
  OWNER_TEXTS,
  contentImageVariant,
  hiddenNote,
  parsePost,
  uploadOwnerImage,
  type ContentOwner,
  type ContentPostView,
} from './owner';
import { PostCard } from './posts';
import { allPostsQuery, contentKeys } from './queries';

interface Draft {
  readonly kind: PostKind;
  readonly title: string;
  readonly body: string;
  readonly imageUrl: string | null;
  readonly validUntil: string;
}

const EMPTY: Draft = { kind: 'NEWS', title: '', body: '', imageUrl: null, validUntil: '' };

const draftOf = (post: ContentPostView): Draft => ({
  kind: post.kind,
  title: post.title,
  body: post.body,
  imageUrl: post.imageUrl,
  validUntil: post.validUntil ?? '',
});

/**
 * Новости и акции в кабинете клуба (ADR-055, `docs/09` 3.2) и тренера
 * (ADR-059, T2.2).
 *
 * Публикуется сразу (постмодерация). Скрытое администратором видно здесь с
 * причиной, завершившаяся акция — с пометкой «в архиве». Закреп один: новый
 * снимает старый.
 */
export default function PostsEditor({ owner }: { readonly owner: ContentOwner }): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const texts = OWNER_TEXTS[owner.kind];
  const posts = useQuery(allPostsQuery(owner, { page: 1, limit: 50 }));
  const [editing, setEditing] = useState<ContentPostView | 'new' | null>(null);
  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: contentKeys.all });
  };

  const pin = useMutation({
    mutationFn: (post: ContentPostView) => updatePost(owner, post.id, { pinned: !post.pinned }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (post: ContentPostView) => deletePost(owner, post.id),
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
          {t(texts.postsLead)}
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
          owner={owner}
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
            <Typography color="text.secondary">{t(texts.postsEmpty)}</Typography>
          ) : (
            <Box sx={{ display: 'grid', gap: 2 }}>
              {(posts.data?.items ?? []).map((post) => (
                <Box key={post.id} data-post={post.id}>
                  {post.hidden && (
                    <Alert severity="warning" sx={{ mb: 1 }}>
                      {hiddenNote(t, post)}
                    </Alert>
                  )}
                  {isPromoExpired(post, today) && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      {t(texts.postsExpired)}
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
  owner,
  post,
  onDone,
}: {
  readonly owner: ContentOwner;
  readonly post: ContentPostView | null;
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
    mutationFn: (file: File) => uploadOwnerImage(owner, file),
    onSuccess: (image) => {
      change({ imageUrl: image.url });
    },
  });

  const save = useMutation({
    mutationFn: (values: CreateClubPostInput) =>
      post === null
        ? createPost(owner, values)
        : updatePost(owner, post.id, {
            ...values,
            imageUrl: values.imageUrl ?? null,
            validUntil: values.validUntil ?? null,
          }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: contentKeys.all });
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
      {/* Разметка, ссылки и отметки — ADR-076. */}
      <Box sx={{ mt: 2 }}>
        <RichField
          label={t('manage.posts.body')}
          value={draft.body}
          minRows={5}
          maxLength={4000}
          onChange={(body) => {
            change({ body });
          }}
          helperText={t('manage.posts.bodyHint')}
        />
      </Box>
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
            src={contentImageVariant(draft.imageUrl, 480)}
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
            const parsed = parsePost(owner, values);

            if (parsed === null) {
              setInvalid('manage.posts.invalid');
              return;
            }

            setInvalid(null);
            save.mutate(parsed);
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
