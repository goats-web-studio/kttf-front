import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useMatchRoute } from '@tanstack/react-router';
import { ChevronDown } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import { useT } from '@/common/i18n';

import { NAV_MENUS, navMenuKey } from './nav-menus';

/** Задержки наведения: не открывать от пролёта мыши и не гасить от дрожи. */
const OPEN_DELAY = 120;
const CLOSE_DELAY = 180;

/**
 * Пункт шапки с меню быстрых переходов.
 *
 * Сам пункт остаётся ссылкой в раздел — нажатие ведёт туда же, куда и
 * раньше. Меню открывается наведением (с задержкой, чтобы не мигать от
 * пролёта мыши к другому пункту) и с клавиатуры стрелкой вниз; Escape
 * закрывает и возвращает фокус на пункт. Уход фокуса из меню закрывает его.
 *
 * Панель висит под пунктом на прозрачной подложке-мостике: между пунктом
 * и панелью нет щели, в которой меню закрылось бы по дороге мыши.
 */
export default function NavDropdown({
  to,
  label,
}: {
  readonly to: string;
  readonly label: string;
}): ReactNode {
  const t = useT();
  const matchRoute = useMatchRoute();
  const active = matchRoute({ to, fuzzy: true }) !== false;
  const items = NAV_MENUS[to] ?? [];
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const trigger = useRef<HTMLAnchorElement>(null);
  const panel = useRef<HTMLUListElement>(null);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
    },
    [],
  );

  const later = (next: boolean, delay: number): void => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setOpen(next);
    }, delay);
  };

  const close = (): void => {
    window.clearTimeout(timer.current);
    setOpen(false);
  };

  const focusItem = (index: number): void => {
    const links = panel.current?.querySelectorAll<HTMLAnchorElement>('a');
    if (links === undefined || links.length === 0) return;
    links[(index + links.length) % links.length]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      close();
      trigger.current?.focus();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    event.preventDefault();
    const links = [...(panel.current?.querySelectorAll<HTMLAnchorElement>('a') ?? [])];
    const current = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (!open) {
      setOpen(true);
      // Панель появится в следующем кадре — фокус на первый пункт после неё.
      requestAnimationFrame(() => {
        focusItem(0);
      });
      return;
    }
    focusItem(current + (event.key === 'ArrowDown' ? 1 : -1));
  };

  const onBlur = (event: FocusEvent<HTMLDivElement>): void => {
    if (!event.currentTarget.contains(event.relatedTarget)) close();
  };

  if (items.length === 0) {
    return (
      <Button variant="text" color={active ? 'primary' : 'secondary'} href={to}>
        {label}
      </Button>
    );
  }

  return (
    <Box
      sx={{ position: 'relative' }}
      onMouseEnter={() => {
        later(true, OPEN_DELAY);
      }}
      onMouseLeave={() => {
        later(false, CLOSE_DELAY);
      }}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    >
      <Button
        ref={trigger}
        variant="text"
        color={active ? 'primary' : 'secondary'}
        href={to}
        aria-current={active ? 'page' : undefined}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        endIcon={
          <Box
            component="span"
            aria-hidden
            sx={{
              display: 'inline-flex',
              transition: 'transform var(--dur-base) var(--ease)',
              transform: open ? 'rotate(180deg)' : 'none',
              opacity: 0.6,
            }}
          >
            <ChevronDown size={14} />
          </Box>
        }
        sx={{
          minHeight: 44,
          fontWeight: active ? 600 : 500,
          '& .MuiButton-endIcon': { ml: 0.25 },
        }}
      >
        {label}
      </Button>

      {open && (
        <Box
          sx={{
            position: 'absolute',
            top: '100%',
            left: -8,
            pt: 1,
            zIndex: 'var(--z-dropdown)',
          }}
        >
          <Paper
            id={panelId}
            className="tab-panel-in"
            elevation={0}
            sx={{
              width: 320,
              p: 1,
              borderRadius: 3,
              border: 1,
              borderColor: 'divider',
              boxShadow: 'var(--shadow-card-hover)',
            }}
          >
            <Box
              component="ul"
              ref={panel}
              aria-label={label}
              sx={{ listStyle: 'none', m: 0, p: 0 }}
            >
              {items.map(({ href, icon: Icon, key }) => (
                <Box component="li" key={key}>
                  <Link
                    href={href}
                    underline="none"
                    color="inherit"
                    onClick={close}
                    sx={{
                      display: 'flex',
                      gap: 1.5,
                      alignItems: 'flex-start',
                      p: 1.25,
                      borderRadius: 2,
                      '&:hover, &:focus-visible': { bgcolor: 'var(--paper-sunken)' },
                      '&:hover .nav-menu-icon': { color: 'var(--red-600)' },
                    }}
                  >
                    <Box
                      aria-hidden
                      className="nav-menu-icon"
                      sx={{
                        width: 32,
                        height: 32,
                        flexShrink: 0,
                        borderRadius: 2,
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: 'var(--red-50)',
                        color: 'var(--red-500)',
                        transition: 'color var(--dur-fast) var(--ease)',
                      }}
                    >
                      <Icon size={16} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: 15, lineHeight: '20px' }}>
                        {t(navMenuKey(key, 'title'))}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        {t(navMenuKey(key, 'text'))}
                      </Typography>
                    </Box>
                  </Link>
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );
}
