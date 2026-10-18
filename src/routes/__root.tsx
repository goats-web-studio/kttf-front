import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import {
  createRootRouteWithContext,
  type ErrorComponentProps,
  Outlet,
} from '@tanstack/react-router';
import type { ReactNode } from 'react';

import type { RouterContext } from '@/app/router-context';
import { useT } from '@/common/i18n';
import ThemeRoot from '@/common/ui/theme';

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
  errorComponent: UnexpectedError,
});

/**
 * Корень намеренно пустой.
 *
 * Оболочки у разделов разные и несводимые: публичная часть с шапкой, кабинет,
 * консоль во весь экран планшета и экран зала без единого элемента управления.
 * Общая обёртка здесь означала бы, что зависимости публичной части попадают
 * в чанки консоли, а это прямо запрещено ADR-004.
 */
function RootLayout(): ReactNode {
  return <Outlet />;
}

/** Страница-исключение: по центру, с одним действием. */
const EXCEPTION = { py: { xs: 8, sm: 12 }, textAlign: 'center' } as const;

/**
 * «Не найдено» и «ошибка» стоят в корне, вне оболочек разделов, и тему
 * берут сами: иначе MUI отрисовал бы их своей синей темой по умолчанию.
 */
function NotFound(): ReactNode {
  const t = useT();

  return (
    <ThemeRoot>
      <Container maxWidth="lg" component="section" sx={EXCEPTION}>
        <Typography variant="h1">{t('error.notFound.title')}</Typography>
        <Button variant="contained" href="/" sx={{ mt: 3 }}>
          {t('error.notFound.action')}
        </Button>
      </Container>
    </ThemeRoot>
  );
}

function UnexpectedError({ reset }: ErrorComponentProps): ReactNode {
  const t = useT();

  return (
    <ThemeRoot>
      <Container maxWidth="lg" component="section" sx={EXCEPTION}>
        <Typography variant="h1">{t('error.unexpected.title')}</Typography>
        <Button variant="contained" onClick={reset} sx={{ mt: 3 }}>
          {t('error.unexpected.action')}
        </Button>
      </Container>
    </ThemeRoot>
  );
}
