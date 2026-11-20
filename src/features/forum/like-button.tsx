import { ERROR_CODES, isAppError } from '@kttf/shared/errors';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Tooltip from '@mui/material/Tooltip';
import { useLocation } from '@tanstack/react-router';
import { Heart } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { fill, formatCount, useLocale, useT, type MessageKey } from '@/common/i18n';
import { authHref } from '@/features/auth/redirect';
import { useSessionStore } from '@/features/auth/session-store';

import { setForumLike } from './api';

interface LikeButtonProps {
  /** Сообщение форума; у карточки ленты — первое сообщение темы. */
  readonly postId: string;
  readonly likes: number;
  /** Отметил ли уже этот человек. Лента этого пока не знает — `false`. */
  readonly liked: boolean;
  /** Своё сообщение: сервер не даёт его отметить — кнопка выключена с подсказкой. */
  readonly mine: boolean;
  /** Число и при нуле — в подвале карточки ленты рядом со счётчиками. */
  readonly alwaysCount?: boolean;
}

/** Отказ сервера — его текст; «нельзя» на своё — понятной фразой, а не «недостаточно прав». */
function failureKey(error: unknown): MessageKey {
  return isAppError(error) && error.code === ERROR_CODES.FORBIDDEN
    ? 'forum.like.own'
    : errorMessageKey(error);
}

/**
 * «Нравится» со счётчиком — у сообщений форума и в подвале карточки ленты.
 *
 * Нажатие сразу красит сердце и меняет число, запрос идёт следом; отказ
 * возвращает как было и говорит почему. Гостю кнопка ведёт на вход и
 * возвращает сюда же. Своё сообщение не отмечается (так решает сервер) —
 * кнопка выключена, подсказка объясняет.
 */
export default function LikeButton({
  postId,
  likes,
  liked,
  mine,
  alwaysCount = false,
}: LikeButtonProps): ReactNode {
  const t = useT();
  const locale = useLocale();
  const location = useLocation();
  const signedIn = useSessionStore((state) => state.user !== null);
  const [state, setState] = useState({ likes, liked });
  const [error, setError] = useState<MessageKey | null>(null);
  const busy = useRef(false);
  const label = fill(t(state.liked ? 'forum.action.unlike' : 'forum.action.like'), {
    count: String(state.likes),
  });
  const text =
    state.likes > 0 || alwaysCount ? formatCount(state.likes, locale) : t('forum.action.likeShort');
  const icon = (
    <Heart
      size={16}
      aria-hidden
      fill={state.liked ? 'var(--red-500)' : 'none'}
      color={state.liked ? 'var(--red-500)' : 'currentColor'}
    />
  );
  const sx = {
    minHeight: 44,
    minWidth: 0,
    px: 1,
    color: state.liked ? 'var(--red-700)' : 'text.secondary',
    fontVariantNumeric: 'tabular-nums',
    '& .MuiButton-startIcon': { mr: 0.75 },
  } as const;

  if (mine) {
    return (
      <Tooltip title={t('forum.like.own')}>
        {/* Выключенная кнопка не ловит наведение — подсказку держит обёртка. */}
        <Box component="span" sx={{ display: 'inline-flex' }} data-forum-like-own>
          <Button
            variant="text"
            color="inherit"
            disabled
            aria-label={label}
            startIcon={icon}
            sx={{ ...sx, '&.Mui-disabled': { color: 'text.secondary' } }}
          >
            {text}
          </Button>
        </Box>
      </Tooltip>
    );
  }

  if (!signedIn) {
    return (
      <Tooltip title={t('forum.like.login')}>
        <Button
          variant="text"
          color="inherit"
          href={authHref('/login', location.href)}
          aria-label={label}
          startIcon={icon}
          sx={sx}
        >
          {text}
        </Button>
      </Tooltip>
    );
  }

  const toggle = (): void => {
    if (busy.current) return;
    busy.current = true;

    const previous = state;
    const next = !previous.liked;

    setError(null);
    setState({ liked: next, likes: Math.max(0, previous.likes + (next ? 1 : -1)) });
    setForumLike(postId, next)
      .then(setState)
      .catch((caught: unknown) => {
        setState(previous);
        setError(failureKey(caught));
      })
      .finally(() => {
        busy.current = false;
      });
  };

  return (
    <>
      <Button
        variant="text"
        color="inherit"
        aria-pressed={state.liked}
        aria-label={label}
        startIcon={icon}
        onClick={toggle}
        data-forum-like={state.liked}
        sx={sx}
      >
        {text}
      </Button>
      <Snackbar
        open={error !== null}
        autoHideDuration={5000}
        onClose={() => {
          setError(null);
        }}
        message={error === null ? '' : t(error)}
        // На телефоне внизу — панель разделов: сообщение над ней.
        sx={{ bottom: { xs: 88, sm: 24 } }}
      />
    </>
  );
}
