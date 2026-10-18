import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

interface SurfaceProps {
  /** Заголовок карточки; без него карточка — просто белая поверхность. */
  readonly title?: ReactNode;
  readonly subtitle?: ReactNode;
  /** Справа от заголовка: ссылка «Все», кнопка. */
  readonly action?: ReactNode;
  /**
   * Содержимое во всю ширину, без внутренних полей — для таблиц и списков,
   * у которых свои отступы в строках.
   */
  readonly flush?: boolean;
  readonly component?: 'section' | 'div' | 'article';
  readonly children: ReactNode;
}

/**
 * Карточка-поверхность «Спорт-модерн»: белая, скруглённая, с мягкой тенью
 * (стиль задаёт тема у `Paper variant="outlined"`). Один блок смысла — одна
 * карточка: таблица группы, лидеры, состав.
 */
export default function Surface({
  title,
  subtitle,
  action,
  flush = false,
  component = 'section',
  children,
}: SurfaceProps): ReactNode {
  const hasHeader = title !== undefined || action !== undefined;

  return (
    <Paper variant="outlined" component={component} sx={{ overflow: 'hidden' }}>
      {hasHeader && (
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            px: { xs: 2, sm: 3 },
            pt: { xs: 2, sm: 2.5 },
            pb: flush ? 1.5 : 0,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            {title !== undefined && (
              <Typography variant="h3" component="h2">
                {title}
              </Typography>
            )}
            {subtitle !== undefined && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {action}
        </Stack>
      )}
      {flush ? (
        children
      ) : (
        <Box
          sx={{ px: { xs: 2, sm: 3 }, pt: hasHeader ? 2 : { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 } }}
        >
          {children}
        </Box>
      )}
    </Paper>
  );
}
