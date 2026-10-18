import type { TournamentListItemView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import { User } from 'lucide-react';
import type { ReactNode } from 'react';

import { fill, formatTime, useLocale, useT } from '@/common/i18n';
import { VISUALLY_HIDDEN } from '@/common/ui/visually-hidden';

/** Цифры столбиком — одной ширины (07, 3.5). */
const NUM = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } as const;

/** Время старта моноширинным: в столбце часы встают ровно друг под другом. */
export function StartTime({ startsAt }: { readonly startsAt: string }): ReactNode {
  const locale = useLocale();

  return (
    <Box
      component="span"
      sx={{ ...NUM, fontFamily: 'var(--font-mono)', color: 'text.secondary', flexShrink: 0 }}
    >
      {formatTime(startsAt, locale)}
    </Box>
  );
}

/**
 * Название турнира ссылкой. Отменённый — зачёркнут и приглушён, как у RTTF;
 * идущий — с красной точкой: одна яркая деталь на строку (07, 1.5). Статус
 * ещё и словом для чтеца — цвет и черта не единственные носители (07, 9).
 */
export function TournamentName({
  tournament,
}: {
  readonly tournament: Pick<TournamentListItemView, 'id' | 'name' | 'status'>;
}): ReactNode {
  const t = useT();
  const cancelled = tournament.status === 'CANCELLED';
  const live = tournament.status === 'RUNNING';

  return (
    <Link
      href={`/tournaments/${tournament.id}`}
      color="inherit"
      sx={{
        minWidth: 0,
        fontWeight: 500,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        ...(cancelled ? { color: 'var(--ink-400)', textDecoration: 'line-through' } : {}),
      }}
    >
      {live && (
        <Box
          component="span"
          aria-hidden
          sx={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            bgcolor: 'var(--red-500)',
            flexShrink: 0,
          }}
        />
      )}
      <span>{tournament.name}</span>
      {(cancelled || live) && (
        <Box component="span" sx={VISUALLY_HIDDEN}>
          {` (${t(cancelled ? 'tournament.status.CANCELLED' : 'tournament.status.RUNNING')})`}
        </Box>
      )}
    </Link>
  );
}

/** Участники: «11» или «5/48», если у турнира есть лимит и он ещё не начат. */
export function Participants({
  tournament,
}: {
  readonly tournament: Pick<
    TournamentListItemView,
    'participantCount' | 'maxParticipants' | 'status'
  >;
}): ReactNode {
  const t = useT();
  const open = ['PUBLISHED', 'REG_OPEN', 'REG_CLOSED'].includes(tournament.status);
  const count =
    open && tournament.maxParticipants !== null
      ? `${String(tournament.participantCount)}/${String(tournament.maxParticipants)}`
      : String(tournament.participantCount);

  return (
    <Box
      component="span"
      aria-label={fill(t('tournaments.participants'), { count })}
      sx={{
        ...NUM,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.25,
        color: 'text.secondary',
      }}
    >
      <User size={13} aria-hidden />
      <span aria-hidden>{count}</span>
    </Box>
  );
}
