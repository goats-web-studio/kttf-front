import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { formatCount, useLocale, useT, type MessageKey } from '@/common/i18n';
import { Reveal } from '@/common/ui/motion';

export interface PartnerPoint {
  readonly key: string;
  readonly icon: LucideIcon;
}

interface PartnerCalloutProps {
  /** Префикс текстов: `<prefix>.title`, `.lead`, `.points.<key>.*`, `.steps.N.*`. */
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
 * Что даём — списком, по одной строке на возможность, и только то, что уже
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
    <Reveal>
      <Paper component="section" variant="outlined" sx={{ p: { xs: 3, sm: 5 } }}>
        <Box sx={{ maxWidth: 680 }}>
          <Typography variant="h2" sx={{ fontSize: { xs: 24, sm: 28 }, lineHeight: 1.2 }}>
            {t(key('title'))}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1.5, fontSize: 17 }}>
            {t(key('lead'))}
          </Typography>
        </Box>

        <Box
          component="ul"
          sx={{
            mt: { xs: 3, sm: 4 },
            mb: 0,
            p: 0,
            listStyle: 'none',
            display: 'grid',
            columnGap: 4,
            rowGap: { xs: 2, sm: 2.5 },
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          }}
        >
          {points.map(({ key: point, icon: Icon }) => (
            <Box component="li" key={point} sx={{ display: 'flex', gap: 1.5 }}>
              <Box
                aria-hidden
                sx={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: 26,
                  color: 'var(--ink-500)',
                }}
              >
                <Icon size={20} strokeWidth={2} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h3">{t(key(`points.${point}.title`))}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                  {t(key(`points.${point}.text`))}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>

        <Typography variant="h3" component="h3" sx={{ mt: { xs: 4, sm: 5 } }}>
          {t(key('steps.title'))}
        </Typography>
        <Box
          component="ol"
          sx={{
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
                  fontWeight: 700,
                  fontSize: 15,
                  fontVariantNumeric: 'tabular-nums',
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
          sx={{ mt: { xs: 3, sm: 4 }, alignItems: { sm: 'center' } }}
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
              minHeight: 44,
              fontWeight: 600,
              color: 'text.secondary',
              '&:hover': { color: 'var(--red-600)' },
            }}
          >
            {t(more.label)}
          </Link>
        </Stack>
      </Paper>
    </Reveal>
  );
}
