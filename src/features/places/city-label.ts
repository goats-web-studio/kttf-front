import { useQuery } from '@tanstack/react-query';

import { useT } from '@/common/i18n';

import { usePlaceName } from './place-name';
import { citiesQuery, regionsQuery } from './queries';

/**
 * Подпись города или области по идентификатору — для чипа фильтра из адреса.
 *
 * Адрес несёт только `id`, и в фильтре это город или область целиком
 * (ADR-096) — область подписывается своим названием. Записи нет в открытом
 * справочнике — она скрыта или ссылку поправили руками: фильтр при этом
 * действует, и чип об этом говорит, а не пишет идентификатор.
 */
export function useCityLabel(): (cityId: string) => string {
  const t = useT();
  const placeName = usePlaceName();
  const cities = useQuery(citiesQuery);
  const regions = useQuery(regionsQuery);

  return (cityId) => {
    if (cities.data === undefined) return t('common.loading');

    const city = cities.data.find((item) => item.id === cityId);
    if (city !== undefined) return placeName(city);

    const region = regions.data?.find((item) => item.id === cityId);
    if (region !== undefined) return placeName(region);
    if (regions.isPending) return t('common.loading');

    return t('places.city.unknown');
  };
}
