import {
  CLUB_AMENITIES,
  type ClubAmenity,
  type ClubView,
  type FloorType,
  type UpdateClubInput,
} from '@kttf/shared/types';

export interface HallValues {
  readonly amenities: readonly ClubAmenity[];
  readonly tableBrand: string;
  readonly floorType: FloorType | '';
  readonly ceiling: string;
}

/** Правка зала — только изменённое; `null` — менять нечего. Потолок — `undefined`, если вписан криво. */
export function hallPatch(club: ClubView, values: HallValues): UpdateClubInput | null | undefined {
  const patch: UpdateClubInput & Record<string, unknown> = {};
  const amenities = CLUB_AMENITIES.filter((amenity) => values.amenities.includes(amenity));

  if (amenities.join() !== CLUB_AMENITIES.filter((a) => club.amenities.includes(a)).join()) {
    patch.amenities = amenities;
  }

  const brand = values.tableBrand.trim() === '' ? null : values.tableBrand.trim();
  if (brand !== club.tableBrand) patch.tableBrand = brand;

  const floor = values.floorType === '' ? null : values.floorType;
  if (floor !== club.floorType) patch.floorType = floor;

  const ceilingText = values.ceiling.trim();
  const ceiling = ceilingText === '' ? null : Number(ceilingText);
  if (ceiling !== null && (!Number.isInteger(ceiling) || ceiling < 200 || ceiling > 2000)) {
    return undefined;
  }
  if (ceiling !== club.ceilingHeightCm) patch.ceilingHeightCm = ceiling;

  return Object.keys(patch).length === 0 ? null : patch;
}
