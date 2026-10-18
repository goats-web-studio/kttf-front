import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  /** Ссылка назад — в раздел, из которого пришли. */
  readonly back?: { readonly href: string; readonly label: string };
  /** Над заголовком: статус, метка раздела. */
  readonly eyebrow?: ReactNode;
  readonly title: ReactNode;
  readonly subtitle?: ReactNode;
  /** Справа от заголовка: главное действие экрана. */
  readonly actions?: ReactNode;
  readonly children?: ReactNode;
}

/**
 * Шапка страницы: «назад», заголовок, подзаголовок, действия. Одна на экран,
 * одинаковая везде — глаз находит заголовок там же, где и на прошлой странице.
 */
export default function PageHeader({
  back,
  eyebrow,
  title,
  subtitle,
  actions,
  children,
}: PageHeaderProps): ReactNode {
  return (
    <Box component="header" sx={{ mb: { xs: 3, sm: 4 } }}>
      {back !== undefined && <BackLink href={back.href} label={back.label} />}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ alignItems: { sm: 'flex-end' }, justifyContent: 'space-between', gap: 2 }}
      >
        <Box sx={{ minWidth: 0 }}>
          {eyebrow !== undefined && <Box sx={{ mb: 1.5 }}>{eyebrow}</Box>}
          <Typography
            variant="h1"
            sx={{ fontSize: { xs: 32, sm: 40 }, lineHeight: { xs: '36px', sm: '44px' } }}
          >
            {title}
          </Typography>
          {subtitle !== undefined && (
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions !== undefined && (
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            {actions}
          </Stack>
        )}
      </Stack>
      {children}
    </Box>
  );
}

/** «‹ Раздел» над заголовком: путь назад в раздел, из которого пришли. */
export function BackLink({
  href,
  label,
}: {
  readonly href: string;
  readonly label: string;
}): ReactNode {
  return (
    <Link
      href={href}
      variant="body2"
      underline="none"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        minHeight: 32,
        mb: 1.5,
        color: 'text.secondary',
        fontWeight: 500,
      }}
    >
      <ChevronLeft size={16} aria-hidden />
      {label}
    </Link>
  );
}
