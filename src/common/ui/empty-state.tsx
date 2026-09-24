import type { ReactNode } from 'react';

import { cn } from './cn';

interface EmptyStateProps {
  readonly title: string;
  readonly text?: string;
  /** Что сделать дальше: сбросить фильтр, найти турнир. */
  readonly action?: ReactNode;
  readonly role?: 'alert';
  readonly className?: string;
}

/**
 * Пустое место на экране — docs/07-design-system.md, раздел 7.
 *
 * Одна форма на три состояния: «пусто», «ничего не найдено» и «ошибка».
 * Различаются они текстом и действием, а не видом: человеку важно, что
 * произошло и что делать, а не третья картинка.
 *
 * Не «Нет данных», а объяснение и действие. Иконки нет, пока в проекте нет
 * набора иконок (раздел 2.2): случайный символ здесь хуже пустоты.
 */
export default function EmptyState({
  title,
  text,
  action,
  role,
  className,
}: EmptyStateProps): ReactNode {
  return (
    <div
      role={role}
      className={cn(
        'rounded-md border border-dashed border-line-strong px-6 py-12 text-center',
        className,
      )}
    >
      <p className="font-medium text-ink-900">{title}</p>
      {text !== undefined && <p className="mx-auto mt-2 max-w-md text-ink-700">{text}</p>}
      {action !== undefined && <div className="mt-6 flex justify-center gap-3">{action}</div>}
    </div>
  );
}
