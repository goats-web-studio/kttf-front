import type { MessageKey } from '@/common/i18n';

/**
 * Подписи анкеты: рука и хват. Нужны и кабинету, и публичному профилю.
 * Незнакомое значение показывается как есть — так оно хотя бы видно.
 */

export function handLabel(value: string | null, t: (key: MessageKey) => string): string | null {
  if (value === 'RIGHT') return t('player.hand.RIGHT');
  if (value === 'LEFT') return t('player.hand.LEFT');

  return value;
}

export function gripLabel(value: string | null, t: (key: MessageKey) => string): string | null {
  if (value === 'SHAKEHAND') return t('player.grip.SHAKEHAND');
  if (value === 'PENHOLD') return t('player.grip.PENHOLD');

  return value;
}
