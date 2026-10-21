import type { RegistrationCoach } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

/** Имя тренера — ссылкой, если у него опубликована страница. */
export function CoachName({ coach }: { readonly coach: RegistrationCoach }): ReactNode {
  return coach.slug === null ? (
    coach.name
  ) : (
    <Link href={`/coaches/${coach.slug}`} color="inherit">
      {coach.name}
    </Link>
  );
}

/**
 * «тренер X» под именем участника — мелко и вторым цветом (ADR-059, T3):
 * подпись к игроку, а не отдельная колонка. Без тренера — ничего.
 */
export default function CoachNote({
  coach,
}: {
  readonly coach: RegistrationCoach | null;
}): ReactNode {
  const t = useT();

  if (coach === null) return null;

  return (
    <Box
      data-registration-coach
      sx={{ typography: 'caption', color: 'text.secondary', fontWeight: 400 }}
    >
      {t('participants.coach')} <CoachName coach={coach} />
    </Box>
  );
}
