import Box from '@mui/material/Box';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Средняя ширина буквы Roboto Flex в долях кегля — для первого кадра, до
 * замера: так длинная фамилия не мелькает многоточием.
 */
const LETTER = 0.64;

/** Уже — буквы слипаются издалека. */
const NARROWEST = 65;

function guess(text: string, width: number, font: number): number {
  const natural = text.length * font * LETTER;

  return natural <= width ? 100 : Math.max(NARROWEST, Math.floor((width / natural) * 100));
}

/**
 * Имя, которое помещается: сначала сжимается по ширине (ось `wdth` у Roboto
 * Flex), и только если не хватило и этого — многоточие. Обрезанная фамилия
 * на стене не читается, сжатая — читается.
 *
 * Ширина замеряется по месту: ось `wdth` сжимает буквы не пропорционально
 * проценту, и расчёт на глаз оставлял «Абдрахманов…».
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
  const [stretch, setStretch] = useState(() => guess(text, width, font));

  useLayoutEffect(() => {
    const element = box.current;

    // В тестовом окружении размеров нет: остаётся оценка.
    if (element === null || element.clientWidth === 0) {
      return;
    }

    const measure = (): void => {
      let current = 100;
      element.style.fontStretch = '100%';

      // Два-три шага хватает: ширина почти линейна по оси между 65 и 100 %.
      for (let step = 0; step < 4 && element.scrollWidth > element.clientWidth + 1; step++) {
        const ratio = element.clientWidth / element.scrollWidth;
        current = Math.max(NARROWEST, Math.floor(current * ratio * 0.98));
        element.style.fontStretch = `${String(current)}%`;

        if (current === NARROWEST) break;
      }

      setStretch(current);
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
      style={stretch < 100 ? { fontStretch: `${String(stretch)}%` } : undefined}
    >
      {text}
    </Box>
  );
}
