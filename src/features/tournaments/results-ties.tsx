import type { TieGroupView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

interface ResultsTiesProps {
  readonly title: string;
  readonly ties: readonly TieGroupView[];
  readonly names: ReadonlyMap<string, string>;
}

/**
 * Участники, делящие места, — и в итоговых местах, и в групповой таблице.
 *
 * Секция не показывается пустой: у олимпийки с матчем за третье место делить
 * нечего, и пустой заголовок «Делят места» заставил бы искать, чего не хватает.
 * По ADR-008 неразрешённое равенство разводит судья, поэтому список читается
 * ещё и как перечень того, что осталось сделать.
 */
export default function ResultsTies({ title, ties, names }: ResultsTiesProps): ReactNode {
  if (ties.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h3">{title}</Typography>
      <Box
        component="ul"
        sx={{ listStyle: 'none', m: 0, mt: 1, p: 0, typography: 'body2', color: 'text.secondary' }}
      >
        {ties.map((tie) => (
          <Box component="li" key={tie.participants.join(',')} sx={{ py: 0.25 }}>
            <Box
              component="span"
              sx={{ fontWeight: 500, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}
            >
              {placesLabel(tie.places)}
            </Box>{' '}
            {tie.participants.map((id) => names.get(id) ?? id).join(', ')}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/** Диапазон мест: `[2, 3, 4]` показывается как «2–4», одиночное — числом. */
function placesLabel(places: readonly number[]): string {
  const first = places[0];
  const last = places.at(-1);

  if (first === undefined || last === undefined) {
    return '';
  }

  return first === last ? String(first) : `${String(first)}–${String(last)}`;
}
