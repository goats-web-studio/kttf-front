import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import type { ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';

/**
 * Счёт встречи по сетам глазами игрока профиля.
 *
 * Победа — `--red-600` полужирным, поражение приглушено (07, 3.4). Цвет не
 * единственный носитель: исход ещё и словом для чтеца экрана.
 */
export function Score({
  setsFor,
  setsAgainst,
  won,
}: {
  readonly setsFor: number;
  readonly setsAgainst: number;
  readonly won: boolean;
}): ReactNode {
  const t = useT();
  const score = `${String(setsFor)}:${String(setsAgainst)}`;

  return (
    <Box
      component="span"
      aria-label={`${t(won ? 'player.matches.won' : 'player.matches.lost')} ${score}`}
      sx={{
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        fontWeight: won ? 700 : 400,
        color: won ? 'var(--red-600)' : 'text.secondary',
      }}
    >
      {score}
    </Box>
  );
}

/** Длительность встречи. Неизвестная — прочерк: ноль бы врал. */
export function Minutes({
  value,
  withUnit = false,
}: {
  readonly value: number | null;
  /** «22 мин» в карточке; в колонке с заголовком «Мин» — просто число. */
  readonly withUnit?: boolean;
}): ReactNode {
  const t = useT();

  if (value === null) {
    return '—';
  }

  return withUnit ? fill(t('profile.minutes'), { count: String(value) }) : String(value);
}

/** Соперник — кнопкой: касание открывает личный счёт (ТЗ 9.3). */
export function OpponentButton({
  name,
  onClick,
}: {
  readonly name: string;
  readonly onClick: () => void;
}): ReactNode {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        font: 'inherit',
        fontWeight: 600,
        textAlign: 'left',
        borderRadius: 1,
        '@media (hover: hover)': { '&:hover': { color: 'primary.main' } },
        '&.Mui-focusVisible': { outline: '2px solid var(--red-600)', outlineOffset: '2px' },
      }}
    >
      {name}
    </ButtonBase>
  );
}
