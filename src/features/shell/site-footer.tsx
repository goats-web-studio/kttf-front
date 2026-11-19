import { LEGAL_PATHS } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { useT, type MessageKey } from '@/common/i18n';
import Atmosphere from '@/common/ui/atmosphere';

import { InstagramIcon, ThreadsIcon, YoutubeIcon, type BrandIcon } from './brand-icons';
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
const FOOTER_PAGES: readonly { readonly href: string; readonly label: MessageKey }[] = [
  { href: '/feed', label: 'nav.menu.forum.feed.title' },
  { href: '/trainings', label: 'nav.trainings' },
  { href: '/trainings?view=coaches', label: 'nav.menu.trainings.coaches.title' },
  { href: '/duels', label: 'nav.menu.players.duels.title' },
];

/**
 * Каналы федерации. Инстаграм первым: турниры объявляются там, и игрок ищет
 * их сначала в нём. Ютуб — видео, Threads — короткие новости.
 */
const SOCIAL_LINKS: readonly {
  readonly href: string;
  readonly label: MessageKey;
  readonly icon: BrandIcon;
}[] = [
  { href: 'https://www.instagram.com/kttf.kz', label: 'footer.instagram', icon: InstagramIcon },
  { href: 'https://www.youtube.com/@kttfkz', label: 'footer.youtube', icon: YoutubeIcon },
  { href: 'https://www.threads.com/@kttf.kz', label: 'footer.threads', icon: ThreadsIcon },
];

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
              lang="en"
              sx={{ mt: 1.5, fontSize: 15, fontWeight: 500, color: 'var(--night-ink-900)' }}
            >
              {t('app.fullName')}
            </Typography>
            <Typography
              sx={{
                mt: 1,
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
            {/* Страницы внутри разделов — прямыми ссылками: в шапке они за
                меню «Где играть» и «Сообщество», здесь их видно сразу. */}
            {FOOTER_PAGES.map((page) => (
              <Link key={page.href} href={page.href} underline="hover" sx={footerLink}>
                {t(page.label)}
              </Link>
            ))}
            <Link href="/feedback" underline="hover" sx={footerLink}>
              {t('footer.contact')}
            </Link>
          </Box>

          <Box component="nav" aria-labelledby="footer-social">
            <Typography
              id="footer-social"
              sx={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--night-ink-500)',
                mb: 0.5,
              }}
            >
              {t('footer.social')}
            </Typography>
            <Stack sx={{ rowGap: 0.5 }}>
              {SOCIAL_LINKS.map((social) => {
                const Icon = social.icon;
                return (
                  <Link
                    key={social.href}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    underline="hover"
                    sx={{ ...footerLink, gap: 1 }}
                  >
                    <Icon size={18} />
                    {t(social.label)}
                  </Link>
                );
              })}
            </Stack>
          </Box>
        </Stack>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 1, sm: 3 }}
          sx={{
            mt: { xs: 4, sm: 6 },
            pt: 3,
            borderTop: '1px solid var(--night-line)',
            alignItems: { sm: 'center' },
          }}
        >
          <Typography variant="body2" sx={{ color: 'var(--night-ink-500)', flexGrow: 1 }}>
            {t('footer.copy')}
          </Typography>
          {/* Документы — ADR-091: на каждой странице, где есть подвал. */}
          <Link href={LEGAL_PATHS.privacy} underline="hover" variant="body2" sx={footerLink}>
            {t('footer.privacy')}
          </Link>
          <Link href={LEGAL_PATHS.terms} underline="hover" variant="body2" sx={footerLink}>
            {t('footer.terms')}
          </Link>
        </Stack>
      </Container>
    </Atmosphere>
  );
}
