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

const FONT_UI = "'Geologica', system-ui, sans-serif";

/**
 * Ширина содержимого страниц. Колонка в 900px на широком экране оставляла
 * по краям пустоту шире самой страницы; 1280 — двенадцать колонок рейтинга
 * и календаря рядом, а строка текста всё ещё читается.
 */
export const CONTENT_WIDTH = 1280;

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
  // Страница на тёплой подложке, белые только поверхности: сплошной белый
  // экран с таблицами утомляет глаз за пять минут.
  page: 'var(--paper-sunken)',
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
  const light = tokens.mode === 'light';

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
      // База — 4px: на ней считаются `borderRadius: n` в sx (n × 4px), в том
      // числе в консоли и на экране зала. Скругления «Спорт-модерн» заданы
      // явно ниже: поля и кнопки — 10, карточки — 16, чипы и вкладки — пилюлей.
      shape: { borderRadius: 4 },
      // Раздел 3.5: Geologica для всего текста, заголовки — насыщенностью и
      // плотной разрядкой. Числа набираются JetBrains Mono (--font-mono) по месту.
      typography: {
        fontFamily: FONT_UI,
        fontSize: 15,
        htmlFontSize: 16,
        h1: { fontWeight: 700, fontSize: 30, lineHeight: '36px', letterSpacing: '-0.02em' },
        h2: { fontWeight: 600, fontSize: 22, lineHeight: '28px', letterSpacing: '-0.01em' },
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
      // Тени уровней MUI — для всплывающего. Тень карточки своя, мягкая,
      // задана у Paper ниже.
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
        MuiLink: {
          // Ссылка чернильная, красной становится только под курсором.
          // Красные названия турниров и имена соперников в каждой строке
          // таблицы съедали правило «красный — меньше 5% экрана» (3.1).
          defaultProps: { component: RouterLink, underline: 'hover', color: 'text.primary' },
          styleOverrides: {
            root: {
              transition: 'color var(--dur-fast) var(--ease)',
              '&:hover': { color: tokens.primary },
            },
          },
        },
        MuiButton: {
          // Умолчание нейтральное: главное действие одно на экран и
          // называется явно — `variant="contained"` (запрет №2, ADR-039).
          defaultProps: { variant: 'outlined', color: 'secondary', disableElevation: true },
          styleOverrides: {
            root: { minHeight: 40, paddingInline: 16, borderRadius: 10, fontWeight: 600 },
            sizeSmall: { minHeight: 32, paddingInline: 12, fontSize: 13, borderRadius: 8 },
            sizeLarge: { minHeight: 48, paddingInline: 22, borderRadius: 12 },
            // Залитая кнопка — главное действие, и она всегда фирменного цвета:
            // нейтральное умолчание иначе красило бы её в чёрный.
            contained: ({ ownerState }) =>
              ownerState.color === 'secondary'
                ? {
                    backgroundColor: tokens.primary,
                    color: onPrimary,
                    // Лёгкая цветная тень: главная кнопка «стоит» над карточкой.
                    boxShadow: light
                      ? '0 1px 2px rgb(196 35 28 / 0.25), 0 4px 12px rgb(196 35 28 / 0.18)'
                      : 'none',
                    '&:hover': { backgroundColor: tokens.primaryDark },
                  }
                : {},
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
              borderRadius: 10,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.lineStrong },
            },
          },
        },
        MuiInputLabel: { styleOverrides: { root: { color: tokens.ink700 } } },
        MuiContainer: {
          // Все страницы на `maxWidth="lg"`: одна ширина на сайт, шапка и
          // содержимое стоят по одной вертикали.
          styleOverrides: {
            maxWidthLg: { '@media (min-width: 1200px)': { maxWidth: CONTENT_WIDTH } },
          },
        },
        MuiPaper: {
          defaultProps: { elevation: 0 },
          // Карточка-поверхность: белая, скруглённая, с мягкой тенью. На
          // тёплой подложке она отделяет блок без жирной рамки.
          styleOverrides: {
            outlined: {
              borderColor: tokens.line,
              borderRadius: 16,
              ...(light ? { boxShadow: 'var(--shadow-card)' } : {}),
            },
          },
        },
        MuiCard: { defaultProps: { variant: 'outlined' } },
        MuiChip: {
          styleOverrides: {
            root: { borderRadius: 999, fontWeight: 500 },
            outlined: { borderColor: tokens.lineStrong },
          },
        },
        // Вкладки — переключатель-пилюля: дорожка и белая «таблетка» на
        // выбранной. Читается как управление, а не как подчёркнутый текст.
        MuiTabs: {
          styleOverrides: {
            root: light
              ? {
                  minHeight: 44,
                  padding: 4,
                  borderRadius: 14,
                  backgroundColor: 'var(--ink-100)',
                  width: 'fit-content',
                  maxWidth: '100%',
                }
              : {},
            // «Таблетка» выбранной вкладки — это индикатор MUI: он сам едет
            // от вкладки к вкладке, и переключение читается движением, а не
            // скачком. Анимируются только left и width самого индикатора —
            // раскладка вокруг не пересчитывается.
            indicator: light
              ? {
                  top: 0,
                  bottom: 'auto',
                  height: '100%',
                  borderRadius: 10,
                  backgroundColor: tokens.paper,
                  boxShadow: '0 1px 2px rgb(31 31 29 / 0.08), 0 1px 6px rgb(31 31 29 / 0.06)',
                  zIndex: 0,
                  transition: 'left var(--dur-base) var(--ease), width var(--dur-base) var(--ease)',
                }
              : {},
            list: light ? { gap: 4 } : {},
          },
        },
        MuiTab: {
          styleOverrides: {
            root: light
              ? {
                  minHeight: 36,
                  minWidth: 0,
                  padding: '6px 16px',
                  borderRadius: 10,
                  fontWeight: 600,
                  textTransform: 'none',
                  color: tokens.ink700,
                  // Текст над едущей «таблеткой» индикатора.
                  position: 'relative',
                  zIndex: 1,
                  transition: 'color var(--dur-base) var(--ease)',
                  '&:hover': { color: tokens.ink900 },
                  '&.Mui-selected': { color: tokens.ink900 },
                  // Обводка фокуса внутри пилюли: снаружи она резала дорожку.
                  '&.Mui-focusVisible': { outlineOffset: -2 },
                }
              : {},
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
            head: { color: tokens.ink500, fontSize: 12, fontWeight: 500 },
            // Таблицы живут в карточках: липкая шапка непрозрачна и белая,
            // как сама карточка.
            stickyHeader: { backgroundColor: tokens.paper },
          },
        },
        MuiTableContainer: { defaultProps: { component: 'div' } },
        // У последней строки нет нижней линейки: её роль играет край карточки.
        MuiTableRow: {
          styleOverrides: { root: { '&:last-child > td, &:last-child > th': { borderBottom: 0 } } },
        },
        MuiAlert: {
          // Ошибка — фон, левая линейка и текст (раздел 3.4), а не цветной блок.
          styleOverrides: {
            root: { borderLeft: '3px solid', borderRadius: 10 },
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
        MuiDialog: { styleOverrides: { paper: { borderRadius: 20 } } },
        MuiMenu: { styleOverrides: { paper: { borderRadius: 12 } } },
        MuiPopover: { styleOverrides: { paper: { borderRadius: 12 } } },
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
