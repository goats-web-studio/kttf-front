import type { ResultParticipantView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import PlayerAvatar from '@/common/ui/player-avatar';
import { playerName } from '@/features/players/player-name';

/** Призовые места и их медали. Порядок на пьедестале — 2, 1, 3. */
const MEDALS = {
  1: { fill: 'var(--gold)', tint: 'var(--gold-50)', text: 'var(--gold-text)', height: 96 },
  2: { fill: 'var(--silver)', tint: 'var(--silver-50)', text: 'var(--silver-text)', height: 72 },
  3: { fill: 'var(--bronze)', tint: 'var(--bronze-50)', text: 'var(--bronze-text)', height: 56 },
} as const;

type Medal = keyof typeof MEDALS;

const ORDER: readonly Medal[] = [2, 1, 3];

/** Призёры по местам: место может делиться (два третьих в олимпийке). */
function podiumPlaces(
  participants: readonly ResultParticipantView[],
): ReadonlyMap<Medal, readonly ResultParticipantView[]> {
  const places = new Map<Medal, ResultParticipantView[]>();

  for (const participant of participants) {
    const place = participant.place;
    if (place === 1 || place === 2 || place === 3) {
      places.set(place, [...(places.get(place) ?? []), participant]);
    }
  }

  return places;
}

/**
 * Пьедестал — призёры турнира крупно, с медалями.
 *
 * Первое, что ищут на странице сыгранного турнира, — кто победил. Таблица
 * мест под пьедесталом остаётся полной: пьедестал дублирует её верх, а не
 * заменяет — по таблице читают чтецы экрана и ищут себя остальные.
 */
export default function Podium({
  participants,
}: {
  readonly participants: readonly ResultParticipantView[];
}): ReactNode {
  const places = podiumPlaces(participants);

  if (!places.has(1)) {
    return null;
  }

  return (
    <Box
      aria-hidden
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        alignItems: 'end',
        gap: { xs: 1, sm: 2 },
        px: { xs: 1, sm: 4 },
        pt: { xs: 3, sm: 4 },
      }}
    >
      {ORDER.map((medal) => {
        const winners = places.get(medal) ?? [];
        const style = MEDALS[medal];

        return (
          <Box key={medal} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {winners.map((participant) => (
              <Box
                key={participant.player.id}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  mb: 1.5,
                  minWidth: 0,
                  maxWidth: '100%',
                }}
              >
                <PlayerAvatar
                  lastName={participant.player.lastName}
                  firstName={participant.player.firstName}
                  photoUrl={participant.player.photoUrl}
                  size={medal === 1 ? 'xl' : 'lg'}
                  ring={style.fill}
                />
                <Link
                  href={`/players/${participant.player.id}`}
                  tabIndex={-1}
                  sx={{
                    mt: 1.5,
                    fontWeight: 600,
                    fontSize: { xs: 13, sm: 15 },
                    lineHeight: 1.3,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {playerName(participant.player)}
                </Link>
              </Box>
            ))}
            <Box
              sx={{
                width: '100%',
                height: winners.length === 0 ? 24 : style.height,
                borderRadius: '12px 12px 0 0',
                bgcolor: style.tint,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              {winners.length > 0 && (
                <Typography
                  component="span"
                  sx={{
                    fontWeight: 700,
                    fontSize: medal === 1 ? 40 : 30,
                    lineHeight: 1,
                    color: style.text,
                  }}
                >
                  {medal}
                </Typography>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
