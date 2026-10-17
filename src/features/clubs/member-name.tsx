import type { ClubMemberView } from '@kttf/shared/types';
import Link from '@mui/material/Link';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

/**
 * Имя участника состава клуба.
 *
 * Человек без профиля игрока показывается как есть: в составе он нужен, а
 * имени, кроме как из анкеты, у аккаунта нет.
 */
export default function MemberName({ member }: { readonly member: ClubMemberView }): ReactNode {
  const t = useT();
  const name = member.name ?? t('club.staff.noProfile');

  return member.playerId === null ? (
    name
  ) : (
    <Link href={`/players/${member.playerId}`} color="text.primary">
      {name}
    </Link>
  );
}
