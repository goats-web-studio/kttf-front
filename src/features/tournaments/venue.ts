import type { ClubView } from '@kttf/shared/types';

import { usePlaceName } from '@/features/places/place-name';

/** Адрес клуба с городом: «Абая 10, Алматы». Общий со списком (ADR-094). */
export function useVenue(): (club: ClubView) => string {
  const placeName = usePlaceName();

  return (club) => [club.address, placeName(club.city)].filter(Boolean).join(', ');
}
