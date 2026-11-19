import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

import { HeroFrame, HeroSubtitle, HeroTitle } from './hero-frame';
import { rise } from './hero-style';
import LiveSearch from './live-search';

/**
 * Вариант A «Поиск в центре» — первый экран для игрока: заголовок
 * «играйте», описание того, что здесь есть, и живой поиск сразу по
 * игрокам, клубам и тренерам. Ни переключателя разделов, ни ссылок под
 * полем: разделы и так есть в шапке и в плитках ниже.
 */
export default function HeroSearch(): ReactNode {
  return (
    <HeroFrame glow={[50, 64]}>
      <Box sx={{ maxWidth: 760, mx: 'auto' }}>
        <HeroTitle align="center" />
        <HeroSubtitle align="center" />
        <Box {...rise(160)} sx={{ maxWidth: 640, mx: 'auto', mt: 4 }}>
          <LiveSearch />
        </Box>
      </Box>
    </HeroFrame>
  );
}
