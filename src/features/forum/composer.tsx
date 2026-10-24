import {
  CLUB_IMAGE_MAX_BYTES,
  FORUM_POST_BODY_MAX,
  FORUM_POST_IMAGES_MAX,
  rejectPhoto,
  type CreateForumPostInput,
  type ForumImage,
} from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from '@tanstack/react-router';
import { ImagePlus, X } from 'lucide-react';
import { forwardRef, useId, useRef, useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { fill, formatDate, useLocale, useT } from '@/common/i18n';
import { authHref } from '@/features/auth/redirect';
import { useSessionStore } from '@/features/auth/session-store';

import { uploadForumImage } from './api';
import { forumImageVariant } from './labels';
import { forumMeQuery } from './queries';

/** Цитата, которую человек выбрал кнопкой «Цитировать» у сообщения. */
export interface DraftQuote {
  readonly postId: string;
  readonly number: number;
  readonly authorName: string;
  readonly text: string;
}

/**
 * Пишет ли этот человек на форуме, и если нет — что ему сделать: войти,
 * заполнить профиль игрока, дождаться конца запрета (ADR-064 §2, §5).
 * Пока не ясно — ничего: форма не мигает отказом у того, кто может.
 */
export function WriteGate({
  locked = false,
  children,
}: {
  readonly locked?: boolean;
  readonly children: ReactNode;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const location = useLocation();
  const user = useSessionStore((state) => state.user);
  const me = useQuery({ ...forumMeQuery, enabled: user !== null });

  if (locked) {
    return (
      <Alert severity="info" icon={false} data-forum-gate="locked">
        {t('forum.gate.locked')}
      </Alert>
    );
  }

  if (user === null) {
    return (
      <Box
        data-forum-gate="login"
        sx={{
          p: 2.5,
          borderRadius: 3,
          bgcolor: 'var(--paper-sunken)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography>{t('forum.gate.login')}</Typography>
        <Button href={authHref('/login', location.href)} variant="contained" sx={{ minHeight: 44 }}>
          {t('forum.gate.loginAction')}
        </Button>
      </Box>
    );
  }

  if (me.data === undefined) return null;

  if (me.data.profileRequired) {
    return (
      <Alert
        severity="info"
        icon={false}
        data-forum-gate="profile"
        action={
          <Button href="/settings/profile" color="inherit" sx={{ minHeight: 44 }}>
            {t('forum.gate.profileAction')}
          </Button>
        }
      >
        {t('forum.gate.profile')}
      </Alert>
    );
  }

  if (me.data.mute !== null) {
    return (
      <Alert severity="warning" icon={false} data-forum-gate="muted">
        {fill(t('forum.gate.muted'), {
          until: formatDate(me.data.mute.until, locale),
          reason: me.data.mute.reason,
        })}
      </Alert>
    );
  }

  return children;
}

interface ComposerProps {
  readonly quote?: DraftQuote | null;
  readonly onClearQuote?: () => void;
  readonly submit: (input: CreateForumPostInput) => Promise<unknown>;
  readonly placeholder?: string;
  readonly submitLabel?: string;
  /** Текст и фото правки; без них — новое сообщение. */
  readonly initial?: { readonly body: string; readonly images: readonly ForumImage[] };
  readonly onCancel?: () => void;
  readonly onDone?: () => void;
  /** Проверка полей вокруг формы (заголовок новой темы): `false` — не отправлять. */
  readonly validate?: () => boolean;
  /**
   * Черновик на устройстве (ADR-067 §9): пока ответ не отправлен, текст
   * переживает закрытие вкладки. Ключ — тема или предмет.
   */
  readonly draftKey?: string;
}

/**
 * Поле сообщения: текст, цитата над ним, до четырёх фото. Черновик живёт,
 * пока открыта страница; отправилось — поле чистится. Ошибка — по коду,
 * текстом из словаря (бриф 3.4).
 */
const Composer = forwardRef<HTMLTextAreaElement, ComposerProps>(function Composer(
  {
    quote = null,
    onClearQuote,
    submit,
    placeholder,
    submitLabel,
    initial,
    onCancel,
    onDone,
    validate,
    draftKey,
  },
  ref,
) {
  const t = useT();
  const fileId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState(initial?.body ?? readDraft(draftKey));
  const [images, setImages] = useState<readonly ForumImage[]>(initial?.images ?? []);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const empty = body.trim() === '';

  const addImages = async (files: FileList | null): Promise<void> => {
    if (files === null) return;

    const room = FORUM_POST_IMAGES_MAX - images.length;
    const picked = [...files].slice(0, room);

    setError(null);
    setUploading(true);

    try {
      for (const file of picked) {
        if (rejectPhoto(file, CLUB_IMAGE_MAX_BYTES) !== null) {
          setError(t('forum.composer.badImage'));
          continue;
        }

        const uploaded = await uploadForumImage(file);

        setImages((previous) => [...previous, uploaded]);
      }
    } catch (caught) {
      setError(t(errorMessageKey(caught)));
    } finally {
      setUploading(false);
      if (fileInput.current !== null) fileInput.current.value = '';
    }
  };

  return (
    <Box
      component="form"
      noValidate
      data-forum-composer
      onSubmit={(event) => {
        event.preventDefault();
        if (empty || pending) return;
        if (validate !== undefined && !validate()) return;

        setPending(true);
        setError(null);
        submit({
          body: body.trim(),
          ...(quote === null ? {} : { quote: { postId: quote.postId, text: quote.text } }),
          ...(images.length === 0 && initial === undefined ? {} : { images: [...images] }),
        })
          .then(() => {
            if (initial === undefined) {
              setBody('');
              writeDraft(draftKey, '');
              setImages([]);
              onClearQuote?.();
            }
            onDone?.();
          })
          .catch((caught: unknown) => {
            setError(t(errorMessageKey(caught)));
          })
          .finally(() => {
            setPending(false);
          });
      }}
    >
      {quote !== null && (
        <Box
          data-forum-draft-quote
          sx={{
            mb: 1.5,
            pl: 2,
            pr: 0.5,
            py: 1,
            display: 'flex',
            gap: 1,
            alignItems: 'flex-start',
            borderLeft: '3px solid var(--red-500)',
            borderRadius: '0 8px 8px 0',
            bgcolor: 'var(--paper-sunken)',
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              {fill(t('forum.quote.wrote'), { name: quote.authorName })} · #{quote.number}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                whiteSpace: 'pre-line',
                overflowWrap: 'anywhere',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {quote.text}
            </Typography>
          </Box>
          <IconButton
            aria-label={t('forum.composer.removeQuote')}
            onClick={onClearQuote}
            sx={{ width: 44, height: 44 }}
          >
            <X size={18} aria-hidden />
          </IconButton>
        </Box>
      )}

      <TextField
        inputRef={ref}
        value={body}
        onChange={(event) => {
          setBody(event.target.value);
          writeDraft(draftKey, event.target.value);
        }}
        placeholder={placeholder ?? t('forum.composer.placeholder')}
        aria-label={placeholder ?? t('forum.composer.placeholder')}
        multiline
        minRows={3}
        maxRows={16}
        fullWidth
        slotProps={{ htmlInput: { maxLength: FORUM_POST_BODY_MAX } }}
      />

      {images.length > 0 && (
        <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }} data-forum-draft-images>
          {images.map((image) => (
            <Box
              key={image.url}
              sx={{
                position: 'relative',
                width: 88,
                height: 88,
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: 'var(--ink-100)',
              }}
            >
              <Box
                component="img"
                src={forumImageVariant(image.url, 480)}
                alt=""
                width={88}
                height={88}
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <IconButton
                aria-label={t('forum.composer.removeImage')}
                onClick={() => {
                  setImages((previous) => previous.filter((item) => item.url !== image.url));
                }}
                size="small"
                sx={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  bgcolor: 'rgb(31 31 29 / 0.6)',
                  color: '#fff',
                  '&:hover': { bgcolor: 'rgb(31 31 29 / 0.8)' },
                }}
              >
                <X size={14} aria-hidden />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      {error !== null && (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          mt: 1.5,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <input
            ref={fileInput}
            id={fileId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            onChange={(event) => {
              void addImages(event.target.files);
            }}
          />
          <Button
            variant="text"
            component="label"
            htmlFor={fileId}
            disabled={uploading || images.length >= FORUM_POST_IMAGES_MAX}
            startIcon={<ImagePlus size={18} aria-hidden />}
            sx={{ minHeight: 44 }}
          >
            {uploading
              ? t('common.loading')
              : fill(t('forum.composer.addImage'), {
                  count: String(images.length),
                  max: String(FORUM_POST_IMAGES_MAX),
                })}
          </Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {onCancel !== undefined && (
            <Button variant="text" onClick={onCancel} sx={{ minHeight: 44 }}>
              {t('forum.action.cancel')}
            </Button>
          )}
          <Button
            type="submit"
            variant="contained"
            disabled={empty || pending || uploading}
            sx={{ minHeight: 44 }}
          >
            {pending ? t('common.loading') : (submitLabel ?? t('forum.composer.send'))}
          </Button>
        </Box>
      </Box>
    </Box>
  );
});

export default Composer;

const DRAFT_PREFIX = 'kttf:forum-draft:';

/** Черновик из хранилища устройства; недоступное хранилище — пустой черновик. */
function readDraft(key: string | undefined): string {
  if (key === undefined) return '';

  try {
    return window.localStorage.getItem(DRAFT_PREFIX + key) ?? '';
  } catch {
    return '';
  }
}

function writeDraft(key: string | undefined, value: string): void {
  if (key === undefined) return;

  try {
    if (value.trim() === '') window.localStorage.removeItem(DRAFT_PREFIX + key);
    else window.localStorage.setItem(DRAFT_PREFIX + key, value);
  } catch {
    // Приватный режим или полное хранилище: без черновика, но форма работает.
  }
}
