import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

import { clubRoleKey } from './labels';

/**
 * Название роли в клубе.
 *
 * В контракте ТС 7.1 роль осталась строкой, а не перечнем, поэтому значение
 * приходится сверять с известными. Неизвестное показывается как есть: молча
 * подставленная чужая роль хуже непереведённого слова.
 */
export default function RoleName({ role }: { readonly role: string }): ReactNode {
  const t = useT();
  const key = clubRoleKey(role);

  return key === undefined ? role : t(key);
}
