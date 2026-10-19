import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';

import { STALE_PUBLIC_DAYS, daysSince, freshnessWhen } from './club-time';

/**
 * «Информация обновлена N дней назад» — ADR-055. Вместо значка
 * «проверенный клуб»: проверены все клубы, а свежесть у всех разная.
 * Старше 90 дней — честное предупреждение игроку.
 */
export default function Freshness({
  reviewedAt,
}: {
  readonly reviewedAt: string | null;
}): ReactNode {
  const t = useT();
  const days = daysSince(reviewedAt);

  if (days === null) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t('club.fresh.never')}
      </Typography>
    );
  }

  return (
    <Typography variant="body2" color="text.secondary">
      {fill(t('club.fresh.updated'), { when: freshnessWhen(t, days) })}
      {days > STALE_PUBLIC_DAYS && (
        <Typography
          component="span"
          variant="body2"
          sx={{ display: 'block', color: 'var(--warn-text)' }}
        >
          {t('club.fresh.stale')}
        </Typography>
      )}
    </Typography>
  );
}
