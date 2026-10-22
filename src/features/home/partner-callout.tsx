import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { formatCount, useLocale, useT, type MessageKey } from '@/common/i18n';
import TableArt from '@/common/ui/table-art';

export interface PartnerPoint {
  readonly key: string;
  readonly icon: LucideIcon;
}

interface PartnerCalloutProps {
  /** Префикс текстов: `<prefix>.eyebrow`, `.title`, `.lead`, `.points.<key>.*`, `.steps.N.*`. */
  readonly prefix: 'home.clubs' | 'home.coachCta';
  readonly points: readonly PartnerPoint[];
  /** Шагов подключения — от одного до четырёх, тексты `.steps.1` … `.steps.N`. */
  readonly steps: number;
  readonly action: { readonly href: string; readonly label: MessageKey };
  readonly more: { readonly href: string; readonly label: MessageKey };
}

/**
 * Блок для тех, кто приходит на сайт работать, а не играть: клубы и тренеры.
 *
 * Что даём — плитками, по одной на возможность, и только то, что уже
 * работает: тарифы, продвижение и уведомления на телефон сюда не попадают,
 * пока их нет (обещание в рекламе, которое не сбылось, хуже молчания).
 * Ниже — как подключиться за четыре шага, чтобы «напишите нам» не было
 * прыжком в неизвестность. Кнопка обведённая: залитая на главной одна —
 * поиск игрока (запрет №2).
 */
export default function PartnerCallout({
  prefix,
  points,
  steps,
  action,
  more,
}: PartnerCalloutProps): ReactNode {
  const t = useT();
  const locale = useLocale();
  const key = (rest: string): MessageKey => `${prefix}.${rest}` as MessageKey;

  return (
    <Paper
      component="section"
      variant="outlined"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        p: { xs: 3, sm: 5 },
        backgroundImage:
          'radial-gradient(ellipse 50% 60% at 100% 0%, var(--red-50) 0, transparent 70%)',
      }}
    >
      <Box
        aria-hidden
        sx={{
          display: { xs: 'none', md: 'block' },
          position: 'absolute',
          right: -36,
          top: -28,
          width: 260,
          opacity: 0.8,
          pointerEvents: 'none',
          '& svg': { display: 'block', width: '100%', height: 'auto' },
        }}
      >
        <TableArt />
      </Box>

      <Box sx={{ position: 'relative', maxWidth: 680 }}>
        <Typography
          sx={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--red-600)',
          }}
        >
          {t(key('eyebrow'))}
        </Typography>
        <Typography variant="h2" sx={{ mt: 1, fontSize: { xs: 24, sm: 28 }, lineHeight: 1.2 }}>
          {t(key('title'))}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1.5, fontSize: 17 }}>
          {t(key('lead'))}
        </Typography>
      </Box>

      <Box
        component="ul"
        sx={{
          position: 'relative',
          mt: { xs: 3, sm: 4 },
          mb: 0,
          p: 0,
          listStyle: 'none',
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
        }}
      >
        {points.map(({ key: point, icon: Icon }) => (
          <Box
            component="li"
            key={point}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 3,
              bgcolor: 'var(--paper-sunken)',
              display: { xs: 'flex', sm: 'block' },
              gap: 2,
              alignItems: 'flex-start',
            }}
          >
            <Box
              aria-hidden
              sx={{
                width: 40,
                height: 40,
                flexShrink: 0,
                borderRadius: 3,
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'var(--paper)',
                color: 'var(--red-600)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <Icon size={20} strokeWidth={2} />
            </Box>
            <Box>
              <Typography variant="h3" sx={{ mt: { xs: 0, sm: 1.5 } }}>
                {t(key(`points.${point}.title`))}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {t(key(`points.${point}.text`))}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      <Typography variant="h3" component="h3" sx={{ position: 'relative', mt: { xs: 4, sm: 5 } }}>
        {t(key('steps.title'))}
      </Typography>
      <Box
        component="ol"
        sx={{
          position: 'relative',
          mt: 2,
          mb: 0,
          p: 0,
          listStyle: 'none',
          display: 'grid',
          gap: { xs: 2, md: 3 },
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: `repeat(${String(steps)}, 1fr)` },
        }}
      >
        {Array.from({ length: steps }, (_, index) => index + 1).map((step) => (
          <Box component="li" key={step} sx={{ display: 'flex', gap: 1.5 }}>
            <Box
              aria-hidden
              sx={{
                width: 32,
                height: 32,
                flexShrink: 0,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'var(--red-50)',
                color: 'var(--red-700)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              {formatCount(step, locale)}
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 600 }}>
                {t(key(`steps.${String(step)}.title`))}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {t(key(`steps.${String(step)}.text`))}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 1, sm: 3 }}
        sx={{ position: 'relative', mt: { xs: 3, sm: 4 }, alignItems: { sm: 'center' } }}
      >
        <Button href={action.href} size="large" sx={{ minHeight: 48, px: 3 }}>
          {t(action.label)}
        </Button>
        <Link
          href={more.href}
          underline="none"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            minHeight: 44,
            fontWeight: 600,
            color: 'text.secondary',
            '&:hover': { color: 'var(--red-600)' },
          }}
        >
          {t(more.label)}
          <ArrowRight size={16} aria-hidden />
        </Link>
      </Stack>
    </Paper>
  );
}
