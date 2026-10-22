import Link from '@mui/material/Link';
import type { ReactNode } from 'react';

interface PlayerLinkProps {
  readonly id: string;
  readonly children: ReactNode;
}

/**
 * Имя игрока — ссылкой на его профиль.
 *
 * Цвет и насыщенность берутся у строки: в таблице имя не должно выглядеть
 * чужеродной синей ссылкой, а у победителя в сетке остаётся полужирным.
 * Подчёркивание — при наведении, чтобы было видно, что имя нажимается.
 */
export default function PlayerLink({ id, children }: PlayerLinkProps): ReactNode {
  return (
    <Link href={`/players/${id}`} color="inherit" underline="hover" sx={{ fontWeight: 'inherit' }}>
      {children}
    </Link>
  );
}
