import { useEffect, useState } from 'react';

/**
 * Хуки движения — отдельно от компонентов в `motion.tsx` (быстрая
 * перезагрузка Vite требует, чтобы файл компонентов экспортировал только
 * компоненты). Зачем и как сайт двигается — там же, в `motion.tsx`.
 */

const REDUCED = '(prefers-reduced-motion: reduce)';
export const PHONE = '(max-width: 639.95px)';

export function matches(query: string): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : false;
}

/** Можно ли двигать: есть наблюдатель и человек не просил покоя. */
export function motionAllowed(): boolean {
  return typeof IntersectionObserver !== 'undefined' && !matches(REDUCED);
}

/**
 * Попал ли элемент в экран — один раз и навсегда. Без наблюдателя — сразу
 * «да»: показываем итог.
 */
export function useSeenOnce(margin = '0px 0px -8% 0px'): [(node: Element | null) => void, boolean] {
  // Ссылка-колбэк, а не `useRef`: график и «Форма» рисуются только после
  // загрузки данных, и наблюдатель должен встать на элемент, когда тот
  // появится, а не на пустое место первого рендера.
  const [node, setNode] = useState<Element | null>(null);
  const [seen, setSeen] = useState(() => !motionAllowed());

  useEffect(() => {
    if (seen || node === null) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      // По умолчанию — когда элемент поднялся над нижним краем экрана:
      // проявление видно целиком, а не проходит за краем.
      { rootMargin: margin },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [node, seen, margin]);

  return [setNode, seen];
}

/**
 * Группа с движением внутри: график, полоса, ряд точек. Возвращает ссылку
 * и значение `data-motion` для контейнера — `wait` до показа, `in` после,
 * без атрибута, если двигать нельзя. Что именно двигается, решают классы
 * детей в `styles.css`: `motion-draw`, `motion-fade`, `motion-grow-x`,
 * `motion-grow-y`, `motion-pop`.
 */
export function useMotionGroup(): [(node: Element | null) => void, 'wait' | 'in' | undefined] {
  const [ref, seen] = useSeenOnce();
  const [animated] = useState(motionAllowed);
  return [ref, animated ? (seen ? 'in' : 'wait') : undefined];
}
