import type { ReactNode } from 'react';

import { cn } from './cn';

interface EmptyStateProps {
  readonly title: string;
  readonly text?: string;
  /** Что сделать дальше: сбросить фильтр, найти турнир. */
  readonly action?: ReactNode;
  /** Ошибка отличается композицией, а не только текстом (раздел 3.4). */
  readonly tone?: 'neutral' | 'error';
  readonly className?: string;
}

/**
 * Пустое место на экране — docs/07-design-system.md, раздел 7.
 *
 * Одна форма на три состояния: «пусто», «ничего не найдено» и «ошибка».
 * Первые два различаются текстом и действием, а не видом: человеку важно,
 * что произошло и что делать. Ошибка выделена композицией раздела 3.4 —
 * фон `--red-50`, левая линейка `--red-700`: красный в системе занят
 * брендом, и одним цветом текста ошибку от акцента не отличить.
 *
 * Не «Нет данных», а объяснение и действие. Иконки нет, пока в проекте нет
 * набора иконок (раздел 2.2): случайный символ здесь хуже пустоты.
 */
export default function EmptyState({
  title,
  text,
  action,
  tone = 'neutral',
  className,
}: EmptyStateProps): ReactNode {
  const error = tone === 'error';

  return (
    <div
      role={error ? 'alert' : undefined}
      className={cn(
        'px-6 py-12 text-center',
        error
          ? 'rounded-sm border-l-3 border-red-700 bg-red-50'
          : 'rounded-md border border-dashed border-line-strong',
        className,
      )}
    >
      <p className={cn('font-medium', error ? 'text-red-700' : 'text-ink-900')}>{title}</p>
      {text !== undefined && <p className="mx-auto mt-2 max-w-md text-ink-700">{text}</p>}
      {action !== undefined && <div className="mt-6 flex justify-center gap-3">{action}</div>}
    </div>
  );
}
