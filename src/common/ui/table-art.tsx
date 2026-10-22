import type { ReactNode } from 'react';

/**
 * Стол сверху линиями — фирменный рисунок сайта: 274 × 152,5 см, сетка
 * поперёк, средняя линия вдоль, всё под наклоном 9°, и красный мяч.
 * Цвета — из токенов, чтобы один рисунок жил и на тёплой подложке, и на
 * красноватой обложке клуба без фото.
 *
 * Только декор: родитель прячет его от читалки экрана.
 */
export default function TableArt({
  line = 'var(--line-strong)',
  net = 'var(--ink-300)',
}: {
  readonly line?: string;
  readonly net?: string;
}): ReactNode {
  return (
    <svg viewBox="0 0 300 220" aria-hidden focusable="false">
      <g transform="rotate(-9 150 110)" fill="none" stroke={line} strokeLinecap="round">
        <rect x="20" y="40" width="260" height="145" rx="4" strokeWidth="2" />
        <line x1="20" y1="112" x2="280" y2="112" strokeWidth="1.25" />
        <line x1="150" y1="28" x2="150" y2="197" strokeWidth="4" stroke={net} />
      </g>
      <circle cx="96" cy="72" r="16" fill="var(--red-50)" />
      <circle cx="96" cy="72" r="7" fill="var(--red-500)" />
    </svg>
  );
}
