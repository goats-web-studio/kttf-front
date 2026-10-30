import Box from '@mui/material/Box';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import { STAGE_HEIGHT, STAGE_WIDTH } from './scale';

/**
 * Сцена стены 1920×1080, вписанная в родителя целиком — ADR-082.
 *
 * Масштаб один по обеим осям: у ТВ с другим соотношением сторон остаются
 * поля, но ничего не срезается и не растягивается. Родитель задаёт размер:
 * на стене — окно целиком, в консоли — карточка предпросмотра.
 */
export default function Stage({ children }: { readonly children: ReactNode }): ReactNode {
  const frame = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: STAGE_WIDTH, height: STAGE_HEIGHT });

  useLayoutEffect(() => {
    const element = frame.current;

    if (element === null) {
      return;
    }

    const measure = (): void => {
      // В тестовом окружении у элемента нет размеров — сцена остаётся 1:1.
      if (element.clientWidth > 0 && element.clientHeight > 0) {
        setBox({ width: element.clientWidth, height: element.clientHeight });
      }
    };

    measure();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  const scale = Math.min(box.width / STAGE_WIDTH, box.height / STAGE_HEIGHT);
  const left = (box.width - STAGE_WIDTH * scale) / 2;
  const top = (box.height - STAGE_HEIGHT * scale) / 2;

  return (
    <Box
      ref={frame}
      sx={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}
    >
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: STAGE_WIDTH,
          height: STAGE_HEIGHT,
          transformOrigin: '0 0',
        }}
        style={{
          transform: `translate(${String(left)}px, ${String(top)}px) scale(${String(scale)})`,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
