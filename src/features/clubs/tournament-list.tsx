import type { ClubView, TournamentView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

import TournamentCard from '@/features/tournaments/tournament-card';

interface TournamentListProps {
  readonly tournaments: readonly TournamentView[];
  readonly club: ClubView | undefined;
  /** Клуб своего турнира — когда в списке турниры разных клубов (кабинет). */
  readonly clubOf?: (tournament: TournamentView) => ClubView | undefined;
  /**
   * Действие рядом с карточкой — консоль у идущего турнира в кабинете.
   * Стоит отдельно, а не внутри: карточка целиком ссылка, и вложенная в
   * неё кнопка была бы ссылкой внутри ссылки.
   */
  readonly action?: (tournament: TournamentView) => ReactNode;
}

/** Турниры клуба строками календаря — та же карточка, что и в календаре. */
export default function TournamentList({
  tournaments,
  club,
  clubOf,
  action,
}: TournamentListProps): ReactNode {
  return (
    <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1.5 }}>
      {tournaments.map((tournament) => {
        const extra = action?.(tournament);

        return (
          <Box
            component="li"
            key={tournament.id}
            sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <TournamentCard tournament={tournament} club={clubOf?.(tournament) ?? club} />
            </Box>
            {extra !== undefined && extra !== null && <Box sx={{ flexShrink: 0 }}>{extra}</Box>}
          </Box>
        );
      })}
    </Box>
  );
}
