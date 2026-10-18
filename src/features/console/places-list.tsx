import type { ResultParticipantView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

/** Цвет кружка с местом у призёров — те же токены, что у пьедестала на сайте. */
const MEDAL: Readonly<Record<number, { readonly fill: string; readonly text: string }>> = {
  1: { fill: 'var(--gold)', text: 'var(--ink-900)' },
  2: { fill: 'var(--silver)', text: 'var(--ink-900)' },
  3: { fill: 'var(--bronze)', text: 'var(--ink-900)' },
};

interface PlacesListProps {
  /** Порядок задаёт сервер: занявшие места по возрастанию, затем прочие (ADR-023). */
  readonly participants: readonly ResultParticipantView[];
  /** Сколько строк показать; без него — все. */
  readonly limit?: number;
}

/**
 * Итоговые места строками — в окне завершения и в панели завершённого турнира.
 *
 * Свой список, а не таблица мест публичной страницы: из консоли нельзя
 * импортировать фичи сайта (ADR-004), и судье здесь нужны место и фамилия,
 * а не посев с примечаниями.
 */
export default function PlacesList({ participants, limit }: PlacesListProps): ReactNode {
  const t = useT();
  const rows = limit === undefined ? participants : participants.slice(0, limit);

  return (
    <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none' }}>
      {rows.map((participant, index) => {
        const medal = participant.place === null ? undefined : MEDAL[participant.place];

        return (
          <Box
            key={participant.player.id}
            component="li"
            sx={{
              display: 'grid',
              gridTemplateColumns: '32px minmax(0, 1fr)',
              alignItems: 'center',
              gap: 1.5,
              py: 1,
              borderTop: index === 0 ? 0 : 1,
              borderColor: 'divider',
            }}
          >
            <Box
              component="span"
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: 14,
                bgcolor: medal?.fill ?? 'transparent',
                color:
                  medal?.text ?? (participant.place === null ? 'text.disabled' : 'text.primary'),
              }}
            >
              {participant.place ?? '—'}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Box
                component="span"
                sx={{
                  display: 'block',
                  fontWeight: medal === undefined ? 500 : 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {participant.player.lastName} {participant.player.firstName}
              </Box>
              {participant.place === null && (
                <Box component="span" sx={{ typography: 'caption', color: 'text.secondary' }}>
                  {t(
                    participant.reason === 'GROUP_EXIT'
                      ? 'console.places.groupExit'
                      : 'console.places.undecided',
                  )}
                </Box>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
