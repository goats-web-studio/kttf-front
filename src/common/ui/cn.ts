import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Склейка классов для компонентов из shadcn/ui.
 *
 * `twMerge` нужен не ради красоты: без него `className` со стороны вызова
 * не побеждает класс варианта, а встаёт рядом — и `px-6` рядом с `px-4`
 * разрешает браузер по порядку в таблице стилей, а не по намерению автора.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
