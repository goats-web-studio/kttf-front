import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from './cn';

/**
 * Кнопка — docs/07-design-system.md, раздел 5.1.
 *
 * Вариантов ровно четыре, и пятый не заводится: как только их становится
 * шесть, выбор перестаёт нести смысл и превращается во вкусовщину.
 *
 * **Умолчание — `secondary`, а не `primary`.** Главное действие на экране
 * одно (запрет №2), и оно называется явно. Умолчание, красящее кнопку в
 * заливку, привело бы к трём главным действиям на экране по недосмотру.
 *
 * Размер `console` — 56px, минимальная зона нажатия в консоли судьи: судья
 * стоит, держит телефон одной рукой и повторяет действие 50–80 раз за вечер.
 */
const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-sm font-medium ' +
    'transition-colors duration-(--dur-fast) disabled:pointer-events-none disabled:opacity-60',
  {
    variants: {
      variant: {
        primary: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-700',
        secondary: 'border border-line-strong bg-paper text-ink-900 hover:bg-paper-hover',
        ghost: 'text-ink-700 hover:bg-paper-hover',
        destructive: 'border border-red-700 bg-paper text-red-700 hover:bg-red-50',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4',
        lg: 'h-12 px-5',
        console: 'min-h-14 px-5',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof button> & {
    /** Отрисовать своим потомком: ссылка, ведущая себя как кнопка. */
    readonly asChild?: boolean;
  };

export default function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps): ReactNode {
  const Component = asChild ? Slot : 'button';

  return <Component className={cn(button({ variant, size }), className)} {...props} />;
}
