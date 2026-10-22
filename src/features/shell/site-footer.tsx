import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import Atmosphere from '@/common/ui/atmosphere';

import { SECTIONS } from './sections';

/** Ссылка подвала: светлая на тёмном, подчёркивание по наведению. */
const footerLink = {
  color: 'var(--night-ink-700)',
  fontWeight: 500,
  minHeight: 32,
  display: 'inline-flex',
  alignItems: 'center',
  '&:hover': { color: 'var(--night-ink-900)' },
} as const;

/**
 * Подвал — тёмная фирменная подложка постеров: белый знак, строка бренда
 * с разрядкой, разделы и связь. Раньше здесь была одна строка на белом, и
 * страница обрывалась, а не заканчивалась.
 *
 * Разделы повторяют шапку одним списком `SECTIONS` — у человека, дочитавшего
 * до конца, следующий шаг под рукой.
 */
export default function SiteFooter(): ReactNode {
  const t = useT();

  return (
    <Atmosphere component="footer" glow={[50, 130]}>
      <Container maxWidth="lg" sx={{ py: { xs: 5, sm: 7 } }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          sx={{ justifyContent: 'space-between', gap: { xs: 4, md: 6 } }}
        >
          <Box>
            <Box
              component="img"
              src="/logo-wordmark-white.png"
              alt="KTTF"
              width={729}
              height={211}
              sx={{ width: 'auto', height: 36, display: 'block' }}
            />
            <Typography
              sx={{
                mt: 2,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--night-ink-700)',
              }}
            >
              {t('footer.brandLine')}
            </Typography>
          </Box>

          <Box
            component="nav"
            aria-label={t('footer.sections')}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, auto)' },
              columnGap: { xs: 3, sm: 6 },
              rowGap: 0.5,
              alignContent: 'start',
            }}
          >
            {SECTIONS.map((section) => (
              <Link key={section.to} href={section.to} underline="hover" sx={footerLink}>
                {t(section.label)}
              </Link>
            ))}
            <Link href="/feedback" underline="hover" sx={footerLink}>
              {t('footer.contact')}
            </Link>
            {/* Инстаграм — главный внешний канал: турниры объявляются там,
                и игрок ищет их сначала в нём. */}
            <Link
              href="https://www.instagram.com/kttf.kz"
              target="_blank"
              rel="noreferrer"
              underline="hover"
              sx={footerLink}
            >
              {t('footer.instagram')}
            </Link>
          </Box>
        </Stack>

        <Typography
          variant="body2"
          sx={{
            mt: { xs: 4, sm: 6 },
            pt: 3,
            borderTop: '1px solid var(--night-line)',
            color: 'var(--night-ink-500)',
          }}
        >
          {t('footer.copy')}
        </Typography>
      </Container>
    </Atmosphere>
  );
}
