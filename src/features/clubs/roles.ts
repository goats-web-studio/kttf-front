import type { AuthUserView } from '@kttf/shared/types';

/**
 * Управляет ли человек клубом — ADR-014.
 *
 * Владелец и организатор ведут клуб и его турниры, судья — нет: по ТЗ 1 его
 * доступ ограничен консолью конкретного турнира. То же правило проверяет
 * сервер (ТС 8.3); здесь оно решает только, показывать ли органы управления.
 * Отказ всё равно придёт с сервера, если разойдётся.
 */
export function isClubStaff(user: AuthUserView | null, clubId: string): boolean {
  return (
    user?.clubRoles.some(
      (role) => role.clubId === clubId && (role.role === 'OWNER' || role.role === 'ORGANIZER'),
    ) ?? false
  );
}
