import type { AuthUserView, ClubRole } from '@kttf/shared/types';

/**
 * Роли, которые ведут клуб и его турниры — ADR-014.
 *
 * Судьи здесь нет: по ТЗ 1 его доступ ограничен консолью конкретного турнира.
 * Список один на весь интерфейс, потому что то же правило проверяет сервер
 * (ТС 8.3), и два его описания разошлись бы при первой же новой роли.
 */
const STAFF_ROLES: readonly ClubRole[] = ['OWNER', 'ORGANIZER'];

/**
 * Роль в сессии приходит строкой, а не перечнем (ТС 7.1), поэтому сравнение
 * идёт через `some`: сам список при этом остаётся типизированным, и
 * переименованная роль ломает сборку здесь, а не молча теряет права.
 */
function isStaffRole(role: string): boolean {
  return STAFF_ROLES.some((staff) => staff === role);
}

/**
 * Клубы, которыми человек управляет.
 *
 * Пусто — заводить турнир не от чьего имени: клуб-хозяин обязателен (ТЗ 4.2).
 */
export function managedClubIds(user: AuthUserView | null): readonly string[] {
  return (user?.clubRoles ?? [])
    .filter((role) => isStaffRole(role.role))
    .map((role) => role.clubId);
}

/**
 * Управляет ли человек клубом.
 *
 * Здесь это решает только, показывать ли органы управления. Отказ всё равно
 * придёт с сервера, если правило разойдётся.
 */
export function isClubStaff(user: AuthUserView | null, clubId: string): boolean {
  return managedClubIds(user).includes(clubId);
}
