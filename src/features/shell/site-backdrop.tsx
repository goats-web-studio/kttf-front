import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

/** Высота рисунка у верхнего и нижнего края. К середине он растворяется. */
const HEIGHT = { xs: 240, md: 420 } as const;

/**
 * Рисунок под страницей: стол сверху с сеткой под фирменным наклоном 9°,
 * пунктир полёта мяча и красный мяч на столе — у верхнего края справа и у
 * нижнего слева, тёплые пятна по углам между ними.
 *
 * Раньше страница была ровной тёплой подложкой, и на экранах с одним
 * списком — клубы, маркет — сайт выглядел пустым. Фотографии на каждой
 * странице — вес и шум; линейный рисунок даёт тему без веса и без запроса.
 * Рисунок только у верха обрывался на первом же экране, и дальше страница
 * снова была пустой — теперь он держит её целиком, сверху донизу.
 *
 * Оба рисунка гаснут маской к середине: линия под строкой таблицы мешает
 * читать. Линии светлее границы поля ввода — с карточками не спорят.
 *
 * Только декор: `aria-hidden`, не ловит нажатия. На телефоне виден край —
 * стол и мяч.
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
        // Пятна в пикселях, а не в долях: на длинной странице доля высоты
        // превращала бы пятно в заливку на пол-экрана.
        backgroundImage: [
          'radial-gradient(ellipse 560px 420px at 88% 0%, var(--red-50) 0, transparent 70%)',
          'radial-gradient(ellipse 480px 360px at 6% 0%, var(--gold-50) 0, transparent 70%)',
          'radial-gradient(ellipse 560px 420px at 10% 100%, var(--red-50) 0, transparent 70%)',
          'radial-gradient(ellipse 480px 360px at 94% 100%, var(--gold-50) 0, transparent 70%)',
        ].join(', '),
        '& svg': { width: '100%', height: '100%', display: 'block' },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          insetInline: 0,
          top: 0,
          height: HEIGHT,
          maskImage: 'linear-gradient(to bottom, #000 30%, transparent 92%)',
        }}
      >
        <svg viewBox="0 0 1440 420" preserveAspectRatio="xMaxYMin slice">
          <defs>
            <pattern id="kttf-dots" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.2" fill="var(--ink-300)" />
            </pattern>
            <linearGradient id="kttf-dots-fade" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
              <stop offset="0.7" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <mask id="kttf-dots-mask">
              <rect width="480" height="300" fill="url(#kttf-dots-fade)" />
            </mask>
            <linearGradient id="kttf-dots-fade-end" x1="1" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
              <stop offset="0.7" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <mask id="kttf-dots-mask-end">
              <rect x="960" y="120" width="480" height="300" fill="url(#kttf-dots-fade-end)" />
            </mask>
          </defs>

          {/* Сетка точек в левом верхнем углу — фактура «табло», без смысла. */}
          <rect
            width="480"
            height="300"
            fill="url(#kttf-dots)"
            mask="url(#kttf-dots-mask)"
            opacity="0.5"
          />

          {/* Стол сверху: 274 × 152,5 см, сетка поперёк, средняя линия вдоль. */}
          <g
            transform="rotate(-9 1330 150)"
            fill="none"
            stroke="var(--line-strong)"
            strokeLinecap="round"
            opacity="0.7"
          >
            <rect x="1120" y="34" width="420" height="234" rx="5" strokeWidth="2" />
            <line x1="1120" y1="151" x2="1540" y2="151" strokeWidth="1.25" />
            <line x1="1330" y1="18" x2="1330" y2="284" strokeWidth="4" stroke="var(--ink-300)" />
          </g>

          {/* Полёт мяча: пунктир через сетку, следы мяча гаснут к началу. */}
          <path
            d="M 660 236 Q 980 -40 1250 118"
            fill="none"
            stroke="var(--red-200)"
            strokeWidth="2"
            strokeDasharray="2 10"
            strokeLinecap="round"
          />
          <circle cx="820" cy="118" r="4" fill="var(--red-100)" />
          <circle cx="960" cy="70" r="5" fill="var(--red-200)" opacity="0.8" />
          <circle cx="1100" cy="66" r="6" fill="var(--red-200)" />
          <circle cx="1250" cy="118" r="20" fill="var(--red-50)" />
          <circle cx="1250" cy="118" r="9" fill="var(--red-500)" />
        </svg>
      </Box>

      {/* У нижнего края — тот же мотив зеркально: стол слева, мяч летит к
          нему справа, точки в правом углу. Страница заканчивается рисунком,
          а не обрывом подложки перед подвалом. */}
      <Box
        sx={{
          position: 'absolute',
          insetInline: 0,
          bottom: 0,
          height: HEIGHT,
          maskImage: 'linear-gradient(to top, #000 30%, transparent 92%)',
        }}
      >
        <svg viewBox="0 0 1440 420" preserveAspectRatio="xMinYMax slice">
          <rect
            x="960"
            y="120"
            width="480"
            height="300"
            fill="url(#kttf-dots)"
            mask="url(#kttf-dots-mask-end)"
            opacity="0.5"
          />
          <g
            transform="rotate(9 110 270)"
            fill="none"
            stroke="var(--line-strong)"
            strokeLinecap="round"
            opacity="0.7"
          >
            <rect x="-100" y="152" width="420" height="234" rx="5" strokeWidth="2" />
            <line x1="-100" y1="269" x2="320" y2="269" strokeWidth="1.25" />
            <line x1="110" y1="136" x2="110" y2="402" strokeWidth="4" stroke="var(--ink-300)" />
          </g>
          <path
            d="M 780 184 Q 460 460 190 302"
            fill="none"
            stroke="var(--red-200)"
            strokeWidth="2"
            strokeDasharray="2 10"
            strokeLinecap="round"
          />
          <circle cx="620" cy="302" r="4" fill="var(--red-100)" />
          <circle cx="480" cy="350" r="5" fill="var(--red-200)" opacity="0.8" />
          <circle cx="340" cy="354" r="6" fill="var(--red-200)" />
          <circle cx="190" cy="302" r="20" fill="var(--red-50)" />
          <circle cx="190" cy="302" r="9" fill="var(--red-500)" />
        </svg>
      </Box>
    </Box>
  );
}
