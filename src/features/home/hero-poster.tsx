import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import InputBase from '@mui/material/InputBase';
import Typography from '@mui/material/Typography';
import { useNavigate } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { useState, type ReactNode, type SyntheticEvent } from 'react';

import { useT } from '@/common/i18n';
import { orUndefined } from '@/common/search';
import Atmosphere from '@/common/ui/atmosphere';

import PlatformCounts from './platform-counts';

interface Figure {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  /** Сторона и отступ от края первого экрана; отрицательный — фигура за краем. */
  readonly side: 'left' | 'right';
  readonly offset: string;
  /** Высота фигуры на широком экране. */
  readonly size: number;
  /** Дальняя фигура — темнее и мягче, как на постере. */
  readonly back?: boolean;
}

/**
 * Игроки по бокам — те же вырезки реальных игроков Казахстана, что на шапке
 * YouTube-канала и первом постере (`kttf-marketing/sources/photos/cutouts`).
 * Ближние смотрят к центру, к заголовку; дальние приглушены.
 */
const FIGURES: readonly Figure[] = [
  {
    src: '/home/player-roar.webp',
    width: 462,
    height: 640,
    side: 'left',
    offset: '-4%',
    size: 440,
    back: true,
  },
  {
    src: '/home/player-reach.webp',
    width: 724,
    height: 640,
    side: 'right',
    offset: '-14%',
    size: 430,
    back: true,
  },
  {
    src: '/home/player-serve.webp',
    width: 1000,
    height: 759,
    side: 'left',
    offset: '-9%',
    size: 420,
  },
  {
    src: '/home/player-fist.webp',
    width: 778,
    height: 880,
    side: 'right',
    offset: '5%',
    size: 470,
  },
];

/**
 * Первый экран — постер бренда, как шапка YouTube-канала: тёмный фон с
 * красным свечением, игроки по бокам, заголовок белым и красным капсом,
 * строка бренда с разрядкой.
 *
 * Говорит брендом, а не описанием: «Настольный теннис Казахстана» и четыре
 * слова — что здесь есть. Под ними главное действие главной — найти игрока —
 * и единственная залитая кнопка экрана (запрет №2). Внизу живые числа
 * платформы: на пилотной базе они маленькие, но настоящие.
 *
 * На телефоне игроки уходят вниз, под поиск: заголовок и поле должны
 * попасть в первый экран целиком.
 */
export default function HeroPoster(): ReactNode {
  const t = useT();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const submit = (event: SyntheticEvent): void => {
    event.preventDefault();
    const value = orUndefined(query);
    void navigate({ to: '/players', search: value === undefined ? {} : { search: value } });
  };

  return (
    <Atmosphere component="section" glow={[50, 42]} minHeight={{ md: 600 }}>
      {FIGURES.map((figure) => (
        <FigureImage key={figure.src} figure={figure} />
      ))}

      {/* Фигуры растворяются к краям и к низу, как на постере. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'linear-gradient(to right, var(--night) 0%, transparent 10%, transparent 90%, var(--night) 100%), linear-gradient(to top, var(--night) 0%, transparent 32%)',
        }}
      />

      <Container
        maxWidth="lg"
        sx={{
          position: 'relative',
          pt: { xs: 5, md: 11 },
          // На телефоне под поиском место для игроков.
          pb: { xs: '232px', md: 4 },
          textAlign: 'center',
        }}
      >
        <Typography
          component="h1"
          sx={{
            fontWeight: 800,
            textTransform: 'uppercase',
            fontSize: { xs: 36, sm: 56, md: 64 },
            lineHeight: 0.98,
            letterSpacing: '-0.01em',
            textShadow: '0 8px 32px rgb(0 0 0 / 0.5)',
          }}
        >
          {t('home.hero.titleWhite')}{' '}
          <Box component="span" sx={{ display: 'block', color: 'var(--red-500)' }}>
            {t('home.hero.titleRed')}
          </Box>
        </Typography>
        <Typography
          sx={{
            mt: { xs: 2, sm: 3 },
            fontWeight: 700,
            fontSize: { xs: 13, sm: 15 },
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          {t('footer.brandLine')}
        </Typography>

        <Box
          component="form"
          role="search"
          onSubmit={submit}
          sx={{
            mt: { xs: 4, sm: 5 },
            mx: 'auto',
            maxWidth: 560,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            p: 0.75,
            pl: 2,
            borderRadius: 999,
            bgcolor: 'var(--paper)',
            boxShadow: '0 12px 40px rgb(0 0 0 / 0.35)',
          }}
        >
          <Box component="span" sx={{ display: 'inline-flex', color: 'var(--ink-500)' }}>
            <Search size={18} aria-hidden />
          </Box>
          <InputBase
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder={t('home.hero.placeholder')}
            autoComplete="off"
            inputProps={{ 'aria-label': t('ratings.search') }}
            sx={{ flex: 1, minWidth: 0, color: 'var(--ink-900)', fontSize: 16, minHeight: 44 }}
          />
          <Button
            type="submit"
            variant="contained"
            size="large"
            sx={{ flexShrink: 0, borderRadius: 999, minHeight: 44, px: 3 }}
          >
            {t('home.hero.find')}
          </Button>
        </Box>

        <PlatformCounts />
      </Container>
    </Atmosphere>
  );
}

function FigureImage({ figure }: { readonly figure: Figure }): ReactNode {
  return (
    <Box
      component="img"
      src={figure.src}
      alt=""
      aria-hidden
      width={figure.width}
      height={figure.height}
      // Первый экран: картинки ближних игроков нужны сразу, дальние — следом.
      fetchPriority={figure.back === true ? 'low' : 'high'}
      decoding="async"
      sx={{
        position: 'absolute',
        bottom: 0,
        [figure.side]: figure.offset,
        width: 'auto',
        height: {
          xs: figure.back === true ? 0 : 230,
          sm: figure.back === true ? 260 : 300,
          md: figure.size,
        },
        display: { xs: figure.back === true ? 'none' : 'block', sm: 'block' },
        maxWidth: 'none',
        pointerEvents: 'none',
        userSelect: 'none',
        filter:
          figure.back === true
            ? 'blur(3px) brightness(0.42) saturate(0.8)'
            : 'brightness(0.95) contrast(1.05)',
      }}
    />
  );
}
