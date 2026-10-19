import { clubLocalTime, clubOpenStatus, type ClubHoursInterval } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import { useMemo, type ReactNode } from 'react';

import { fill, formatWeekday, useLocale, useT } from '@/common/i18n';

import { formatMinutes, weekdayDate } from './club-time';

/**
 * «Открыто до 23:00» / «Закрыто · откроется завтра в 08:00».
 *
 * Считает общий код (`clubOpenStatus`): та же функция пригодится серверу,
 * когда «открыто сейчас» станет фильтром списка (V2). Без часов метки нет
 * вовсе — «закрыто» было бы неправдой.
 */
export default function OpenStatus({
  hours,
  short = false,
  now,
}: {
  readonly hours: readonly ClubHoursInterval[];
  /** В карточке списка — без «откроется…»: место занято названием. */
  readonly short?: boolean;
  readonly now?: Date;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const status = useMemo(() => clubOpenStatus(hours, now ?? new Date()), [hours, now]);

  if (status.state === 'unknown') return null;

  const open = status.state === 'open';
  let text: string;

  if (status.state === 'open') {
    text = fill(t('club.open.until'), { time: formatMinutes(status.until) });
  } else if (short) {
    text = t('club.open.closed');
  } else {
    const time = formatMinutes(status.next.opensMin);
    const { inDays, opensMin } = status.next;
    const weekday = ((clubLocalTime(now ?? new Date()).weekday - 1 + inDays) % 7) + 1;

    text =
      inDays === 0
        ? fill(t('club.open.opensToday'), { time })
        : inDays === 1
          ? fill(t('club.open.opensTomorrow'), { time })
          : fill(t('club.open.opensOn'), {
              day: formatWeekday(weekdayDate(weekday), locale, 'short'),
              time: formatMinutes(opensMin),
            });
  }

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.25,
        height: 24,
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        bgcolor: open ? 'var(--ok-50)' : 'var(--ink-100)',
        color: open ? 'var(--ok-text)' : 'var(--ink-700)',
      }}
    >
      <Box
        component="span"
        aria-hidden
        sx={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          bgcolor: open ? 'var(--ok)' : 'var(--ink-400)',
        }}
      />
      {text}
    </Box>
  );
}
