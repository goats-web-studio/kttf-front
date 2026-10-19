import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

/** Список товаров одной страницы маркета. 24 делится на две, три и четыре колонки. */
export const CATALOG_PAGE_SIZE = 24;

/** Раздел страницы маркета: заголовок, ссылка «Все» справа, содержимое. */
export default function MarketSection({
  title,
  more,
  children,
}: {
  readonly title: string;
  readonly more?: { readonly href: string; readonly label: string };
  readonly children: ReactNode;
}): ReactNode {
  return (
    <Box component="section" sx={{ mt: { xs: 4, sm: 6 } }}>
      <Stack
        direction="row"
        useFlexGap
        spacing={2}
        sx={{ alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', mb: 2 }}
      >
        <Typography variant="h2">{title}</Typography>
        {more !== undefined && (
          <Link href={more.href} variant="body2" sx={{ py: 1.5 }}>
            {more.label}
          </Link>
        )}
      </Stack>
      {children}
    </Box>
  );
}
