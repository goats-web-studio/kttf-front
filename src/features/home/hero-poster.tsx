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

/**
 * Первый экран — постер бренда, как шапка YouTube-канала: тёмный фон с
 * красным свечением, заголовок белым и красным капсом,
 * строка бренда с разрядкой. Свечение ниже заголовка — за поиском: на
 * самом ярком пятне красное слово не читалось.
 *
 * Говорит брендом, а не описанием: «Казахский форум настольного тенниса» —
 * это и есть расшифровка KTTF — и строка «KTTF · турниры · рейтинг · клубы
 * · игроки». Заголовок разбит на две строки почти равной длины. Под ними главное действие главной — найти игрока —
 * и единственная залитая кнопка экрана (запрет №2). Внизу живые числа
 * платформы: на пилотной базе они маленькие, но настоящие.
 *
 * Игроков на постере нет: вырезки были из чужих фото, в том числе клуба
 * Nomad, который не разрешил их использовать (28.10.2026).
 *
 * При загрузке строки поднимаются по очереди сверху вниз — один раз, это
 * фирменный жест страницы (`styles.css`, `hero-rise`).
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
    <Atmosphere component="section" glow={[50, 58]} minHeight={{ md: 600 }}>
      <Container
        maxWidth="lg"
        sx={{
          position: 'relative',
          pt: { xs: 5, md: 11 },
          pb: { xs: 8, md: 4 },
          textAlign: 'center',
        }}
      >
        {/* Заголовок капсом — осознанное исключение из запрета №10: это
            постер бренда, один в один с шапкой YouTube-канала и афишами, а
            запрет — про заголовки страниц и кнопки. */}
        <Typography
          className="hero-rise"
          style={{ '--motion-delay': '0ms' } as CSSProperties}
          component="h1"
          sx={{
            fontWeight: 800,
            textTransform: 'uppercase',
            fontSize: { xs: 36, sm: 56, md: 64 },
            lineHeight: 0.98,
            letterSpacing: '-0.01em',
            textShadow: '0 2px 6px rgb(0 0 0 / 0.55), 0 8px 32px rgb(0 0 0 / 0.5)',
          }}
        >
          {t('home.hero.titleWhite')}{' '}
          {/* Красное слово светлее фирменного 500: на красном свечении
              оно иначе сливалось с фоном (контраст ниже 3:1). */}
          <Box component="span" sx={{ display: 'block', color: 'var(--red-400)' }}>
            {t('home.hero.titleRed')}
          </Box>
        </Typography>
        <Typography
          className="hero-rise"
          style={{ '--motion-delay': '80ms' } as CSSProperties}
          sx={{
            mt: { xs: 2, sm: 3 },
            fontWeight: 700,
            fontSize: { xs: 13, sm: 15 },
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          {/* Строка целиком — на широком экране. На телефоне она в одну
              строку не влезает, а перенос оставлял точку в начале строки:
              там слова стоят без точек, с равными промежутками. */}
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
            {t('home.hero.line')}
          </Box>
          <Box
            component="span"
            sx={{
              display: { xs: 'flex', sm: 'none' },
              flexWrap: 'wrap',
              justifyContent: 'center',
              columnGap: 1.5,
              rowGap: 0.5,
            }}
          >
            {t('home.hero.line')
              .split(' · ')
              .map((word) => (
                <span key={word}>{word}</span>
              ))}
          </Box>
        </Typography>

        <Box
          className="hero-rise"
          style={{ '--motion-delay': '160ms' } as CSSProperties}
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

        <Box className="hero-rise" style={{ '--motion-delay': '240ms' } as CSSProperties}>
          <PlatformCounts />
        </Box>
      </Container>
    </Atmosphere>
  );
}
