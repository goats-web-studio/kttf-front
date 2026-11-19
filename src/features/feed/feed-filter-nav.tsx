import type { FeedFilter, FeedTab } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import type { LucideIcon } from 'lucide-react';
import { useId, type ReactNode } from 'react';

import { useT } from '@/common/i18n';

import { FEED_FILTER_OPTIONS, FEED_TAB_OPTIONS, feedHref } from './filters';

interface FeedNavProps {
  /** Вкладка из адреса; у гостя — `undefined`, вкладок нет. */
  readonly tab: FeedTab | undefined;
  readonly filter: FeedFilter | undefined;
  readonly signedIn: boolean;
}

/**
 * Левая колонка страницы «Лента» на компьютере — ADR-097: вкладки и «Что
 * показывать» столбиком. Пункты — ссылки: выбранный фильтр живёт в адресе,
 * и ссылку «новости клубов» можно переслать.
 */
export function FeedSideNav({ tab, filter, signedIn }: FeedNavProps): ReactNode {
  const t = useT();
  const filtersId = useId();
  const current = tab ?? 'FOR_YOU';

  return (
    <Box component="nav" aria-label={t('feed.title')} sx={{ display: 'grid', gap: 3 }}>
      {signedIn && (
        <Box component="ul" aria-label={t('feed.tabs')} sx={{ m: 0, p: 0, listStyle: 'none' }}>
          {FEED_TAB_OPTIONS.map((option) => (
            <SideItem
              key={option.value}
              href={feedHref(option.value, filter)}
              icon={option.icon}
              active={option.value === current}
            >
              {t(option.label)}
            </SideItem>
          ))}
        </Box>
      )}
      <Box>
        <Typography
          id={filtersId}
          variant="caption"
          component="h2"
          sx={{ display: 'block', px: 1.5, mb: 1, fontWeight: 700, color: 'text.secondary' }}
        >
          {t('feed.filter.title')}
        </Typography>
        <Box
          component="ul"
          aria-labelledby={filtersId}
          data-feed-filters
          sx={{ m: 0, p: 0, listStyle: 'none' }}
        >
          {FEED_FILTER_OPTIONS.map((option) => (
            <SideItem
              key={option.value ?? 'ALL'}
              href={feedHref(tab, option.value)}
              icon={option.icon}
              active={option.value === filter}
            >
              {t(option.label)}
            </SideItem>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function SideItem({
  href,
  icon: Icon,
  active,
  children,
}: {
  readonly href: string;
  readonly icon: LucideIcon;
  readonly active: boolean;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <Box component="li">
      <Link
        href={href}
        underline="none"
        aria-current={active ? 'page' : undefined}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          minHeight: 44,
          px: 1.5,
          borderRadius: 2,
          typography: 'body2',
          fontWeight: active ? 700 : 500,
          color: active ? 'text.primary' : 'text.secondary',
          bgcolor: active ? 'var(--paper)' : 'transparent',
          boxShadow: active ? 'var(--shadow-card)' : 'none',
          transition:
            'background-color var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease)',
          '@media (hover: hover)': {
            '&:hover': {
              color: 'text.primary',
              bgcolor: active ? 'var(--paper)' : 'var(--paper-hover)',
            },
          },
          '& svg': { flexShrink: 0, color: active ? 'var(--red-600)' : 'inherit' },
        }}
      >
        <Icon size={18} aria-hidden />
        {children}
      </Link>
    </Box>
  );
}

/**
 * Фильтры чипами — телефон и планшет. Лента чипов листается вбок, а не
 * переносится: шесть фильтров в две строки отодвинули бы ленту за экран.
 * Каждый чип — 44px в высоту, под палец.
 */
export function FeedFilterChips({ tab, filter }: Omit<FeedNavProps, 'signedIn'>): ReactNode {
  const t = useT();

  return (
    <Box
      component="nav"
      aria-label={t('feed.filter.title')}
      data-feed-filters
      sx={{
        // Чипы доходят до края экрана: видно, что ряд продолжается.
        mx: { xs: -2, sm: -3, md: 0 },
        px: { xs: 2, sm: 3, md: 0 },
        overflowX: 'auto',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', gap: 1 }}>
        {FEED_FILTER_OPTIONS.map(({ value, label, icon: Icon }) => {
          const active = value === filter;

          return (
            <Box component="li" key={value ?? 'ALL'} sx={{ flexShrink: 0 }}>
              <Link
                href={feedHref(tab, value)}
                underline="none"
                aria-current={active ? 'page' : undefined}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  minHeight: 44,
                  px: 2,
                  borderRadius: 999,
                  typography: 'body2',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  border: 1,
                  borderColor: active ? 'var(--ink-900)' : 'var(--line-strong)',
                  bgcolor: active ? 'var(--ink-900)' : 'var(--paper)',
                  color: active ? 'var(--paper)' : 'text.primary',
                  transition:
                    'background-color var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease)',
                }}
              >
                <Icon size={16} aria-hidden />
                {t(label)}
              </Link>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
