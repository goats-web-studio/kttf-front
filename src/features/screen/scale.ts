/**
 * Кегль экрана зала.
 *
 * Стена — это телевизор любого размера: 32 дюйма в маленьком клубе и
 * 65 в спортзале, HD и 4K. Кегль в пикселях на одном из них мелок, на другом
 * огромен, поэтому всё считается от ширины экрана. Единица — сотая ширины
 * при 1920 пикселях: `size(1)` там равен 19,2 пикселя.
 *
 * Нижняя граница держит читаемость, если экран открыли в окне браузера
 * на ноутбуке, — например, чтобы проверить ссылку перед турниром.
 */
export function size(units: number): string {
  return `clamp(${String(Math.round(units * 12))}px, ${String(units)}vw, ${String(Math.round(units * 40))}px)`;
}

export const DISPLAY = "'Oswald', system-ui, sans-serif";

/**
 * Подложка в цвет статуса: сам цвет из токенов, прозрачность — здесь.
 * Сплошная заливка зелёным или красным на всю ячейку спорит с цифрами,
 * подложка оставляет их главными.
 */
export function tint(token: 'night-ok' | 'night-red' | 'night-warn', percent: number): string {
  return `color-mix(in srgb, var(--${token}) ${String(percent)}%, transparent)`;
}

/** Заголовок блока стены: читается с десяти метров, но не спорит с данными. */
export const BOARD_TITLE = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.6vw',
  fontSize: size(1.15),
  lineHeight: 1.2,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'text.secondary',
  '&::before': {
    content: '""',
    width: '0.35vw',
    height: '1.1em',
    borderRadius: 1,
    bgcolor: 'primary.main',
  },
} as const;
