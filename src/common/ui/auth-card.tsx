import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

/**
 * Карточка входа и регистрации: знак, заголовок, форма — по центру экрана.
 * Форма в карточке читается как отдельное действие, а не как продолжение
 * страницы с пустотой справа.
 */
export default function AuthCard({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}): ReactNode {
  const t = useT();

  return (
    <Container
      component="section"
      sx={{ maxWidth: 480, py: { xs: 4, sm: 8 }, px: { xs: 2, sm: 3 } }}
      maxWidth={false}
    >
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 3, sm: 5 },
          backgroundImage: 'radial-gradient(circle at 100% 0%, var(--red-50) 0, transparent 40%)',
        }}
      >
        <Box
          component="img"
          src="/logo-wordmark.png"
          alt={t('app.logo')}
          sx={{ height: 22, width: 'auto', display: 'block' }}
        />
        <Typography
          variant="h1"
          sx={{
            mt: 3,
            mb: 3,
            fontSize: { xs: 30, sm: 34 },
            lineHeight: { xs: '34px', sm: '38px' },
          }}
        >
          {title}
        </Typography>
        {children}
      </Paper>
    </Container>
  );
}
