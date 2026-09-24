import type { ComponentProps, ReactNode } from 'react';

import { cn } from './cn';

/**
 * Поле формы и фильтра — docs/07-design-system.md, 5.1.
 *
 * Контролы родные, `<input>` и `<select>`, а не Radix: на телефоне родной
 * список открывает системное колесо, привычное человеку, а в бандл не
 * приходит ни байта. Своё выпадающее меню заводится, когда в нём понадобится
 * поиск (Combobox), — не раньше.
 *
 * Высота 44px на телефоне — нижняя граница зоны нажатия (раздел 9), от 640px
 * — 40px, размер `md` кнопки: поле и кнопка в одном ряду стоят вровень.
 * Плейсхолдер `--ink-500`, а не `--ink-400`: у того 3.29:1, это не текст.
 */
const control =
  'h-11 w-full rounded-sm border border-line-strong bg-paper px-3 text-base text-ink-900 sm:h-10 ' +
  'transition-colors duration-(--dur-fast) placeholder:text-ink-500 ' +
  'hover:border-ink-500 disabled:bg-paper-hover disabled:text-ink-500';

export function Input({ className, ...props }: ComponentProps<'input'>): ReactNode {
  return <input className={cn(control, className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<'select'>): ReactNode {
  return <select className={cn(control, 'pr-8', className)} {...props} />;
}

interface FieldProps {
  readonly label: string;
  readonly className?: string;
  readonly children: ReactNode;
}

/** Подпись над контролом. Подпись всегда видна: плейсхолдер её не заменяет. */
export function Field({ label, className, children }: FieldProps): ReactNode {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1 block text-sm text-ink-700">{label}</span>
      {children}
    </label>
  );
}
