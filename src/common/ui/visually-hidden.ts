import type { SxProps, Theme } from '@mui/material/styles';

/**
 * Скрыто с экрана, но читается экранным диктором и остаётся в структуре
 * заголовков. Для подписей, которые глазу дублирует соседний элемент: панель
 * под вкладкой «Таблицы» не нуждается во втором «Таблицы» крупно.
 */
export const VISUALLY_HIDDEN: SxProps<Theme> = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
};
