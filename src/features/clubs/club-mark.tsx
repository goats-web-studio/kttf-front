import type { ClubView } from '@kttf/shared/types';
import Avatar from '@mui/material/Avatar';
import type { ReactNode } from 'react';

/**
 * Знак клуба: логотип, а без него — первая буква названия.
 *
 * Пустое место вместо логотипа ломает ряд в списке, а у большинства клубов
 * логотипа поначалу не будет: загрузки файлов для клуба ещё нет.
 */
export default function ClubMark({
  club,
  size,
}: {
  readonly club: Pick<ClubView, 'name' | 'logoUrl'>;
  readonly size: number;
}): ReactNode {
  return (
    <Avatar
      variant="rounded"
      src={club.logoUrl ?? undefined}
      alt=""
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '28%',
        // Знак без логотипа — буква в фирменном тоне: клубы различимы в
        // списке, а красного по-прежнему меньше, чем текста.
        bgcolor: 'var(--red-50)',
        color: 'var(--red-700)',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: Math.round(size * 0.42),
      }}
    >
      {club.name.trim().charAt(0).toUpperCase()}
    </Avatar>
  );
}
