import type { ClubAmenity } from '@kttf/shared/types';
import {
  CircleParking,
  Coffee,
  Shirt,
  ShoppingBag,
  ShowerHead,
  Snowflake,
  Wifi,
  type LucideIcon,
} from 'lucide-react';

import type { MessageKey } from '@/common/i18n';

/** Иконка и подпись удобства — одни и те же на странице, в карточке и в фильтре. */
export const AMENITY_ICONS: Readonly<Record<ClubAmenity, LucideIcon>> = {
  AIR_CONDITIONING: Snowflake,
  SHOWER: ShowerHead,
  PARKING: CircleParking,
  LOCKER_ROOM: Shirt,
  WIFI: Wifi,
  CAFE: Coffee,
  SHOP: ShoppingBag,
};

export const amenityLabel = (amenity: ClubAmenity): MessageKey => `club.amenity.${amenity}`;
