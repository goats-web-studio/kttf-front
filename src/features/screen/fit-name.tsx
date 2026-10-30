import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

/**
 * Средняя ширина буквы Roboto Flex в долях кегля. Оценка, а не замер: сцена
 * постоянного размера (ADR-082), и ширина места под имя известна заранее.
 */
const LETTER = 0.62;

/** Уже — буквы слипаются издалека. */
const NARROWEST = 75;

/**
 * Имя, которое помещается: сначала сжимается по ширине (ось `wdth` у Roboto
 * Flex), и только если не хватило и этого — многоточие. Обрезанная фамилия
 * на стене не читается, сжатая — читается.
 */
export default function FitName({
  text,
  width,
  font,
}: {
  readonly text: string;
  /** Место под имя в пикселях сцены. */
  readonly width: number;
  /** Кегль в пикселях сцены. */
  readonly font: number;
}): ReactNode {
  const natural = text.length * font * LETTER;
  const stretch = natural <= width ? 100 : Math.max(NARROWEST, Math.floor((width / natural) * 100));

  return (
    <Box
      component="span"
      sx={{
        display: 'block',
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        ...(stretch < 100 ? { fontStretch: `${String(stretch)}%` } : {}),
      }}
    >
      {text}
    </Box>
  );
}
