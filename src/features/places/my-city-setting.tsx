import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { useT } from '@/common/i18n';

import CityPicker from './city-picker';
import { useMyCity, useSetMyCity } from './my-city';
import { citiesQuery } from './queries';

/**
 * «Мой город» в настройках аккаунта — ADR-093.
 *
 * Тот же город, что в шапке: меняется здесь — меняется и там. Сохраняется
 * сразу при выборе, без кнопки (ADR-040): поле одно, и ждать от человека
 * второго нажатия незачем.
 */
export default function MyCitySetting(): ReactNode {
  const t = useT();
  const myCity = useMyCity();
  const setMyCity = useSetMyCity();
  const cities = useQuery(citiesQuery);
  const [state, setState] = useState<'idle' | 'saved' | 'failed'>('idle');

  return (
    <Box sx={{ display: 'grid', gap: 1, maxWidth: 400 }}>
      <CityPicker
        label={t('account.form.city')}
        value={myCity?.id ?? ''}
        current={myCity ?? undefined}
        onChange={(cityId) => {
          const city = cities.data?.find((item) => item.id === cityId);
          setState('idle');
          setMyCity(
            city === undefined ? null : { id: city.id, name: city.name, nameKk: city.nameKk },
          )
            .then(() => {
              setState('saved');
            })
            .catch(() => {
              setState('failed');
            });
        }}
      />
      <Typography
        variant="caption"
        role="status"
        color={state === 'failed' ? 'error' : 'text.secondary'}
      >
        {state === 'saved'
          ? t('account.form.citySaved')
          : state === 'failed'
            ? t('city.failed')
            : t('account.form.cityHint')}
      </Typography>
    </Box>
  );
}
