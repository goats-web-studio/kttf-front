import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  readonly title: string;
  readonly text?: string;
  /** Что сделать дальше: сбросить фильтр, найти турнир. */
  readonly action?: ReactNode;
  /** Ошибка отличается композицией, а не только текстом (раздел 3.4). */
  readonly tone?: 'neutral' | 'error';
}

/**
 * Пустое место на экране — docs/07-design-system.md, раздел 7.
 *
 * Одна форма на «пусто» и «ничего не найдено»: различаются они текстом и
 * действием, а не видом. Ошибка — `Alert` с линейкой слева (тема, раздел
 * 3.4): красный в системе занят брендом, и одним цветом текста ошибку от
 * акцента не отличить.
 */
export default function EmptyState({
  title,
  text,
  action,
  tone = 'neutral',
}: EmptyStateProps): ReactNode {
  if (tone === 'error') {
    return (
      <Alert severity="error" icon={false} action={action} sx={{ alignItems: 'center', py: 2 }}>
        <Typography sx={{ fontWeight: 500 }}>{title}</Typography>
        {text !== undefined && <Typography color="text.secondary">{text}</Typography>}
      </Alert>
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        px: 3,
        py: 6,
        textAlign: 'center',
        borderStyle: 'dashed',
        borderColor: 'var(--line-strong)',
      }}
    >
      <Typography sx={{ fontWeight: 500 }}>{title}</Typography>
      {text !== undefined && (
        <Typography color="text.secondary" sx={{ mt: 1, mx: 'auto', maxWidth: 448 }}>
          {text}
        </Typography>
      )}
      {action !== undefined && (
        <Stack direction="row" spacing={1.5} sx={{ mt: 3, justifyContent: 'center' }}>
          {action}
        </Stack>
      )}
    </Paper>
  );
}
