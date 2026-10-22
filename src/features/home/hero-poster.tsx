import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import InputBase from '@mui/material/InputBase';
import Typography from '@mui/material/Typography';
import { useNavigate } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { useState, type CSSProperties, type ReactNode, type SyntheticEvent } from 'react';

import { useT } from '@/common/i18n';
import { orUndefined } from '@/common/search';
import Atmosphere from '@/common/ui/atmosphere';

import PlatformCounts from './platform-counts';

interface Figure {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  /** Сторона и отступ от края первого экрана до `lg`; отрицательный — за краем. */
  readonly side: 'left' | 'right';
  readonly offset: string;
  /** Высота фигуры до `lg`. */
  readonly size: number;
  /**
   * С `lg` — композиция в точках макета шириной `REF`: от центра до ближнего
   * к заголовку края фигуры, высота и нижний край (отрицательный — фигура
   * уходит под край экрана). На другой ширине всё множится на одну долю,
   * и соотношения не плывут.
   */
  readonly lg: { readonly inner: number; readonly size: number; readonly bottom: number };
  /** Дальняя фигура — темнее и мягче, как на постере. */
  readonly back?: boolean;
  /**
   * Край кадра на фото, который надо растворить: низ — фигура обрезана по
   * поясу выше края экрана; правый край — у дальней девушки рука упирается
   * в край исходного снимка. Людей не дорисовываем (правила бренда,
   * `kttf-marketing/CLAUDE.md`), поэтому обрез уходит в темноту.
   *
   * Маска режет и размытие дальней фигуры по краю картинки: рука у самого
   * края файла получала прямой срез. Поэтому у такой вырезки в файле
   * прозрачные поля слева и сверху — размытию есть куда растечься.
   */
  readonly fade?: { readonly bottom?: boolean; readonly right?: boolean };
}

/** Ширина макета первого экрана, к которой подобраны `lg`. */
const REF = 1560;

/**
 * Игроки по бокам — те же вырезки реальных игроков Казахстана, что на шапке
 * YouTube-канала и первом постере (`kttf-marketing/sources/photos/cutouts`).
 *
 * Масштаб подобран по видимой массе фигуры, а не по высоте картинки:
 * снимки кадрированы по-разному (подающий — до колен и наклонён к камере,
 * с повязкой — по пояс). Равная высота давала голову вдвое больше, равная
 * голова — подающего крупнее из-за плеч и руки. Сейчас у правого голова
 * чуть больше, у левого чуть шире плечи, и глазу они равны. Дальние —
 * мельче и выше, за плечом
 * ближних, между ними и заголовком. Рука подающего кончается левее чисел
 * под поиском.
 */
const FIGURES: readonly Figure[] = [
  {
    src: '/home/player-roar.webp',
    width: 462,
    height: 640,
    side: 'left',
    offset: '-4%',
    size: 440,
    lg: { inner: 417, size: 500, bottom: 0 },
    back: true,
  },
  {
    src: '/home/player-reach.webp',
    width: 764,
    height: 680,
    side: 'right',
    offset: '-14%',
    size: 425,
    lg: { inner: 299, size: 429, bottom: 86 },
    back: true,
    fade: { bottom: true, right: true },
  },
  {
    src: '/home/player-serve.webp',
    width: 1000,
    height: 759,
    side: 'left',
    offset: '-9%',
    size: 390,
    lg: { inner: 260, size: 440, bottom: -40 },
  },
  {
    src: '/home/player-fist.webp',
    width: 778,
    height: 880,
    side: 'right',
    offset: '5%',
    size: 450,
    lg: { inner: 345, size: 450, bottom: -50 },
    fade: { bottom: true },
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
 *
 * При загрузке строки поднимаются по очереди сверху вниз, игроки входят с
 * боков — один раз, это фирменный жест страницы (`styles.css`, `hero-*`).
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
            'linear-gradient(to right, var(--night) 0%, transparent 5%, transparent 95%, var(--night) 100%), linear-gradient(to top, var(--night) 0%, transparent 32%)',
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
          className="hero-rise"
          style={{ '--motion-delay': '0ms' } as CSSProperties}
          sx={{
            mb: { xs: 2, sm: 2.5 },
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            fontWeight: 700,
            fontSize: { xs: 11, sm: 13 },
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--night-ink-700)',
          }}
        >
          <Box
            component="span"
            aria-hidden
            sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'var(--red-500)' }}
          />
          {t('home.hero.forum')}
        </Typography>
        <Typography
          className="hero-rise"
          style={{ '--motion-delay': '80ms' } as CSSProperties}
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
          className="hero-rise"
          style={{ '--motion-delay': '160ms' } as CSSProperties}
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
          className="hero-rise"
          style={{ '--motion-delay': '240ms' } as CSSProperties}
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

        <Box className="hero-rise" style={{ '--motion-delay': '320ms' } as CSSProperties}>
          <PlatformCounts />
        </Box>
      </Container>
    </Atmosphere>
  );
}

function FigureImage({ figure }: { readonly figure: Figure }): ReactNode {
  const { inner, size, bottom } = figure.lg;
  const back = figure.back === true;
  // Доля макета: на 1200 игроки мельче, на 1920 — не крупнее 110%, иначе
  // голова уходит под заголовок.
  const unit = `min(calc(100vw / ${String(REF)}), 1.1px)`;
  const at = (value: number): string => `calc(${String(value)} * ${unit})`;
  const masks = [
    figure.fade?.bottom === true && 'linear-gradient(to top, transparent 0, #000 30%)',
    figure.fade?.right === true && 'linear-gradient(to left, transparent 0, #000 18%)',
  ].filter((mask): mask is string => mask !== false);

  return (
    <Box
      component="img"
      src={figure.src}
      alt=""
      aria-hidden
      width={figure.width}
      height={figure.height}
      // Первый экран: картинки ближних игроков нужны сразу, дальние — следом.
      fetchPriority={back ? 'low' : 'high'}
      decoding="async"
      // Игроки входят с боков к заголовку; дальние — следом за ближними.
      className={figure.side === 'left' ? 'hero-enter-left' : 'hero-enter-right'}
      style={{ '--motion-delay': back ? '220ms' : '80ms' } as CSSProperties}
      sx={{
        position: 'absolute',
        bottom: { xs: 0, lg: at(bottom) },
        [figure.side]: { xs: figure.offset, lg: 'auto' },
        [figure.side === 'left' ? 'right' : 'left']: {
          xs: 'auto',
          lg: `calc(50% + ${at(inner)})`,
        },
        width: 'auto',
        height: {
          xs: back ? 0 : 230,
          sm: back ? 260 : 300,
          md: figure.size,
          lg: at(size),
        },
        display: { xs: back ? 'none' : 'block', sm: 'block' },
        maxWidth: 'none',
        pointerEvents: 'none',
        userSelect: 'none',
        ...(masks.length > 0 && {
          maskImage: { lg: masks.join(', ') },
          maskComposite: { lg: 'intersect' },
        }),
        filter: back
          ? 'blur(3px) brightness(0.42) saturate(0.8)'
          : 'brightness(0.95) contrast(1.05)',
      }}
    />
  );
}
