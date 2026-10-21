import { nextSession, type TrainingEnrollment, type TrainingSlot } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import { Clock } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';

import { useLocale, useT } from '@/common/i18n';
import { useNow } from '@/features/console/use-now';

import { Badge } from './coach-cards';
import { ENROLLMENT_KEYS, ENROLLMENT_TONES, nextSessionText } from './schedule';

/** Раз в минуту: «ближайшее» меняется не чаще, а на каждый рендер считать незачем. */
const MINUTE = 60_000;

/**
 * «Ближайшее: сегодня в 18:00» по слотам и UTC+5 (`nextSession`). Без
 * расписания по дням — ничего.
 */
export function NextSession({ slots }: { readonly slots: readonly TrainingSlot[] }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const now = useNow(MINUTE);
  // Минута — шаг таймера: пока она та же, ближайшее не пересчитывается.
  const minute = Math.floor(now / MINUTE);
  const next = useMemo(() => nextSession(slots, new Date(minute * MINUTE)), [slots, minute]);

  if (next === null) return null;

  return (
    <Box
      component="span"
      data-next-session={next.inDays}
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
    >
      <Clock size={14} aria-hidden style={{ flexShrink: 0 }} />
      {nextSessionText(next, t, locale)}
    </Box>
  );
}

/** Метка набора: «Есть места», «Мало мест», «Набор закрыт»; не указан — нет метки. */
export function EnrollmentBadge({
  enrollment,
}: {
  readonly enrollment: TrainingEnrollment | null;
}): ReactNode {
  const t = useT();

  if (enrollment === null) return null;

  return (
    <Badge tone={ENROLLMENT_TONES[enrollment]}>
      <span data-enrollment={enrollment}>{t(ENROLLMENT_KEYS[enrollment])}</span>
    </Badge>
  );
}
