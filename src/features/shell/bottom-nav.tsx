import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import {
  CalendarDays,
  MapPin,
  MessagesSquare,
  ShoppingBag,
  Trophy,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

import { useT } from '@/common/i18n';
import RouterLink from '@/common/ui/router-link';

import { useActiveSection } from './active-section';
import { NAV_MENUS, navMenuKey } from './nav-menus';
import { SECTIONS } from './sections';

/** Высота панели — по ней оболочка оставляет место под подвал. */
export const BOTTOM_NAV_HEIGHT = 64;

/** Иконки разделов. Только вместе с подписью — запрет №11. */
const ICONS: Readonly<Record<string, LucideIcon>> = {
  '/tournaments': CalendarDays,
  '/players': Trophy,
  '/clubs': MapPin,
  '/forum': MessagesSquare,
  '/market': ShoppingBag,
};

/**
 * Разделы на телефоне — docs/07-design-system.md, раздел 4: «мобильный —
 * нижняя панель навигации».
 *
 * Иконка над подписью: по ней раздел находят большим пальцем, не читая.
 * Подпись остаётся всегда — иконка без подписи в основной навигации —
 * запрет №11 той же системы.
 *
 * «Сообщество» открывает лист снизу с тем же меню, что в шапке: лента,
 * форум, дуэли (ADR-097). У остальных разделов вход один, у сообщества —
 * несколько равных, и выбирать их надо до перехода, а не после.
 */
export default function BottomNav(): ReactNode {
  const t = useT();
  const current = useActiveSection();
  const [sheet, setSheet] = useState(false);
  const sheetId = useId();

  return (
    <>
      <Paper
        component="nav"
        aria-label={t('nav.sections')}
        square
        elevation={0}
        sx={{
          display: { xs: 'block', sm: 'none' },
          position: 'fixed',
          insetInline: 0,
          bottom: 0,
          zIndex: 'appBar',
          borderTop: 1,
          borderColor: 'divider',
          pb: 'env(safe-area-inset-bottom)',
        }}
      >
        <BottomNavigation
          showLabels
          value={current?.to ?? false}
          sx={{ height: BOTTOM_NAV_HEIGHT }}
        >
          {SECTIONS.map((section) => {
            const Icon = ICONS[section.to];
            const menu = section.to === SHEET_SECTION;

            return (
              <BottomNavigationAction
                key={section.to}
                value={section.to}
                label={t(section.label)}
                {...(Icon === undefined ? {} : { icon: <Icon size={22} aria-hidden /> })}
                {...(menu
                  ? {
                      component: 'button',
                      'aria-haspopup': 'dialog',
                      'aria-expanded': sheet,
                      'aria-controls': sheet ? sheetId : undefined,
                      onClick: () => {
                        setSheet(true);
                      },
                    }
                  : { component: RouterLink, href: section.to })}
                aria-current={current?.to === section.to ? 'page' : undefined}
                // Подпись одного размера в выбранном и прочих пунктах: по
                // умолчанию MUI увеличивает выбранную, и соседние подписи едут.
                // Пять разделов в 360px: по 72px на пункт, и «Где играть» и
                // «Сообщество» влезают только без боковых полей и в 11px —
                // нижняя ступень шкалы (07, 3.5).
                sx={{
                  minWidth: 0,
                  px: 0.25,
                  gap: 0.25,
                  '& .MuiBottomNavigationAction-label, &.Mui-selected .MuiBottomNavigationAction-label':
                    {
                      typography: 'caption',
                      fontWeight: 600,
                      fontSize: { xs: 11, sm: 12 },
                      whiteSpace: 'nowrap',
                    },
                }}
              />
            );
          })}
        </BottomNavigation>
      </Paper>
      <CommunitySheet
        id={sheetId}
        open={sheet}
        onClose={() => {
          setSheet(false);
        }}
      />
    </>
  );
}

/** Раздел, который на телефоне открывает лист со своим меню. */
const SHEET_SECTION = '/forum';

/**
 * Лист «Сообщество» — пункты меню шапки (`NAV_MENUS`) строками под палец.
 * Выезжает снизу трансформацией; при «меньше движения» — сразу.
 */
function CommunitySheet({
  id,
  open,
  onClose,
}: {
  readonly id: string;
  readonly open: boolean;
  readonly onClose: () => void;
}): ReactNode {
  const t = useT();
  const titleId = useId();
  const items = NAV_MENUS[SHEET_SECTION] ?? [];

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          id,
          role: 'dialog',
          'aria-labelledby': titleId,
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            pb: 'calc(8px + env(safe-area-inset-bottom))',
            maxHeight: '80vh',
          },
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pl: 2,
          pr: 1,
          pt: 1,
        }}
      >
        <Typography id={titleId} variant="h3" component="h2">
          {t('nav.community')}
        </Typography>
        <IconButton
          aria-label={t('nav.sheet.close')}
          onClick={onClose}
          sx={{ width: 44, height: 44 }}
        >
          <X size={20} aria-hidden />
        </IconButton>
      </Box>
      <Box component="ul" data-community-sheet sx={{ listStyle: 'none', m: 0, px: 1, pb: 1 }}>
        {items.map(({ href, icon: Icon, key }) => (
          <Box component="li" key={key}>
            <Link
              href={href}
              underline="none"
              color="inherit"
              onClick={onClose}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                minHeight: 48,
                px: 1,
                borderRadius: 2,
                fontWeight: 600,
                '&:active': { bgcolor: 'var(--paper-sunken)' },
              }}
            >
              <Box
                aria-hidden
                sx={{
                  width: 32,
                  height: 32,
                  flexShrink: 0,
                  borderRadius: 2,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'var(--red-50)',
                  color: 'var(--red-500)',
                }}
              >
                <Icon size={16} />
              </Box>
              {t(navMenuKey(key, 'title'))}
            </Link>
          </Box>
        ))}
      </Box>
    </Drawer>
  );
}
