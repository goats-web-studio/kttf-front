import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

import { cn } from './cn';

/**
 * Заготовка под содержимое — docs/07-design-system.md, раздел 7.
 *
 * Повторяет форму того, что придёт, а не крутит спиннер: страница не прыгает,
 * когда данные приходят, и видно, чего ждать. Пульсация глушится общим
 * правилом `prefers-reduced-motion` в `styles.css`.
 */
export function Skeleton({ className }: { readonly className?: string }): ReactNode {
  // `span`, а не `div`: заготовка встаёт и внутрь строки текста, где блок недопустим.
  return (
    <span aria-hidden className={cn('block animate-pulse rounded-xs bg-paper-hover', className)} />
  );
}

/** Строки списка или таблицы. Пять — по разделу 7. */
export function RowsSkeleton({ rows = 5 }: { readonly rows?: number }): ReactNode {
  const t = useT();

  return (
    <div role="status" aria-label={t('common.loading')} className="divide-y divide-line">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4 py-3">
          <Skeleton className="h-10 w-10 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-5 w-12" />
        </div>
      ))}
    </div>
  );
}
