import { useQuery } from '@tanstack/react-query';

import { useT } from '@/common/i18n';

import { usePlaceName } from './place-name';
import { citiesQuery } from './queries';

/**
 * Подпись города по идентификатору — для чипа фильтра из адреса.
 *
 * Адрес несёт только `id`. Города нет в открытом справочнике — он скрыт или
 * ссылку поправили руками: фильтр при этом действует, и чип об этом говорит,
 * а не пишет идентификатор.
 */
export function useCityLabel(): (cityId: string) => string {
  const t = useT();
  const placeName = usePlaceName();
  const cities = useQuery(citiesQuery);

  return (cityId) => {
    if (cities.data === undefined) return t('common.loading');

    const city = cities.data.find((item) => item.id === cityId);

    return city === undefined ? t('places.city.unknown') : placeName(city);
  };
}
