import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { formatCount, useLocale } from '@/common/i18n';

import { matches, motionAllowed, PHONE, useSeenOnce } from './motion-hooks';
import { VISUALLY_HIDDEN } from './visually-hidden';

/**
 * Движение на сайте — одним модулем, без библиотеки (`motion-design`: CSS и
 * свои хуки закрывают всё, что нужно сайту; библиотека ради счётчика и
 * проявления — лишние килобайты в бюджете консоли, ТС 8.1).
 *
 * Три приёма, у каждого своя работа:
 * - счёт до числа — рейтинг и счётчики «растут» при первом показе: число
 *   читается как результат, а не как подпись (иерархия);
 * - проявление снизу — блок появляется, когда до него доскроллили: глаз
 *   идёт за новым (непрерывность);
 * - рисование графика — линия рейтинга тянется слева направо: история
 *   читается как путь (иерархия).
 *
 * Всё срабатывает один раз — при первом попадании в экран. «Уменьшить
 * движение» в системе выключает всё: CSS гасит общий блок в `styles.css`,
 * а счёт до числа проверяет настройку сам — он на JS.
 *
 * Без `IntersectionObserver` (тесты в jsdom, старые браузеры) сразу виден
 * итог: движение — украшение, его отсутствие ничего не ломает.
 */

/** Выход «out-quint» — быстрый старт и мягкая посадка на итоговое число. */
function easeOut(t: number): number {
  return 1 - (1 - t) ** 5;
}

/**
 * Число, которое при первом показе растёт от нуля до итога.
 *
 * Итог виден чтецу экрана сразу (скрытой строкой), а бегущие цифры от него
 * спрятаны: иначе он прочитал бы «0, 37, 214…». Цифры моноширинные
 * (`tabular-nums` у родителя), поэтому строка не дрожит по ширине.
 * Последующие смены числа — без счёта: фильтр или новая страница не
 * должны каждый раз устраивать представление.
 */
export function CountUp({
  value,
  format,
  duration = 900,
}: {
  readonly value: number;
  readonly format: (value: number) => string;
  /** Длительность на широком экране; на телефоне — на 20% короче. */
  readonly duration?: number;
}): ReactNode {
  // Счёт — как только число хоть немного видно: ждущий «0» у нижнего края
  // экрана читается как настоящий ноль.
  const [ref, seen] = useSeenOnce('0px');
  const [shown, setShown] = useState<number | null>(() => (motionAllowed() ? 0 : null));
  const done = useRef(!motionAllowed());

  useEffect(() => {
    if (!seen || done.current) return undefined;
    done.current = true;

    const total = matches(PHONE) ? duration * 0.8 : duration;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number): void => {
      const progress = Math.min(1, (now - start) / total);
      setShown(progress >= 1 ? null : value * easeOut(progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
    };
    // Счёт запускается один раз, при первом показе; дальше число меняется
    // без счёта — `value` в зависимостях перезапускал бы представление.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen]);

  const final = format(value);
  if (shown === null) return <span ref={ref}>{final}</span>;

  return (
    <span ref={ref}>
      <span aria-hidden>{format(shown)}</span>
      <Box component="span" sx={VISUALLY_HIDDEN}>
        {final}
      </Box>
    </span>
  );
}

/**
 * Проявление снизу при первом показе: прозрачность и сдвиг на 12 точек, без
 * свойств раскладки. `delay` — для очереди карточек в ряду; потолок 360 мс,
 * чтобы двадцатая карточка не ждала секунду.
 */
export function Reveal({
  children,
  delay = 0,
  component = 'div',
  sx,
}: {
  readonly children: ReactNode;
  readonly delay?: number;
  readonly component?: 'div' | 'li' | 'section';
  readonly sx?: SxProps<Theme>;
}): ReactNode {
  const [ref, seen] = useSeenOnce();
  const [animated] = useState(motionAllowed);

  return (
    <Box
      ref={ref}
      component={component}
      sx={sx}
      data-reveal={animated ? (seen ? 'in' : 'wait') : undefined}
      style={animated ? { transitionDelay: `${String(Math.min(delay, 360))}ms` } : undefined}
    >
      {children}
    </Box>
  );
}

/** Счётчик с разрядами по языку («1 248»), растущий при первом показе. */
export function Count({ value }: { readonly value: number }): ReactNode {
  const locale = useLocale();
  return <CountUp value={value} format={(shown) => formatCount(Math.round(shown), locale)} />;
}
