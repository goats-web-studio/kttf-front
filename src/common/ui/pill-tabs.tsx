import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import type { ReactNode } from 'react';

import { useT, type MessageKey } from '@/common/i18n';

interface PillTabsProps<T extends string> {
  readonly value: T;
  readonly options: readonly (readonly [T, MessageKey])[];
  readonly label: string;
  readonly onChange: (next: T) => void;
}

/**
 * Переключатель-пилюля, как вкладки сайта: дорожка `--ink-100`, выбранное
 * белое с тенью (07, 5.2). Период в профиле, вид страницы турниров —
 * «Календарь / Список» (ADR-052).
 *
 * Не вкладки MUI: те листаются вбок, и на 360px первый период уезжал за
 * край. Здесь на телефоне периоды делят ширину поровну. По смыслу это
 * выбор одного из нескольких — радиогруппа, а не вкладки с панелями.
 */
export default function PillTabs<T extends string>({
  value,
  options,
  label,
  onChange,
}: PillTabsProps<T>): ReactNode {
  const t = useT();

  return (
    <Box
      role="radiogroup"
      aria-label={label}
      sx={{
        // На телефоне — равные колонки во всю ширину: четыре периода встают
        // в строку, а не переносятся овалом на две.
        display: { xs: 'grid', sm: 'inline-flex' },
        gridTemplateColumns: `repeat(${String(options.length)}, minmax(0, 1fr))`,
        gap: 0.5,
        p: 0.5,
        width: { xs: '100%', sm: 'auto' },
        borderRadius: 999,
        bgcolor: 'var(--ink-100)',
      }}
    >
      {options.map(([option, text]) => {
        const selected = option === value;

        return (
          <ButtonBase
            key={option}
            role="radio"
            aria-checked={selected}
            onClick={() => {
              onChange(option);
            }}
            sx={{
              minHeight: 36,
              px: { xs: 0.5, sm: 2 },
              borderRadius: 999,
              typography: 'body2',
              fontSize: { xs: 13, sm: 14 },
              fontWeight: 600,
              whiteSpace: 'nowrap',
              color: selected ? 'text.primary' : 'text.secondary',
              bgcolor: selected ? 'background.paper' : 'transparent',
              boxShadow: selected ? 'var(--shadow-card)' : 'none',
              transition:
                'background-color var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease)',
              '@media (hover: hover)': {
                '&:hover': { color: 'text.primary' },
              },
              '&.Mui-focusVisible': { outline: '2px solid var(--red-600)', outlineOffset: '2px' },
            }}
          >
            {t(text)}
          </ButtonBase>
        );
      })}
    </Box>
  );
}
