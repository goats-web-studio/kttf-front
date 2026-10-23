import type { TournamentView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';

/** Целые очки планки: «300», а не «300.00» — в плашке шириной в три цифры. */
function points(value: string): string {
  return value.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

/**
 * Планка рейтинга плашкой, как у RTTF: «отк» — открытый турнир, «300» —
 * потолок рейтинга, «150+» — только нижняя граница. Плашка нейтральная:
 * красный занят действием (07, 1.3), а планку читают как метку рядом со
 * временем, не как сигнал. Полный смысл — в подписи для чтеца и подсказке.
 */
export default function RatingCapBadge({
  tournament,
}: {
  readonly tournament: Pick<TournamentView, 'ratingCapMax' | 'ratingCapMin'>;
}): ReactNode {
  const t = useT();
  const { ratingCapMax: max, ratingCapMin: min } = tournament;

  const [text, label] =
    max !== null
      ? [points(max), fill(t('tournaments.cap.max'), { cap: points(max) })]
      : min !== null
        ? [`${points(min)}+`, fill(t('tournaments.cap.min'), { cap: points(min) })]
        : [t('tournaments.cap.open'), t('tournaments.cap.openFull')];

  return (
    <Box
      component="span"
      title={label}
      aria-label={label}
      data-rating-cap={max ?? (min === null ? 'open' : `${min}+`)}
      sx={{
        display: 'inline-grid',
        placeItems: 'center',
        minWidth: 34,
        height: 20,
        px: 0.75,
        borderRadius: 1.5,
        bgcolor: max === null && min === null ? 'var(--ink-100)' : 'var(--ink-700)',
        color: max === null && min === null ? 'var(--ink-700)' : 'var(--paper)',
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
        flexShrink: 0,
      }}
    >
      {text}
    </Box>
  );
}
