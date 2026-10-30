/**
 * Кегль и сцена экрана зала — ADR-082.
 *
 * Стена рисуется на постоянной сцене 1920×1080 и равномерно вписывается в
 * любой телевизор (`Stage`). Пиксели ТВ значения не имеют: 32″ на 1366×768 и
 * 32″ на 1920×1080 физически одного размера, и доля экрана у кегля на них
 * одна. Зато то, что видно на снимке 1920, на любом ТВ стоит ровно так же:
 * раньше размеры считались от ширины окна, и сетка уезжала за край.
 *
 * Единица — сотая ширины сцены: `size(1)` — 19,2 пикселя сцены.
 */
export const STAGE_WIDTH = 1920;
export const STAGE_HEIGHT = 1080;

export function size(units: number): string {
  return `${String(Math.round(units * 19.2))}px`;
}

/**
 * Пять кеглей стены (правило website-quality): подпись, текст, имя, крупное,
 * номер. На 43″ кегль `xs` — буква около 8 мм, читается с 3–4 метров.
 */
export const TYPE = { xs: 16, s: 20, m: 24, l: 32, xl: 48 } as const;

export const DISPLAY = 'var(--font-mono)';

/**
 * Подложка в цвет статуса: сам цвет из токенов, прозрачность — здесь.
 * Сплошная заливка зелёным или красным на всю ячейку спорит с цифрами,
 * подложка оставляет их главными.
 */
export function tint(token: 'ok' | 'red-600' | 'warn', percent: number): string {
  return `color-mix(in srgb, var(--${token}) ${String(percent)}%, transparent)`;
}

/** Заголовок блока стены: читается с десяти метров, но не спорит с данными. */
export const BOARD_TITLE = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: '16px',
  m: 0,
  fontSize: `${String(TYPE.m)}px`,
  lineHeight: 1.2,
  fontWeight: 700,
  // Без капслока и цветной черты: заголовок блока — подпись к данным, а не
  // ещё один яркий элемент на стене (жалоба владельца, октябрь 2026).
  color: 'text.primary',
} as const;

/** Скрыто от глаза, видно чтецу экрана. Ширина в пикселях: `width: 1` в MUI — это 100 %. */
export const VISUALLY_HIDDEN = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;
