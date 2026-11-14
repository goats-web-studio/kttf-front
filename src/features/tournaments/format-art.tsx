import Box from '@mui/material/Box';
import { useId, type ReactNode } from 'react';

import type { FormatType } from './format-draft';

/**
 * Схема проведения картинкой — для выбора схемы и её объяснения.
 *
 * Не точная сетка, а узнаваемый силуэт: круговая — таблица «каждый с
 * каждым», олимпийская — дерево к финалу, группы — коробки, из которых
 * стрелки ведут в сетку или в финальные группы. Цвета — токены: линии
 * `--ink-400`, путь победителя — `--red-600`, сыгранные клетки — `--ok`.
 */
export default function FormatArt({
  type,
  height = 72,
}: {
  readonly type: FormatType;
  readonly height?: number;
}): ReactNode {
  return (
    <Box
      component="svg"
      viewBox="0 0 120 72"
      aria-hidden
      sx={{ display: 'block', height, width: 'auto', maxWidth: '100%', overflow: 'visible' }}
    >
      {ART[type]}
    </Box>
  );
}

const LINE = { stroke: 'var(--ink-400)', strokeWidth: 1.5, fill: 'none' } as const;
const WIN = { stroke: 'var(--red-600)', strokeWidth: 2, fill: 'none' } as const;
const BOX = { stroke: 'var(--ink-400)', strokeWidth: 1.5, fill: 'var(--paper)', rx: 3 } as const;
const LABEL = {
  fill: 'var(--ink-700)',
  fontSize: 9,
  fontWeight: 600,
  textAnchor: 'middle',
} as const;

/** Таблица 5×5: диагональ серая, сыгранные встречи — зелёные и пустые клетки. */
function RoundRobinArt(): ReactNode {
  const size = 12;
  const left = 30;
  const top = 6;
  const cells: ReactNode[] = [];

  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      const x = left + col * size;
      const y = top + row * size;
      const self = row === col;
      const won = !self && (row + col * 2) % 3 !== 0;

      cells.push(
        <rect
          key={`${String(row)}-${String(col)}`}
          x={x}
          y={y}
          width={size}
          height={size}
          stroke="var(--ink-400)"
          strokeWidth={1}
          fill={self ? 'var(--ink-300)' : 'var(--paper)'}
        />,
      );
      if (!self) {
        cells.push(
          <circle
            key={`d-${String(row)}-${String(col)}`}
            cx={x + size / 2}
            cy={y + size / 2}
            r={2.6}
            fill={won ? 'var(--ok)' : 'none'}
            stroke={won ? 'none' : 'var(--red-500)'}
            strokeWidth={1.2}
          />,
        );
      }
    }
  }

  return <g>{cells}</g>;
}

/** Дерево на 8: четвертьфиналы → полуфиналы → финал, путь победителя красным. */
function KnockoutArt(): ReactNode {
  const ys = [6, 14, 22, 30, 42, 50, 58, 66];

  return (
    <g>
      {ys.map((y) => (
        <line key={y} x1={8} y1={y} x2={30} y2={y} {...LINE} />
      ))}
      {[0, 2, 4, 6].map((i) => {
        const a = ys[i] ?? 0;
        const b = ys[i + 1] ?? 0;
        const mid = (a + b) / 2;
        return (
          <path
            key={i}
            d={`M30 ${String(a)} V${String(b)} M30 ${String(mid)} H56`}
            {...(i === 0 ? WIN : LINE)}
          />
        );
      })}
      <path d="M56 10 V26 M56 18 H82" {...WIN} />
      <path d="M56 46 V62 M56 54 H82" {...LINE} />
      <path d="M82 18 V54 M82 36 H104" {...WIN} />
      <circle cx={108} cy={36} r={4} fill="var(--red-600)" />
    </g>
  );
}

/** Три группы слева; из каждой стрелка — в маленькую сетку справа. */
function GroupsArt({ finals }: { readonly finals: boolean }): ReactNode {
  const groups = [4, 28, 52];
  // Своя стрелка у каждой картинки: на странице их несколько, а id общий.
  const arrow = useId();

  return (
    <g>
      {groups.map((y) => (
        <g key={y}>
          <rect x={4} y={y} width={34} height={16} {...BOX} />
          <line x1={10} y1={y + 6} x2={32} y2={y + 6} stroke="var(--ink-300)" strokeWidth={1} />
          <line x1={10} y1={y + 11} x2={26} y2={y + 11} stroke="var(--ink-300)" strokeWidth={1} />
          <path d={`M40 ${String(y + 8)} H52`} {...LINE} markerEnd={`url(#${arrow})`} />
        </g>
      ))}
      <defs>
        <marker
          id={arrow}
          viewBox="0 0 6 6"
          refX="5"
          refY="3"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
        >
          <path d="M0 0 L6 3 L0 6 Z" fill="var(--ink-400)" />
        </marker>
      </defs>
      {finals ? (
        <g>
          <rect x={58} y={8} width={52} height={24} {...BOX} stroke="var(--red-600)" />
          <text x={84} y={23} {...LABEL}>
            1–4
          </text>
          <rect x={58} y={40} width={52} height={24} {...BOX} />
          <text x={84} y={55} {...LABEL}>
            5–8
          </text>
        </g>
      ) : (
        <g>
          {[14, 26, 46, 58].map((y) => (
            <line key={y} x1={58} y1={y} x2={74} y2={y} {...LINE} />
          ))}
          <path d="M74 14 V26 M74 20 H90" {...WIN} />
          <path d="M74 46 V58 M74 52 H90" {...LINE} />
          <path d="M90 20 V52 M90 36 H104" {...WIN} />
          <circle cx={108} cy={36} r={4} fill="var(--red-600)" />
        </g>
      )}
    </g>
  );
}

const ART: Readonly<Record<FormatType, ReactNode>> = {
  ROUND_ROBIN: <RoundRobinArt />,
  KNOCKOUT: <KnockoutArt />,
  GROUPS_KNOCKOUT: <GroupsArt finals={false} />,
  GROUPS_FINAL_GROUPS: <GroupsArt finals />,
};
