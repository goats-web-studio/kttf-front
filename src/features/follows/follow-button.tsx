import type { FollowTarget } from '@kttf/shared/types';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from '@tanstack/react-router';
import { Check, Plus } from 'lucide-react';
import type { ReactNode } from 'react';

import { fill, formatCount, useLocale, useT } from '@/common/i18n';
import { authHref } from '@/features/auth/redirect';
import { useSessionStore } from '@/features/auth/session-store';
import { feedKeys } from '@/features/feed/queries';

import { setFollow } from './api';
import { followKeys, followStateQuery } from './queries';

interface FollowButtonProps {
  readonly type: FollowTarget;
  readonly id: string;
  /** Без счётчика рядом — в строке рекомендаций, где он уже написан. */
  readonly bare?: boolean;
  /** Тёмная подложка — шапка тренера и клуба. */
  readonly tone?: 'light' | 'night';
}

/**
 * «Подписаться» — ADR-073. Гостя ведёт на вход и возвращает сюда же:
 * подписка без аккаунта некуда записать. После нажатия обновляются лента
 * и рекомендации — подписка сразу меняет «Подписки».
 */
export default function FollowButton({
  type,
  id,
  bare = false,
  tone = 'light',
}: FollowButtonProps): ReactNode {
  const t = useT();
  const locale = useLocale();
  const location = useLocation();
  const queryClient = useQueryClient();
  const signedIn = useSessionStore((state) => state.user !== null);
  const state = useQuery(followStateQuery(type, id, signedIn));
  const following = state.data?.following ?? false;

  const toggle = useMutation({
    mutationFn: () => setFollow(type, id, !following),
    onSuccess: (next) => {
      queryClient.setQueryData(followKeys.state(type, id, true), next);
      void queryClient.invalidateQueries({ queryKey: followKeys.all });
      void queryClient.invalidateQueries({ queryKey: feedKeys.all });
    },
  });

  const night = tone === 'night';
  const label = t(following ? 'follow.on' : 'follow.off');
  const action = signedIn
    ? {
        onClick: () => {
          toggle.mutate();
        },
      }
    : { href: authHref('/login', location.href) };

  // В строке рекомендаций — квадратная кнопка со знаком: широкая «Подписаться»
  // съедала имя в узкой колонке. Подпись — для чтения с экрана и подсказкой.
  if (bare) {
    return (
      <IconButton
        {...action}
        aria-label={label}
        title={label}
        data-follow={following ? 'on' : 'off'}
        disabled={toggle.isPending || (signedIn && state.data === undefined)}
        sx={{
          width: 36,
          height: 36,
          flexShrink: 0,
          borderRadius: 2,
          border: '1px solid',
          borderColor: following ? 'var(--line-strong)' : 'var(--red-600)',
          bgcolor: following ? 'transparent' : 'var(--red-600)',
          color: following ? 'text.secondary' : 'var(--paper)',
          '&:hover': { bgcolor: following ? 'var(--paper-hover)' : 'var(--red-700)' },
        }}
      >
        {following ? <Check size={18} aria-hidden /> : <Plus size={18} aria-hidden />}
      </IconButton>
    );
  }

  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
      <Button
        data-follow={following ? 'on' : 'off'}
        variant={following ? 'outlined' : 'contained'}
        size="small"
        disabled={toggle.isPending || (signedIn && state.data === undefined)}
        startIcon={following ? <Check size={16} aria-hidden /> : <Plus size={16} aria-hidden />}
        {...action}
        sx={{
          minHeight: 36,
          whiteSpace: 'nowrap',
          ...(night && following
            ? { color: 'var(--night-ink-900)', borderColor: 'var(--night-line-strong)' }
            : {}),
        }}
      >
        {label}
      </Button>
      {state.data !== undefined && state.data.followers > 0 && (
        <Typography
          variant="body2"
          sx={{ color: night ? 'var(--night-ink-500)' : 'text.secondary', whiteSpace: 'nowrap' }}
          data-followers
        >
          {fill(t('follow.followers'), { count: formatCount(state.data.followers, locale) })}
        </Typography>
      )}
    </Stack>
  );
}
