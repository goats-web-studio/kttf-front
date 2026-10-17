import type { CityRef } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import { usePlaceName } from '@/features/places/place-name';
import LeadersTable from '@/features/players/leaders-table';

/** Сколько лидеров на главной. Полный список — в рейтинге. */
const TOP = 10;

interface TopPlayersProps {
  /** Выбранный город по `id`; `undefined` — вся страна. Живёт в адресе главной. */
  readonly city: string | undefined;
  /** Города, в которых есть клубы, — из справочника клубов. */
  readonly cities: readonly CityRef[];
  readonly onCity: (city: string | undefined) => void;
}

/**
 * Лидеры рейтинга — ТЗ 9.1, срез для главной.
 *
 * Порядок задаёт сервер, как и в полном рейтинге. Переключатель города —
 * чипы, а не список: городов с клубами немного, и все видны сразу.
 */
export default function TopPlayers({ city, cities, onCity }: TopPlayersProps): ReactNode {
  const t = useT();
  const placeName = usePlaceName();

  return (
    <Box>
      {cities.length > 1 && (
        <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap', mb: 2 }}>
          <Chip
            label={t('home.top.country')}
            color={city === undefined ? 'primary' : 'default'}
            variant={city === undefined ? 'filled' : 'outlined'}
            onClick={() => {
              onCity(undefined);
            }}
          />
          {cities.map((item) => (
            <Chip
              key={item.id}
              label={placeName(item)}
              color={city === item.id ? 'primary' : 'default'}
              variant={city === item.id ? 'filled' : 'outlined'}
              onClick={() => {
                onCity(item.id);
              }}
            />
          ))}
        </Stack>
      )}

      <LeadersTable
        query={{ page: 1, limit: TOP, ...(city === undefined ? {} : { cityId: city }) }}
        empty={t('ratings.empty')}
      />
    </Box>
  );
}
