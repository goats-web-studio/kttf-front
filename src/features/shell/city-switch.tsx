import type { CityView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Divider from '@mui/material/Divider';
import ListSubheader from '@mui/material/ListSubheader';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Popper from '@mui/material/Popper';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, LocateFixed, MapPin, X } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';
import { useSessionStore } from '@/features/auth/session-store';
import { citiesByCountry } from '@/features/places/countries';
import {
  detectCity,
  geolocationGranted,
  useGuestCity,
  useMyCity,
  useSetMyCity,
  type DetectResult,
} from '@/features/places/my-city';
import { usePlaceName } from '@/features/places/place-name';
import { citiesQuery, countriesQuery, regionsQuery } from '@/features/places/queries';
import { citiesByRegion } from '@/features/places/regions';
import { REGION_SUBHEADER_SX } from '@/features/places/region-group';

type Status = 'idle' | 'detecting' | Exclude<DetectResult['kind'], 'found'> | 'failed';

/**
 * Мой город в шапке — ADR-093.
 *
 * Кнопка с городом и меню: определить по местоположению, выбрать из
 * справочника, «Все города». Город — умолчание фильтров на страницах
 * турниров, клубов, тренировок, дуэлей и игроков.
 *
 * Разрешение на геолокацию не спрашивается при загрузке: гостю без города
 * под кнопкой один раз появляется предложение определить город, и запрос
 * уходит по нажатию. Если разрешение уже дано — город определяется молча.
 */
export default function CitySwitch(): ReactNode {
  const t = useT();
  const placeName = usePlaceName();
  const menuId = useId();
  // Элемент кнопки — состоянием, а не ref: по нему встают меню и подсказка.
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>('idle');

  const user = useSessionStore((state) => state.user);
  const isRestoring = useSessionStore((state) => state.isRestoring);
  const myCity = useMyCity();
  const setMyCity = useSetMyCity();
  const guestCity = useGuestCity((state) => state.city);
  const asked = useGuestCity((state) => state.asked);
  const markAsked = useGuestCity((state) => state.markAsked);

  // Справочник — только когда меню открыто: шапка на каждой странице не
  // должна тянуть города, которые нужны раз в жизни.
  const queryClient = useQueryClient();
  const countries = useQuery({ ...countriesQuery, enabled: open });
  const regions = useQuery({ ...regionsQuery, enabled: open });
  const cities = useQuery({ ...citiesQuery, enabled: open });
  const list = cities.data ?? [];

  const choose = (city: CityView | null): void => {
    markAsked();
    setOpen(false);
    setStatus('idle');
    setMyCity(city === null ? null : { id: city.id, name: city.name, nameKk: city.nameKk }).catch(
      () => {
        setStatus('failed');
      },
    );
  };

  const detect = async (silent: boolean): Promise<void> => {
    setStatus('detecting');
    let all: readonly CityView[];
    try {
      all = await queryClient.query(citiesQuery);
    } catch {
      setStatus(silent ? 'idle' : 'unavailable');
      return;
    }
    const result = await detectCity(all);
    if (result.kind === 'found') {
      choose(result.city);
      return;
    }
    setStatus(silent ? 'idle' : result.kind);
  };

  // Город гостя переезжает в аккаунт, если там пусто: выбрал до входа —
  // не спрашиваем второй раз (ADR-093).
  useEffect(() => {
    if (user !== null && user.city === null && guestCity !== null) {
      void setMyCity(guestCity).catch(() => undefined);
    }
  }, [user, guestCity, setMyCity]);

  // Разрешение уже дано — определяем молча, один раз.
  const needsCity = !isRestoring && myCity === null && !asked;
  useEffect(() => {
    if (!needsCity) return;
    let cancelled = false;
    void geolocationGranted().then((granted) => {
      if (granted && !cancelled) void detect(true);
    });
    return () => {
      cancelled = true;
    };
    // detect меняется на каждый рендер, а запускать надо раз.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsCity]);

  const groups = citiesByCountry(countries.data ?? [], list);
  const label = myCity === null ? t('city.all') : placeName(myCity);

  const items: ReactNode[] = [
    <MenuItem
      key="detect"
      disabled={status === 'detecting'}
      onClick={() => {
        void detect(false);
      }}
      sx={{ minHeight: 44, gap: 1.5, color: 'primary.main', fontWeight: 600 }}
    >
      <LocateFixed size={18} aria-hidden />
      {status === 'detecting' ? t('city.detecting') : t('city.detect')}
    </MenuItem>,
  ];
  const note = statusNote(status, t);
  if (note !== null) {
    items.push(
      <Box
        key="note"
        role="status"
        sx={{ px: 2, pb: 1, maxWidth: 280, typography: 'caption', color: 'text.secondary' }}
      >
        {note}
      </Box>,
    );
  }
  items.push(<Divider key="divider-top" />);
  for (const group of groups) {
    if (groups.length > 1 && group.country !== undefined) {
      items.push(
        <ListSubheader key={`country-${group.country.id}`}>
          {placeName(group.country)}
        </ListSubheader>,
      );
    }
    // Мой город — город, не область (ADR-096): область здесь только
    // подзаголовок над своими городами.
    for (const inRegion of citiesByRegion(regions.data ?? [], group.cities)) {
      if (inRegion.region !== undefined) {
        items.push(
          <ListSubheader key={`region-${inRegion.region.id}`} sx={REGION_SUBHEADER_SX}>
            {placeName(inRegion.region)}
          </ListSubheader>,
        );
      }
      for (const city of inRegion.cities) {
        const selected = city.id === myCity?.id;
        items.push(
          <MenuItem
            key={city.id}
            selected={selected}
            onClick={() => {
              choose(city);
            }}
            sx={{ minHeight: 44, justifyContent: 'space-between', gap: 2 }}
          >
            {placeName(city)}
            {selected && <Check size={16} aria-hidden />}
          </MenuItem>,
        );
      }
    }
  }
  items.push(<Divider key="divider-bottom" />);
  items.push(
    <MenuItem
      key="all"
      selected={myCity === null}
      onClick={() => {
        choose(null);
      }}
      sx={{ minHeight: 44, justifyContent: 'space-between', gap: 2 }}
    >
      {t('city.all')}
      {myCity === null && <Check size={16} aria-hidden />}
    </MenuItem>,
  );

  return (
    <>
      <ButtonBase
        ref={setAnchor}
        aria-label={fill(t('city.button'), { city: label })}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          setOpen(true);
        }}
        sx={{
          gap: 0.5,
          minHeight: 44,
          px: 1,
          borderRadius: 1,
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--ink-700)',
          minWidth: 0,
          '@media (hover: hover)': { '&:hover': { bgcolor: 'var(--paper-hover)' } },
        }}
      >
        <MapPin size={16} aria-hidden style={{ flexShrink: 0 }} />
        <Box
          component="span"
          sx={{
            // Пока рядом стоят разделы (600–1199px), город — значком, имя в
            // подсказке; на телефоне разделы внизу, и имя помещается.
            display: { xs: 'block', sm: 'none', lg: 'block' },
            maxWidth: { xs: 96, lg: 180 },
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </Box>
        <ChevronDown size={14} aria-hidden style={{ flexShrink: 0 }} />
      </ButtonBase>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { maxHeight: 'min(70vh, 560px)', minWidth: 220 } } }}
      >
        {items}
      </Menu>
      <Popper
        open={needsCity && !open && status !== 'detecting' && anchor !== null}
        anchorEl={anchor}
        placement="bottom-start"
        sx={{ zIndex: 'appBar', pt: 1 }}
      >
        {/* Подсказка, а не окно: страницу не перекрывает и фокус не забирает. */}
        <Paper
          component="aside"
          aria-label={t('city.askTitle')}
          elevation={6}
          sx={{ p: 2, width: 300, maxWidth: 'calc(100vw - 16px)' }}
        >
          <Stack direction="row" sx={{ alignItems: 'flex-start', gap: 1 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Box sx={{ typography: 'subtitle2', fontWeight: 600 }}>{t('city.askTitle')}</Box>
              <Box sx={{ typography: 'body2', color: 'text.secondary', mt: 0.5 }}>
                {t('city.askText')}
              </Box>
            </Box>
            <ButtonBase
              aria-label={t('city.close')}
              onClick={markAsked}
              sx={{ width: 32, height: 32, borderRadius: 1, flexShrink: 0, mt: -0.5, mr: -0.5 }}
            >
              <X size={16} aria-hidden />
            </ButtonBase>
          </Stack>
          <Stack direction="row" sx={{ gap: 1, mt: 2 }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<LocateFixed size={16} aria-hidden />}
              onClick={() => {
                markAsked();
                setOpen(true);
                void detect(false);
              }}
              sx={{ minHeight: 40 }}
            >
              {t('city.detectShort')}
            </Button>
            <Button
              variant="text"
              size="small"
              onClick={() => {
                markAsked();
                setOpen(true);
              }}
              sx={{ minHeight: 40 }}
            >
              {t('city.pick')}
            </Button>
          </Stack>
        </Paper>
      </Popper>
    </>
  );
}

function statusNote(status: Status, t: ReturnType<typeof useT>): string | null {
  switch (status) {
    case 'denied':
      return t('city.denied');
    case 'far':
      return t('city.far');
    case 'unavailable':
      return t('city.unavailable');
    case 'failed':
      return t('city.failed');
    default:
      return null;
  }
}
