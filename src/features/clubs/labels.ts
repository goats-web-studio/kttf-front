import { clubRoleSchema, type ClubRole } from '@kttf/shared/types';

import type { MessageKey } from '@/common/i18n';

/**
 * Роли в клубе — в тексты интерфейса.
 *
 * Тип `Record` обязывает перечислить все: новая роль в общем коде ломает
 * сборку здесь, а не выходит к человеку английской строкой из базы. Тот же
 * приём, что и у перечислений турнира.
 */
export const CLUB_ROLE_KEYS: Readonly<Record<ClubRole, MessageKey>> = {
  OWNER: 'club.role.OWNER',
  ORGANIZER: 'club.role.ORGANIZER',
  REFEREE: 'club.role.REFEREE',
};

/**
 * Ключ названия роли по значению из ответа.
 *
 * В ответах ТС 7.1 роль осталась строкой, а не перечнем, поэтому значение
 * сверяется со схемой общего кода, а не подставляется в `Record` напрямую.
 * `undefined` означает роль, которой интерфейс не знает: показать её как есть
 * честнее, чем молча выдать за одну из известных.
 */
export function clubRoleKey(role: string): MessageKey | undefined {
  const parsed = clubRoleSchema.safeParse(role);

  return parsed.success ? CLUB_ROLE_KEYS[parsed.data] : undefined;
}
