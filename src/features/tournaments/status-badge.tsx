import type { TournamentStatus } from '@kttf/shared/types';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import { cn } from '@/common/ui/cn';

import { TOURNAMENT_STATUS_KEYS } from './labels';

/**
 * Цвет точки по состоянию.
 *
 * Смысл несёт подпись, точка только помогает глазу пробежать календарь
 * (запрет №6: цвет не единственный носитель). Выделены два состояния, ради
 * которых календарь и открывают: «можно записаться» и «идёт сейчас».
 * Остальные приглушены — прошедший турнир не должен спорить с ближайшим.
 */
const DOT: Readonly<Record<TournamentStatus, string>> = {
  DRAFT: 'bg-warn',
  PUBLISHED: 'bg-ink-400',
  REG_OPEN: 'bg-ok',
  REG_CLOSED: 'bg-ink-400',
  RUNNING: 'bg-red-600',
  FINISHED: 'bg-ink-300',
  RATED: 'bg-ink-300',
  CANCELLED: 'bg-ink-300',
};

const MUTED: ReadonlySet<TournamentStatus> = new Set(['FINISHED', 'RATED', 'CANCELLED']);

/** Состояние турнира — docs/07-design-system.md, 5.2, `TournamentStatusBadge`. */
export default function StatusBadge({ status }: { readonly status: TournamentStatus }): ReactNode {
  const t = useT();

  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-xs border border-line px-2 text-xs',
        MUTED.has(status) ? 'text-ink-500' : 'font-medium text-ink-900',
      )}
    >
      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', DOT[status])} />
      {t(TOURNAMENT_STATUS_KEYS[status])}
    </span>
  );
}
