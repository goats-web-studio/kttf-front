import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

/**
 * Плитка рисунка: ширина макета и шаг повтора по вертикали. Плитка стоит по
 * центру экрана — на телефоне видна её середина, на 1920 она во всю ширину.
 */
const TILE_W = 1920;
const TILE_H = 1200;

/** Стол сверху: 274 × 152,5 см в масштабе, центр и наклон. */
interface TableSpec {
  readonly cx: number;
  readonly cy: number;
  readonly angle: number;
}

/**
 * Три стола на плитку — справа, слева и по центру, на разной высоте: на
 * широком экране карточки закрывают середину и видны края, на телефоне
 * наоборот, и рисунок есть в обоих случаях. Мяч летит от стола к столу.
 */
const TABLES: readonly [TableSpec, TableSpec, TableSpec] = [
  { cx: 1600, cy: 200, angle: -9 },
  { cx: 300, cy: 600, angle: 9 },
  { cx: 1000, cy: 1000, angle: -9 },
];

/**
 * Рисунок под всей страницей: столы сверху с сеткой под фирменным наклоном
 * 9°, пунктир полёта мяча, красный мяч на столе, сетка точек «табло» и
 * тёплые пятна. Мотив собран в плитку и повторяется по высоте, поэтому и
 * короткий список, и страница клуба на семь экранов заполнены одинаково.
 *
 * Раньше страница была ровной тёплой подложкой, и на экранах с одним
 * списком — клубы, маркет — сайт выглядел пустым и дешёвым: много воздуха,
 * ничего своего. Фотографии на каждой странице — вес и шум; линейный
 * рисунок даёт тему без веса и без запроса.
 *
 * Линии не темнее границы поля ввода, точки и пятна ещё тише — с белыми
 * карточками рисунок не спорит, он живёт в промежутках между ними.
 *
 * Только декор: `aria-hidden`, не ловит нажатия.
 */
export default function SiteBackdrop(): ReactNode {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
        // Пятна повторяются с тем же шагом, что и рисунок, и перекрывают
        // друг друга: чистой подложки без тепла не остаётся.
        backgroundImage: [
          'radial-gradient(ellipse 900px 620px at 88% 12%, var(--red-50) 0, transparent 70%)',
          'radial-gradient(ellipse 820px 600px at 6% 50%, var(--gold-50) 0, transparent 70%)',
          'radial-gradient(ellipse 900px 620px at 60% 88%, var(--red-50) 0, transparent 70%)',
        ].join(', '),
        backgroundSize: `100% ${String(TILE_H)}px`,
        backgroundRepeat: 'repeat-y',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: '50%',
          width: TILE_W,
          ml: `${String(-TILE_W / 2)}px`,
          '& svg': { width: '100%', height: '100%', display: 'block' },
        }}
      >
        <svg>
          <defs>
            <pattern id="kttf-dots" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.2" fill="var(--ink-300)" />
            </pattern>
            <pattern
              id="kttf-backdrop"
              width={TILE_W}
              height={TILE_H}
              patternUnits="userSpaceOnUse"
            >
              {/* Сетка точек по всей плитке — фактура «табло», без смысла. */}
              <rect width={TILE_W} height={TILE_H} fill="url(#kttf-dots)" opacity="0.45" />

              {TABLES.map((table) => (
                <Table key={table.cx} {...table} />
              ))}
              <Flight from={TABLES[0]} to={TABLES[1]} />
              <Flight from={TABLES[1]} to={TABLES[2]} />
              {TABLES.map((table) => (
                <Ball key={table.cx} {...table} />
              ))}
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#kttf-backdrop)" />
        </svg>
      </Box>
    </Box>
  );
}

/** Стол линиями: кромка, средняя линия вдоль, сетка поперёк. */
function Table({ cx, cy, angle }: TableSpec): ReactNode {
  const w = 480;
  const h = 268;

  return (
    <g
      transform={`rotate(${String(angle)} ${String(cx)} ${String(cy)})`}
      fill="none"
      stroke="var(--line-strong)"
      strokeLinecap="round"
      opacity="0.85"
    >
      <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx="5" strokeWidth="2" />
      <line x1={cx - w / 2} y1={cy} x2={cx + w / 2} y2={cy} strokeWidth="1.25" />
      <line
        x1={cx}
        y1={cy - h / 2 - 18}
        x2={cx}
        y2={cy + h / 2 + 18}
        strokeWidth="4"
        stroke="var(--ink-300)"
      />
    </g>
  );
}

/** Мяч на столе: красный с бледным ореолом, чуть правее сетки. */
function Ball({ cx, cy }: TableSpec): ReactNode {
  return (
    <>
      <circle cx={cx + 90} cy={cy - 40} r="20" fill="var(--red-50)" />
      <circle cx={cx + 90} cy={cy - 40} r="9" fill="var(--red-500)" />
    </>
  );
}

/** Полёт мяча от стола к столу: пунктирная дуга и три следа, гаснущие к началу. */
function Flight({ from, to }: { readonly from: TableSpec; readonly to: TableSpec }): ReactNode {
  const x1 = from.cx + 90;
  const y1 = from.cy - 40;
  const x2 = to.cx + 90;
  const y2 = to.cy - 40;
  // Вершина дуги — между столами, выше прямой на пятую часть расстояния:
  // выше она выходила бы за край плитки и обрывалась на шве.
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 - Math.abs(x2 - x1) / 5;
  const at = (t: number): readonly [number, number] => [
    (1 - t) ** 2 * x1 + 2 * (1 - t) * t * mx + t ** 2 * x2,
    (1 - t) ** 2 * y1 + 2 * (1 - t) * t * my + t ** 2 * y2,
  ];
  const trail = [0.3, 0.5, 0.7].map(at);

  return (
    <>
      <path
        d={`M ${String(x1)} ${String(y1)} Q ${String(mx)} ${String(my)} ${String(x2)} ${String(y2)}`}
        fill="none"
        stroke="var(--red-200)"
        strokeWidth="2"
        strokeDasharray="2 10"
        strokeLinecap="round"
      />
      {trail.map(([x, y], index) => (
        <circle
          key={index}
          cx={x}
          cy={y}
          r={4 + index}
          fill={index === 0 ? 'var(--red-100)' : 'var(--red-200)'}
        />
      ))}
    </>
  );
}
