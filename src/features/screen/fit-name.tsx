import Box from '@mui/material/Box';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** Сжатие по ширине: ось `wdth` у кириллицы Roboto Flex даёт немного, но даёт. */
const STRETCH = 75;

/** Мельче — имя перестаёт читаться рядом с соседними. */
const SMALLEST = 0.78;

/**
 * Имя, которое помещается: сначала сжимается по ширине, потом — кеглем до
 * 78 %, и только если не хватило и этого — многоточие. Обрезанная фамилия на
 * стене не читается, чуть меньшая — читается.
 *
 * Ширина замеряется по месту: ось `wdth` у кириллицы сжимает буквы куда
 * слабее процента, и расчёт на глаз оставлял «Абдрахманов…».
 */
export default function FitName({
  text,
  width,
  font,
}: {
  readonly text: string;
  /** Место под имя в пикселях сцены — для первого кадра. */
  readonly width: number;
  /** Кегль в пикселях сцены. */
  readonly font: number;
}): ReactNode {
  const box = useRef<HTMLSpanElement>(null);
  const [fit, setFit] = useState<{ stretch: number; scale: number }>({ stretch: 100, scale: 1 });

  useLayoutEffect(() => {
    const element = box.current;

    // В тестовом окружении размеров нет — имя остаётся как есть.
    if (element === null || element.clientWidth === 0) {
      return;
    }

    const measure = (): void => {
      const overflows = (): boolean => element.scrollWidth > element.clientWidth + 1;
      element.style.fontStretch = '100%';
      element.style.fontSize = '1em';

      if (!overflows()) {
        setFit({ stretch: 100, scale: 1 });
        return;
      }

      element.style.fontStretch = `${String(STRETCH)}%`;
      const ratio = element.clientWidth / element.scrollWidth;
      const scale = ratio >= 1 ? 1 : Math.max(SMALLEST, Math.floor(ratio * 98) / 100);
      setFit({ stretch: STRETCH, scale });
    };

    measure();
    // Шрифт стены грузится не сразу: до него замер шёл по запасному.
    let alive = true;
    void document.fonts.ready.then(() => {
      if (alive) measure();
    });

    return () => {
      alive = false;
    };
  }, [text, width, font]);

  return (
    <Box
      ref={box}
      component="span"
      sx={{
        display: 'block',
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
      style={
        fit.stretch < 100
          ? { fontStretch: `${String(fit.stretch)}%`, fontSize: `${String(fit.scale)}em` }
          : undefined
      }
    >
      {text}
    </Box>
  );
}
