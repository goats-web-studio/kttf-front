import { enUS, jaJP, koKR, zhCN } from '@mui/material/locale';
import {
  enUS as pickersEnUS,
  jaJP as pickersJaJP,
  koKR as pickersKoKR,
  zhCN as pickersZhCN,
} from '@mui/x-date-pickers/locales';
import 'dayjs/locale/ja';
import 'dayjs/locale/ko';
import 'dayjs/locale/zh';

/**
 * Встроенные строки MUI и календарей для языков вне основного бандла.
 * Грузятся вместе со словарём языка — `theme.tsx`.
 */
export const LAZY_MUI_LOCALES = {
  en: [enUS, pickersEnUS],
  zh: [zhCN, pickersZhCN],
  ko: [koKR, pickersKoKR],
  ja: [jaJP, pickersJaJP],
} as const;
