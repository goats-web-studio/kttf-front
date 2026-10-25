import type { AuthUserView } from '@kttf/shared/types';
import { useQueries, useQuery } from '@tanstack/react-query';

import { clubDirectoryQuery, clubQuery } from '@/features/clubs/queries';

export interface MyClub {
  readonly id: string;
  /** `null`, пока клуб не пришёл. */
  readonly name: string | null;
  readonly role: AuthUserView['clubRoles'][number]['role'];
  /** Клуб скрыт администратором: в справочнике его нет, владельцу виден с пометкой. */
  readonly hidden: boolean;
}

/**
 * Клубы вошедшего с названиями. Справочник отдаёт только видимые, поэтому
 * скрытый клуб дочитывается по одному: иначе владелец видел бы вместо
 * названия идентификатор.
 */
export function useMyClubs(user: AuthUserView): readonly MyClub[] {
  const directory = useQuery(clubDirectoryQuery);
  const missing =
    directory.data === undefined
      ? []
      : user.clubRoles
          .map((role) => role.clubId)
          .filter((id) => !directory.data.has(id))
          .filter((id, index, all) => all.indexOf(id) === index);
  const extra = useQueries({ queries: missing.map((id) => clubQuery(id)) });
  const fetched = new Map(
    extra.flatMap((query) => (query.data === undefined ? [] : [[query.data.id, query.data]])),
  );

  return user.clubRoles.map((role) => {
    const listed = directory.data?.get(role.clubId);
    const loose = fetched.get(role.clubId);

    return {
      id: role.clubId,
      name: listed?.name ?? loose?.name ?? null,
      role: role.role,
      hidden: listed === undefined && loose !== undefined,
    };
  });
}
