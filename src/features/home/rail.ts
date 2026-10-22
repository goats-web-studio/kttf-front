/**
 * Ряд карточек главной: на телефоне — лента с горизонтальной прокруткой и
 * доводкой к карточке, с краешком следующей справа, чтобы было видно, что
 * ряд листается; шире — сетка в `columns` колонок.
 *
 * Шесть клубов столбиком на телефоне — три экрана до лидеров рейтинга.
 */
export function railSx(columns: { readonly sm: number; readonly md: number }) {
  return {
    listStyle: 'none',
    m: 0,
    p: 0,
    display: 'grid',
    gap: 2,
    gridAutoFlow: { xs: 'column', sm: 'row' },
    gridAutoColumns: { xs: '82%', sm: 'auto' },
    gridTemplateColumns: {
      xs: 'none',
      sm: `repeat(${String(columns.sm)}, minmax(0, 1fr))`,
      md: `repeat(${String(columns.md)}, minmax(0, 1fr))`,
    },
    overflowX: { xs: 'auto', sm: 'visible' },
    scrollSnapType: { xs: 'x mandatory', sm: 'none' },
    // Лента до краёв экрана, а не до полей контейнера; тень карточки не
    // обрезается сверху и снизу.
    mx: { xs: -2, sm: 0 },
    px: { xs: 2, sm: 0 },
    py: { xs: 0.5, sm: 0 },
    scrollbarWidth: 'none',
    '& > li': { scrollSnapAlign: 'start', minWidth: 0 },
  } as const;
}
