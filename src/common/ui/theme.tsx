import CssBaseline from '@mui/material/CssBaseline';
import GlobalStyles from '@mui/material/GlobalStyles';
import { kkKZ, ruRU } from '@mui/material/locale';
import { createTheme, StyledEngineProvider, ThemeProvider, type Theme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { ruRU as pickersRuRU } from '@mui/x-date-pickers/locales';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/kk';
import 'dayjs/locale/ru';
import { useMemo, type ReactNode } from 'react';

import { useLocale, type Locale } from '@/common/i18n';

import RouterLink from './router-link';

/**
 * Тема MUI из токенов дизайн-системы — ADR-041.
 *
 * Цвета не повторяются здесь значениями: палитра ссылается на переменные
 * `styles.css` (`nativeColor` — прозрачности MUI считает через `color-mix`),
 * и файл токенов остаётся единственным местом с цветами (ADR-038).
 *
 * Две темы, а не светлая с инверсией: у консоли и экрана зала свой набор
 * `--night-*` с контрастом AAA (раздел 3.3, запрет №7).
 */

const FONT_UI = "'Inter', system-ui, sans-serif";
const FONT_DISPLAY = "'Oswald', system-ui, sans-serif";

interface Tokens {
  readonly mode: 'light' | 'dark';
  readonly paper: string;
  readonly page: string;
  readonly hover: string;
  readonly line: string;
  readonly lineStrong: string;
  readonly ink900: string;
  readonly ink700: string;
  readonly ink500: string;
  readonly primary: string;
  readonly primaryDark: string;
  readonly primaryLight: string;
  readonly error: string;
  readonly ok: string;
  readonly warn: string;
}

const LIGHT: Tokens = {
  mode: 'light',
  paper: 'var(--paper)',
  page: 'var(--paper)',
  hover: 'var(--paper-hover)',
  line: 'var(--line)',
  lineStrong: 'var(--line-strong)',
  ink900: 'var(--ink-900)',
  ink700: 'var(--ink-700)',
  ink500: 'var(--ink-500)',
  primary: 'var(--red-600)',
  primaryDark: 'var(--red-700)',
  primaryLight: 'var(--red-50)',
  error: 'var(--red-700)',
  ok: 'var(--ok)',
  warn: 'var(--warn-text)',
};

const NIGHT: Tokens = {
  mode: 'dark',
  paper: 'var(--night-raised)',
  page: 'var(--night)',
  hover: 'var(--night-line)',
  line: 'var(--night-line)',
  lineStrong: 'var(--night-line-strong)',
  ink900: 'var(--night-ink-900)',
  ink700: 'var(--night-ink-700)',
  ink500: 'var(--night-ink-500)',
  primary: 'var(--night-red)',
  primaryDark: 'var(--night-red)',
  primaryLight: 'var(--night-line)',
  error: 'var(--night-red)',
  ok: 'var(--night-ok)',
  warn: 'var(--night-warn)',
};

/**
 * Встроенные строки MUI — подписи пагинации, «Нет вариантов», кнопки
 * календаря — по языку интерфейса, а не английские (бриф 3.4). У календарей
 * казахского пакета нет: там русский, его в Казахстане читают все.
 */
const MUI_LOCALES = {
  ru: [ruRU, pickersRuRU],
  kk: [kkKZ, pickersRuRU],
} as const satisfies Record<Locale, readonly object[]>;

function build(tokens: Tokens, locale: Locale): Theme {
  const onPrimary = tokens.mode === 'light' ? '#ffffff' : 'var(--night)';

  return createTheme(
    {
      cssVariables: { nativeColor: true, cssVarPrefix: 'mui' },
      palette: {
        mode: tokens.mode,
        primary: {
          main: tokens.primary,
          dark: tokens.primaryDark,
          light: tokens.primaryLight,
          contrastText: onPrimary,
        },
        // «Вторичный» в MUI — нейтральный чернильный: у нас второго акцента
        // нет, красный один (раздел 3.1).
        secondary: {
          main: tokens.ink900,
          dark: tokens.ink900,
          light: tokens.ink700,
          contrastText: tokens.paper,
        },
        error: {
          main: tokens.error,
          dark: tokens.error,
          light: tokens.primaryLight,
          contrastText: onPrimary,
        },
        success: { main: tokens.ok, dark: tokens.ok, light: tokens.ok, contrastText: '#ffffff' },
        warning: {
          main: tokens.warn,
          dark: tokens.warn,
          light: tokens.warn,
          contrastText: '#ffffff',
        },
        info: {
          main: tokens.ink700,
          dark: tokens.ink900,
          light: tokens.ink500,
          contrastText: tokens.paper,
        },
        text: { primary: tokens.ink900, secondary: tokens.ink700, disabled: tokens.ink500 },
        background: { default: tokens.page, paper: tokens.paper },
        divider: tokens.line,
        action: { hover: tokens.hover, selected: tokens.hover },
      },
      shape: { borderRadius: 4 },
      // Раздел 3.5: Inter для интерфейса, Oswald для заголовков и крупных чисел.
      typography: {
        fontFamily: FONT_UI,
        fontSize: 15,
        htmlFontSize: 16,
        h1: { fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 30, lineHeight: '32px' },
        h2: { fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 22, lineHeight: '26px' },
        h3: { fontWeight: 600, fontSize: 17, lineHeight: '26px' },
        h4: { fontWeight: 600, fontSize: 15, lineHeight: '24px' },
        h5: { fontWeight: 600, fontSize: 15, lineHeight: '24px' },
        h6: { fontWeight: 600, fontSize: 13, lineHeight: '20px' },
        subtitle1: { fontWeight: 600, fontSize: 17, lineHeight: '26px' },
        subtitle2: { fontWeight: 500, fontSize: 13, lineHeight: '20px' },
        body1: { fontSize: 15, lineHeight: '24px' },
        body2: { fontSize: 13, lineHeight: '20px' },
        caption: { fontSize: 12, lineHeight: '18px' },
        overline: { fontSize: 11, lineHeight: '16px', letterSpacing: 0, textTransform: 'none' },
        // Заголовки капслоком запрещены (запрет №10), кнопки — тоже.
        button: { fontWeight: 500, fontSize: 15, textTransform: 'none', letterSpacing: 0 },
      },
      // У карточек теней нет, иерархию держат линейки (запрет №13).
      shadows: [
        'none',
        ...Array.from({ length: 7 }, () => 'var(--shadow-pop)'),
        ...Array.from({ length: 17 }, () => 'var(--shadow-modal)'),
      ] as Theme['shadows'],
      transitions: {
        duration: {
          shortest: 120,
          shorter: 120,
          short: 180,
          standard: 180,
          complex: 260,
          enteringScreen: 260,
          leavingScreen: 180,
        },
        easing: {
          easeInOut: 'cubic-bezier(0.2, 0, 0, 1)',
          easeOut: 'cubic-bezier(0.2, 0, 0, 1)',
          easeIn: 'cubic-bezier(0.2, 0, 0, 1)',
          sharp: 'cubic-bezier(0.2, 0, 0, 1)',
        },
      },
      breakpoints: { values: { xs: 0, sm: 640, md: 900, lg: 1200, xl: 1440 } },
      components: {
        MuiButtonBase: {
          // Кнопка с `href` становится ссылкой роутера: переход остаётся
          // переходом, со средней кнопкой мыши и «открыть в новой вкладке».
          defaultProps: { LinkComponent: RouterLink, disableRipple: true },
        },
        MuiLink: { defaultProps: { component: RouterLink, underline: 'hover' } },
        MuiButton: {
          // Умолчание нейтральное: главное действие одно на экран и
          // называется явно — `variant="contained"` (запрет №2, ADR-039).
          defaultProps: { variant: 'outlined', color: 'secondary', disableElevation: true },
          styleOverrides: {
            root: { minHeight: 40, paddingInline: 16 },
            sizeSmall: { minHeight: 32, paddingInline: 12, fontSize: 13 },
            sizeLarge: { minHeight: 48, paddingInline: 20 },
            outlined: ({ ownerState }) =>
              ownerState.color === 'secondary'
                ? { borderColor: tokens.lineStrong, backgroundColor: tokens.paper }
                : {},
          },
        },
        MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
        MuiFormControl: { defaultProps: { size: 'small', fullWidth: true } },
        MuiOutlinedInput: {
          styleOverrides: {
            root: {
              backgroundColor: tokens.paper,
              minHeight: 40,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.lineStrong },
            },
          },
        },
        MuiInputLabel: { styleOverrides: { root: { color: tokens.ink700 } } },
        MuiPaper: {
          defaultProps: { elevation: 0 },
          styleOverrides: { outlined: { borderColor: tokens.line } },
        },
        MuiCard: { defaultProps: { variant: 'outlined' } },
        MuiChip: {
          styleOverrides: {
            root: { borderRadius: 2, fontWeight: 500 },
            outlined: { borderColor: tokens.lineStrong },
          },
        },
        MuiTableCell: {
          styleOverrides: {
            // На телефоне по 8px с боков, а не 16: иначе пять колонок на 360px
            // вылезают за экран, и страница едет вбок.
            root: {
              borderColor: tokens.line,
              fontSize: 15,
              paddingInline: 8,
              '@media (min-width: 640px)': { paddingInline: 16 },
            },
            head: { color: tokens.ink500, fontSize: 13, fontWeight: 400 },
          },
        },
        MuiTableContainer: { defaultProps: { component: 'div' } },
        MuiAlert: {
          // Ошибка — фон, левая линейка и текст (раздел 3.4), а не цветной блок.
          styleOverrides: {
            root: { borderLeft: '3px solid', borderRadius: 4 },
            colorError: { borderColor: tokens.error, color: tokens.error },
            colorSuccess: { borderColor: tokens.ok },
            colorWarning: { borderColor: tokens.warn },
            colorInfo: {
              borderColor: tokens.lineStrong,
              backgroundColor: tokens.hover,
              color: tokens.ink900,
            },
          },
        },
        MuiTooltip: { defaultProps: { arrow: true } },
        MuiDialog: { styleOverrides: { paper: { borderRadius: 14 } } },
        MuiMenu: { styleOverrides: { paper: { borderRadius: 8 } } },
        MuiPopover: { styleOverrides: { paper: { borderRadius: 8 } } },
        MuiSkeleton: { defaultProps: { animation: 'pulse' } },
      },
    },
    ...MUI_LOCALES[locale],
  );
}

/**
 * Слои CSS: база Tailwind ниже MUI, утилиты Tailwind выше. Иначе preflight
 * сносит стили MUI, а MUI перебивает утилиты отступов в разметке.
 */
const LAYERS = '@layer theme, base, mui, components, utilities;';

interface ThemeRootProps {
  readonly theme?: 'light' | 'night';
  readonly children: ReactNode;
}

/**
 * Тема раздела. Ставится в оболочку раздела, а не в корень: консоль и экран
 * зала получают свою, тёмную.
 */
export default function ThemeRoot({ theme = 'light', children }: ThemeRootProps): ReactNode {
  const locale = useLocale();
  const built = useMemo(() => build(theme === 'night' ? NIGHT : LIGHT, locale), [theme, locale]);

  return (
    <StyledEngineProvider enableCssLayer>
      <GlobalStyles styles={LAYERS} />
      <ThemeProvider theme={built}>
        <CssBaseline enableColorScheme />
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={locale}>
          {children}
        </LocalizationProvider>
      </ThemeProvider>
    </StyledEngineProvider>
  );
}
